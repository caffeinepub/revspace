import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Deploy-guard hook — call once near the top of the component tree (e.g. App.tsx).
 *
 * After every Caffeine publish the ICP replica has a fresh certificate timestamp.
 * Any actor that was built before the deploy carries a stale HttpAgent clock and
 * will get "Expected v3 response body" / ingress-expiry errors on ALL canister
 * calls — including post creation and file uploads.
 *
 * This hook detects that scenario and forces the actor query to rebuild:
 *   - It divides wall-clock time into 5-minute buckets.
 *   - On mount it compares the current bucket with the one stored in sessionStorage.
 *   - If they differ (meaning the page was loaded in a new 5-min window, e.g. after
 *     a fresh deploy and hard-refresh), it invalidates the "actor" React Query key,
 *     causing useActor to recreate the HttpAgent with a synced clock.
 *   - It also stores the current bucket so subsequent mounts within the same
 *     5-minute window are no-ops.
 */

const DEPLOY_BUCKET_KEY = "rs_deploy_bucket";
const FIVE_MINUTES = 5 * 60 * 1000;
const ACTOR_QUERY_KEY = "actor";

export function useDeployGuard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const currentBucket = String(Math.floor(Date.now() / FIVE_MINUTES));
    const storedBucket = sessionStorage.getItem(DEPLOY_BUCKET_KEY);

    if (storedBucket !== currentBucket) {
      // New 5-minute window detected — the actor may carry a stale clock.
      // Invalidate it so useActor rebuilds a fresh HttpAgent on next access.
      queryClient.invalidateQueries({ queryKey: [ACTOR_QUERY_KEY] });
      // Also remove ALL cached query data so stale post/profile/etc results
      // are not shown after a deploy that may have reset on-chain state.
      queryClient.removeQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }

    sessionStorage.setItem(DEPLOY_BUCKET_KEY, currentBucket);
  }, [queryClient]);
}
