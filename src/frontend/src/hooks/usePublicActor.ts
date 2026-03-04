/**
 * usePublicActor — a lightweight actor hook for public (unauthenticated) reads.
 *
 * The protected `useActor.ts` awaits `_initializeAccessControlWithSecret` inside
 * its React Query queryFn. If that call throws (common after a fresh deploy or
 * canister cold-start), `actorQuery.data` is never set, and every downstream
 * query that checks `!!actor` stays permanently blocked — causing reels, feed,
 * profiles, and all public pages to show nothing.
 *
 * This hook creates an anonymous actor WITHOUT any auth-init call, so it is
 * always available for public reads regardless of whether the auth init succeeds.
 * It should ONLY be used for read-only, unauthenticated canister queries.
 */

import { useQuery } from "@tanstack/react-query";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

const PUBLIC_ACTOR_KEY = "publicActor";

export function usePublicActor() {
  const actorQuery = useQuery<backendInterface>({
    queryKey: [PUBLIC_ACTOR_KEY],
    queryFn: async () => {
      // Build an anonymous actor — no identity, no auth init.
      // This always succeeds as long as the canister is reachable.
      return createActorWithConfig();
    },
    // Keep polling until the actor resolves, then stop
    refetchInterval: (query) => {
      // If we have data, stop polling. Otherwise retry every 1.5s.
      return query.state.data ? false : 1500;
    },
    refetchIntervalInBackground: false,
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
    // Retry aggressively so a transient network blip doesn't keep the actor null
    retry: 10,
    retryDelay: (attempt) => Math.min(500 * (attempt + 1), 4000),
  });

  return {
    actor: actorQuery.data ?? null,
    isFetching: actorQuery.isFetching,
  };
}
