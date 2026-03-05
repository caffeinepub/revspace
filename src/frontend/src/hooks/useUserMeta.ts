/**
 * useUserMeta — reads/writes extended user metadata stored inside the
 * profile's `location` field (on-chain).
 *
 * This is the single source of truth for RevBucks balance, Pro status, and
 * Model account status after the on-chain persistence migration.
 *
 * Auto-restoration: whenever the on-chain profile is loaded, Pro status and
 * RevBucks balance are written back to localStorage so that cache clears
 * are healed automatically on the next login.
 */
import { useCallback, useEffect, useRef } from "react";
import { setUserPro } from "../lib/pro";
import { addBalance, getBalance } from "../lib/revbucks";
import {
  type UserMetaData,
  decodeMetaFromLocation,
  encodeMetaToLocation,
} from "../lib/userMeta";
import { useInternetIdentity } from "./useInternetIdentity";
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

// Track which principals have already had their localStorage restored this session
const restoredThisSession = new Set<string>();

export function useUserMeta() {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() ?? "";
  const restoredRef = useRef(false);

  const meta: UserMetaData = profile
    ? decodeMetaFromLocation(profile.location ?? "")
    : { ...DEFAULT_META };

  // ── Auto-restore localStorage from on-chain data ─────────────────────────
  // When profile loads, if the on-chain data has Pro=true or RB > localStorage,
  // restore those values immediately. This heals cache clears on next login.
  useEffect(() => {
    if (!profile || !principalId || restoredRef.current) return;
    if (restoredThisSession.has(principalId)) return;

    restoredThisSession.add(principalId);
    restoredRef.current = true;

    try {
      const onChainMeta = decodeMetaFromLocation(profile.location ?? "");

      // Restore Pro status
      if (onChainMeta.isPro) {
        setUserPro();
      }

      // Restore RevBucks — always set to on-chain value if on-chain > local
      // After a cache clear, local = 0, so this restores the full balance.
      if (onChainMeta.rb > 0) {
        const localBalance = getBalance(principalId);
        if (onChainMeta.rb > localBalance) {
          const diff = onChainMeta.rb - localBalance;
          addBalance(principalId, diff);
        }
      }
    } catch {
      // best-effort — never block anything
    }
  }, [profile, principalId]);

  /**
   * Merge `updates` into the current meta and persist to on-chain profile.
   * All other profile fields (displayName, bio, avatarUrl, bannerUrl) are
   * preserved unchanged.
   */
  const saveMeta = useCallback(
    async (updates: Partial<UserMetaData>) => {
      if (!profile) throw new Error("Profile not loaded");
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

  /**
   * Retries saveMeta every 2s (with linear back-off) until the profile is
   * loaded and the on-chain write succeeds.  Resolves on first success,
   * rejects after all attempts are exhausted.
   */
  const saveMetaWithRetry = useCallback(
    async (updates: Partial<UserMetaData>, maxAttempts = 15): Promise<void> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          await saveMeta(updates);
          return; // success
        } catch {
          if (attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          }
        }
      }
      throw new Error("Could not save to chain after retries");
    },
    [saveMeta],
  );

  return {
    meta,
    isLoading,
    saveMeta,
    saveMetaWithRetry,
    isSaving: updateProfile.isPending,
    profileLoaded: !!profile,
  };
}
