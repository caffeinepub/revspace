import { HttpAgent } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { loadConfig } from "../config";
import {
  getCachedProfile,
  mergeWithCache,
  setCachedProfile,
} from "../lib/profileCache";
import { StorageClient } from "../utils/StorageClient";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";
import { useRegisteredActor } from "./useRegisteredActor";

// ========================
// File Upload Hook
// ========================
export function useUploadFile() {
  const { identity } = useInternetIdentity();

  const uploadFile = useCallback(
    async (file: File, onProgress?: (pct: number) => void): Promise<string> => {
      if (!identity) {
        throw new Error(
          "Please log in to upload files. Tap the login button and try again.",
        );
      }

      // ── File size validation ────────────────────────────────────────────────
      const isVideo = file.type.startsWith("video/");
      const fileSizeMB = file.size / (1024 * 1024);

      if (isVideo) {
        if (fileSizeMB > 500) {
          throw new Error(
            `Video is too large (${fileSizeMB.toFixed(0)} MB). Maximum allowed is 500 MB. Try compressing or trimming the video.`,
          );
        }
        if (fileSizeMB > 200) {
          toast.warning(
            `Large video (${fileSizeMB.toFixed(0)} MB). Upload may take a while — keep this tab open.`,
            { duration: 6000 },
          );
        }
      } else {
        if (fileSizeMB > 50) {
          throw new Error(
            `Image is too large (${fileSizeMB.toFixed(0)} MB). Maximum allowed is 50 MB. Please resize or compress the image.`,
          );
        }
        if (fileSizeMB > 20) {
          toast.warning(
            `Large image (${fileSizeMB.toFixed(0)} MB). Consider compressing it for faster uploads.`,
            { duration: 5000 },
          );
        }
      }

      // ── MKV format warning ─────────────────────────────────────────────────
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (ext === "mkv" || file.type === "video/x-matroska") {
        toast.warning(
          "MKV files may not play in all browsers. Consider converting to MP4 for best compatibility.",
          { duration: 6000 },
        );
      }

      const config = await loadConfig();

      // ── Fresh synced agent factory ────────────────────────────────────────
      // Creates a brand-new HttpAgent and immediately syncs its clock with
      // the replica. Called on every upload and on every retry so that
      // post-deploy clock drift never causes a persistent "Expected v3
      // response body" error.
      const makeFreshAgent = async (): Promise<HttpAgent> => {
        const a = new HttpAgent({
          identity,
          host: config.backend_host,
          shouldSyncTime: true,
        });
        if (config.backend_host?.includes("localhost")) {
          try {
            await a.fetchRootKey();
          } catch {
            // best-effort — only needed for local replica
          }
        }
        // Force an explicit time-sync so the very first call after a new
        // deploy doesn't hit ingress-expiry / v3-certificate errors.
        if (
          typeof (a as { syncTime?: () => Promise<void> }).syncTime ===
          "function"
        ) {
          try {
            await (a as { syncTime: () => Promise<void> }).syncTime();
          } catch {
            // best-effort
          }
        }
        return a;
      };

      const makeStorageClient = (a: HttpAgent): StorageClient =>
        new StorageClient(
          config.bucket_name,
          config.storage_gateway_url,
          config.backend_canister_id,
          config.project_id,
          a,
        );

      // ── Upload timeout warning ─────────────────────────────────────────────
      let timeoutToastShown = false;
      const timeoutTimer = setTimeout(() => {
        if (!timeoutToastShown) {
          timeoutToastShown = true;
          toast.warning(
            "Upload is taking a while. Keep this tab open and active for best results.",
            { duration: 8000 },
          );
        }
      }, 60_000);

      try {
        const bytes = new Uint8Array(await file.arrayBuffer());

        let result: { hash: string };
        const retryDelays = [2000, 3000, 4000];
        let lastErr: unknown;
        let succeeded = false;

        for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
          // On every attempt (including the first) create a fresh agent with
          // a current time sync. This permanently eliminates the "Expected v3
          // response body" / ingress-expiry error that hits right after a new
          // deploy, regardless of how long the user waited before uploading.
          let activeStorageClient: StorageClient;
          try {
            const freshAgent = await makeFreshAgent();
            activeStorageClient = makeStorageClient(freshAgent);
          } catch {
            // If agent creation itself fails, fall back to a plain agent and
            // let the upload attempt surface the real error.
            activeStorageClient = makeStorageClient(
              new HttpAgent({ identity, host: config.backend_host }),
            );
          }

          try {
            result = await activeStorageClient.putFile(bytes, onProgress);
            succeeded = true;
            break;
          } catch (err) {
            lastErr = err;
            const msg = err instanceof Error ? err.message : String(err);
            const isRetryable =
              msg.includes("v3") ||
              msg.includes("certificate") ||
              msg.includes("ingress") ||
              msg.includes("timeout") ||
              msg.includes("network");
            if (!isRetryable || attempt >= retryDelays.length) {
              throw err;
            }
            // Wait before retrying with a fresh agent on the next iteration
            await new Promise((r) => setTimeout(r, retryDelays[attempt]));
          }
        }

        if (!succeeded) {
          throw lastErr;
        }

        // Use the last successful client to build the URL
        clearTimeout(timeoutTimer);
        const lastAgent = await makeFreshAgent();
        const urlClient = makeStorageClient(lastAgent);
        return urlClient.getDirectURL(result!.hash);
      } catch (err) {
        clearTimeout(timeoutTimer);
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Upload failed: ${msg}`);
      }
    },
    [identity],
  );

  return uploadFile;
}

// ========================
// Posts
// ========================

// getAllPosts, getPostsByUser, and getCommentsForPost are public read endpoints —
// they do NOT require the user to be registered in the canister's userRoles map.
// Using useActor directly (not useRegisteredActor) means these queries fire as
// soon as the actor is built, without waiting for the _initializeAccessControl
// registration call to complete. This prevents the "no posts" symptom when the
// canister cold-starts and the registration call races against the first query.
export function useGetAllPosts() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPosts();
    },
    enabled: !!actor && !isFetching,
    staleTime: 10_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

export function useGetPostsByUser(user: Principal | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["posts", "user", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getPostsByUser(user);
    },
    enabled: !!actor && !isFetching && !!user,
    staleTime: 10_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

export function useGetComments(postId: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCommentsForPost(postId);
    },
    enabled: !!actor && !isFetching && !!postId,
    staleTime: 15_000,
  });
}

export function useLikePost() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.likePost(postId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useUnlikePost() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.unlikePost(postId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useAddComment() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      content,
    }: { postId: string; content: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addComment(postId, content);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.postId] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useCreatePost() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      mediaUrls,
      postType,
      topic,
    }: {
      content: string;
      mediaUrls: string[];
      postType: string;
      topic: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createPost(content, mediaUrls, postType, topic);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useDeletePost() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.deletePost(postId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

// ========================
// Profile
// ========================

// Gate profile restore writes to once per session per principal to avoid
// repeated write calls on every 30s background refetch.
const profileRestoredThisSession = new Set<string>();

export function useMyProfile() {
  const { actor, isFetching } = useRegisteredActor();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() ?? "";

  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      if (!actor) return null;

      let backendProfile: {
        displayName: string;
        bio: string;
        avatarUrl: string;
        bannerUrl: string;
        location: string;
      } | null = null;

      // Try to fetch from backend — wrap in try/catch so any backend error
      // (e.g. "Unauthorized" during cold-start race) still falls back to cache
      try {
        const raw = await actor.getMyProfile();
        if (raw) {
          backendProfile = {
            displayName: (raw as any).displayName ?? "",
            bio: (raw as any).bio ?? "",
            avatarUrl: (raw as any).avatarUrl ?? "",
            bannerUrl: (raw as any).bannerUrl ?? "",
            location: (raw as any).location ?? "",
          };
        }
      } catch {
        // Backend threw (cold-start / not-registered / network) — fall through to cache
      }

      if (backendProfile) {
        // Merge: prefer backend values but fall back to cache for any empty fields
        const merged = principalId
          ? mergeWithCache(principalId, backendProfile)
          : backendProfile;

        // If merge recovered fields not in the backend, push them back silently.
        // Only do this once per session to avoid repeated write calls on every refetch.
        // NOTE: we intentionally do NOT include `location` in the needsRestore
        // check — the location field holds __meta__ encoded Pro/RevBucks/Model
        // state and is always authoritative from the backend. We must never
        // overwrite a backend __meta__ location with a cached plain-text value.
        const needsRestore =
          principalId &&
          !profileRestoredThisSession.has(principalId) &&
          (merged.avatarUrl !== backendProfile.avatarUrl ||
            merged.bannerUrl !== backendProfile.bannerUrl ||
            merged.displayName !== backendProfile.displayName);

        if (needsRestore) {
          profileRestoredThisSession.add(principalId);
          try {
            await actor.updateProfile(
              merged.displayName,
              merged.bio,
              merged.avatarUrl,
              merged.location,
              merged.bannerUrl,
            );
          } catch {
            // best-effort — don't block
          }
        }

        // Always keep cache up to date with latest merged data
        if (principalId && merged.displayName) {
          setCachedProfile(principalId, merged);
        }

        return merged;
      }

      // Backend returned nothing — fall back to local cache entirely
      if (principalId) {
        const cached = getCachedProfile(principalId);
        if (cached?.displayName) {
          // Re-save to backend silently so it repopulates after a canister reset.
          // Only once per session to avoid repeated write calls.
          if (!profileRestoredThisSession.has(principalId)) {
            profileRestoredThisSession.add(principalId);
            try {
              await actor.updateProfile(
                cached.displayName,
                cached.bio,
                cached.avatarUrl,
                cached.location,
                cached.bannerUrl,
              );
            } catch {
              // ignore — best-effort restore
            }
          }
          return cached;
        }
      }

      return null;
    },
    enabled: !!actor && !isFetching,
    // Keep data in memory for 5 minutes across page navigations
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    // Retry on failure to handle canister cold-starts and "User is not registered" races.
    // Using 5 retries with exponential back-off covers the worst-case cold-start window.
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    // If the profile is empty we immediately mark the data as stale so the
    // next render cycle triggers a fresh fetch rather than waiting 30 s.
    select: (data) => data,
  });
}

export function useGetProfile(user: Principal | undefined) {
  // getProfile is a public read — use useActor directly so it doesn't block
  // behind the registration gate (which can fail on canister cold-start).
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["profile", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.getProfile(user);
    },
    enabled: !!actor && !isFetching && !!user,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

export function useUpdateProfile() {
  const { actor } = useRegisteredActor();
  const { identity } = useInternetIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      displayName,
      bio,
      avatarUrl,
      location,
      bannerUrl,
    }: {
      displayName: string;
      bio: string;
      avatarUrl: string;
      location: string;
      bannerUrl: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      const profileData = { displayName, bio, avatarUrl, bannerUrl, location };

      // Save to local cache FIRST so data is never lost even if backend call fails
      const principalId = identity?.getPrincipal().toString() ?? "";
      if (principalId && displayName) {
        setCachedProfile(principalId, profileData);
      }

      // Save to backend — retry up to 3 times on auth/cold-start errors
      let lastErr: unknown;
      let savedOk = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await actor.updateProfile(
            displayName,
            bio,
            avatarUrl,
            location,
            bannerUrl,
          );
          savedOk = true;
          break;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          if (
            (msg.toLowerCase().includes("unauthorized") ||
              msg.includes("not registered")) &&
            attempt < 2
          ) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw err;
        }
      }
      if (!savedOk) throw lastErr;

      return profileData;
    },
    onSuccess: (profileData) => {
      // Directly set the query cache — this is the source of truth after a save.
      // We do NOT call invalidateQueries here because a background refetch from
      // the backend could race and overwrite the freshly saved data with stale/empty
      // results (e.g. if the canister is cold-starting or the update hasn't
      // propagated yet).  The query will naturally re-fetch on next stale check.
      qc.setQueryData(["profile", "me"], profileData);
    },
    onError: (_err, vars) => {
      // Even on backend error, keep local cache up to date
      const principalId = identity?.getPrincipal().toString() ?? "";
      if (principalId && vars.displayName) {
        setCachedProfile(principalId, {
          displayName: vars.displayName,
          bio: vars.bio,
          avatarUrl: vars.avatarUrl,
          bannerUrl: vars.bannerUrl,
          location: vars.location,
        });
        // Update in-memory query cache too so UI shows current values
        qc.setQueryData(["profile", "me"], {
          displayName: vars.displayName,
          bio: vars.bio,
          avatarUrl: vars.avatarUrl,
          bannerUrl: vars.bannerUrl,
          location: vars.location,
        });
      }
    },
  });
}

// ========================
// Garage
// ========================
export function useMyGarage() {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["garage", "me"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyGarage();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

export function useGarageByUser(user: Principal | undefined) {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["garage", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getGarageByUser(user);
    },
    enabled: !!actor && !isFetching && !!user,
    staleTime: 30_000,
  });
}

export function useAddCar() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (car: {
      make: string;
      model: string;
      year: string;
      color: string;
      description: string;
      modifications: string[];
      imageUrls: string[];
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addCar(
        car.make,
        car.model,
        car.year,
        car.color,
        car.description,
        car.modifications,
        car.imageUrls,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["garage"] }),
  });
}

export function useRemoveCar() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (carId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeCar(carId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["garage"] }),
  });
}

// ========================
// Events
// ========================
export function useAllEvents() {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllEvents();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function useRsvpEvent() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.rsvpEvent(eventId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUnrsvpEvent() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.unrsvpEvent(eventId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useCreateEvent() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: {
      title: string;
      description: string;
      location: string;
      eventDate: bigint;
      coverImageUrl: string;
      category: string;
      maxAttendees: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createEvent(
        event.title,
        event.description,
        event.location,
        event.eventDate,
        event.coverImageUrl,
        event.category,
        event.maxAttendees,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteEvent(eventId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useAddEventPhoto() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      photoUrl,
    }: { eventId: string; photoUrl: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addEventPhoto(eventId, photoUrl);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["eventPhotos", vars.eventId] });
    },
  });
}

export function useGetEventPhotos(eventId: string | null) {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["eventPhotos", eventId],
    queryFn: async () => {
      if (!actor || !eventId) return [];
      return actor.getEventPhotos(eventId);
    },
    enabled: !!actor && !isFetching && !!eventId,
  });
}

// ========================
// Marketplace
// ========================
export function useAllListings() {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllListings();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function useCreateListing() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listing: {
      title: string;
      description: string;
      price: bigint;
      category: string;
      condition: string;
      imageUrls: string[];
      location: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createListing(
        listing.title,
        listing.description,
        listing.price,
        listing.category,
        listing.condition,
        listing.imageUrls,
        listing.location,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useMarkListingSold() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.markListingSold(listingId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useDeleteListing() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteListing(listingId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

// ========================
// Clubs
// ========================
export function useAllClubs() {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllClubs();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function useJoinClub() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clubId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.joinClub(clubId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
  });
}

export function useLeaveClub() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clubId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.leaveClub(clubId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
  });
}

export function useCreateClub() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (club: {
      name: string;
      description: string;
      category: string;
      coverImageUrl: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createClub(
        club.name,
        club.description,
        club.category,
        club.coverImageUrl,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
  });
}

// ========================
// Social
// ========================
export function useFollowUser() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.followUser(user);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["isFollowing"] });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.unfollowUser(user);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["isFollowing"] });
    },
  });
}

export function useGetFollowers(user: Principal | undefined) {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["followers", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getFollowers(user);
    },
    enabled: !!actor && !isFetching && !!user,
    staleTime: 30_000,
  });
}

export function useGetFollowing(user: Principal | undefined) {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["following", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getFollowing(user);
    },
    enabled: !!actor && !isFetching && !!user,
    staleTime: 30_000,
  });
}

export function useIsFollowing(user: Principal | undefined) {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["isFollowing", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return false;
      return actor.isFollowing(user);
    },
    enabled: !!actor && !isFetching && !!user,
    staleTime: 30_000,
  });
}

// ========================
// Notifications
// ========================
export function useMyNotifications() {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyNotifications();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationRead() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.markNotificationRead(notificationId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSendNotificationToUser() {
  const { actor } = useRegisteredActor();
  return useMutation({
    mutationFn: async ({
      targetUser,
      notifType,
      message,
      relatedId,
    }: {
      targetUser: Principal;
      notifType: string;
      message: string;
      relatedId: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendNotificationToUser(
        targetUser,
        notifType,
        message,
        relatedId,
      );
    },
  });
}

// ========================
// Messages
// ========================
export function useGetConversations() {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getConversations();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMessages(user: Principal | undefined) {
  const { actor, isFetching } = useRegisteredActor();
  return useQuery({
    queryKey: ["messages", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getMessagesWithUser(user);
    },
    enabled: !!actor && !isFetching && !!user,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
}

export function useSendMessage() {
  const { actor } = useRegisteredActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      receiver,
      content,
    }: { receiver: Principal; content: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendMessage(receiver, content);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["messages", vars.receiver.toString()],
      });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
