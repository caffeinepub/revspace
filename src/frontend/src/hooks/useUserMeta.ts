/**
 * useUserMeta — reads/writes extended user metadata stored inside the
 * profile's `location` field (on-chain).
 *
 * This is the single source of truth for RevBucks balance, Pro status, and
 * Model account status after the on-chain persistence migration.
 */
import { useCallback } from "react";
import {
  type UserMetaData,
  decodeMetaFromLocation,
  encodeMetaToLocation,
} from "../lib/userMeta";
import { useMyProfile, useUpdateProfile } from "./useQueries";

const DEFAULT_META: UserMetaData = {
  rb: 0,
  isPro: false,
  isModel: false,
  modelSpecialty: "Just here for the vibes 🌟",
  modelSocialHandle: "",
  modelBookingContact: "",
  modelYearsActive: "",
  loc: "",
};

export function useUserMeta() {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const meta: UserMetaData = profile
    ? decodeMetaFromLocation(profile.location ?? "")
    : { ...DEFAULT_META };

  /**
   * Merge `updates` into the current meta and persist to on-chain profile.
   * All other profile fields (displayName, bio, avatarUrl, bannerUrl) are
   * preserved unchanged.
   */
  const saveMeta = useCallback(
    async (updates: Partial<UserMetaData>) => {
      if (!profile) return;
      const currentMeta = decodeMetaFromLocation(profile.location ?? "");
      const newMeta: UserMetaData = { ...currentMeta, ...updates };
      const encodedLocation = encodeMetaToLocation(newMeta);
      await updateProfile.mutateAsync({
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? "",
        avatarUrl: profile.avatarUrl ?? "",
        location: encodedLocation,
        bannerUrl: profile.bannerUrl ?? "",
      });
    },
    [profile, updateProfile],
  );

  return {
    meta,
    isLoading,
    saveMeta,
    isSaving: updateProfile.isPending,
    profileLoaded: !!profile,
  };
}
