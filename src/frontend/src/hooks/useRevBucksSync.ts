/**
 * useRevBucksSync — syncs the current localStorage RevBucks balance to the
 * on-chain profile after any balance mutation.
 *
 * Call syncBalance(principalId) after every addBalance / deductBalance call.
 * Retries silently until the actor is ready.  localStorage is still the
 * primary UX source of truth; on-chain is the durable backup.
 */
import { useCallback } from "react";
import { getBalance } from "../lib/revbucks";
import { useUserMeta } from "./useUserMeta";

export function useRevBucksSync() {
  const { saveMetaWithRetry } = useUserMeta();

  const syncBalance = useCallback(
    async (principalId: string): Promise<void> => {
      if (!principalId) return;
      const balance = getBalance(principalId);
      try {
        await saveMetaWithRetry({ rb: balance }, 8);
      } catch {
        // Silent fail — localStorage is still the source of truth;
        // the user can recover by saving their profile in Settings.
      }
    },
    [saveMetaWithRetry],
  );

  return { syncBalance };
}
