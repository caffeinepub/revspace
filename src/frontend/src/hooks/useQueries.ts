import { HttpAgent } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ========================
// File Upload Hook
// ========================
export function useUploadFile() {
  const { identity } = useInternetIdentity();

  const uploadFile = useCallback(
    async (file: File, onProgress?: (pct: number) => void): Promise<string> => {
      if (!identity) {
        throw new Error("Not authenticated. Please log in before uploading.");
      }

      const config = await loadConfig();

      // Mirror exactly how config.ts builds its agent so identity, host and
      // root-key behaviour are identical to every other canister call.
      const agent = new HttpAgent({
        identity,
        host: config.backend_host,
      });

      if (config.backend_host?.includes("localhost")) {
        try {
          await agent.fetchRootKey();
        } catch (err) {
          console.warn("Unable to fetch root key for storage agent", err);
        }
      }

      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );

      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash } = await storageClient.putFile(bytes, onProgress);
      return storageClient.getDirectURL(hash);
    },
    [identity],
  );

  return uploadFile;
}

// ========================
// Posts
// ========================
export function useGetAllPosts() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPosts();
    },
    enabled: !!actor && !isFetching,
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
  });
}

export function useLikePost() {
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
export function useMyProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetProfile(user: Principal | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["profile", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.getProfile(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useUpdateProfile() {
  const { actor } = useActor();
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
      return actor.updateProfile(
        displayName,
        bio,
        avatarUrl,
        location,
        bannerUrl,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// ========================
// Garage
// ========================
export function useMyGarage() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["garage", "me"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyGarage();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGarageByUser(user: Principal | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["garage", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getGarageByUser(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useAddCar() {
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllEvents();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRsvpEvent() {
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor, isFetching } = useActor();
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
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllListings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateListing() {
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllClubs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useJoinClub() {
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["followers", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getFollowers(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useGetFollowing(user: Principal | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["following", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getFollowing(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useIsFollowing(user: Principal | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isFollowing", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return false;
      return actor.isFollowing(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

// ========================
// Notifications
// ========================
export function useMyNotifications() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyNotifications();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const { actor } = useActor();
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
  const { actor } = useActor();
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
  const { actor, isFetching } = useActor();
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
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["messages", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getMessagesWithUser(user);
    },
    enabled: !!actor && !isFetching && !!user,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
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
