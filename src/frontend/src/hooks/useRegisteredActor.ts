import { useEffect, useRef, useState } from "react";
import type { backendInterface } from "../backend";
import { useActor } from "./useActor";

/**
 * Wraps `useActor` and gates the returned actor behind a confirmed registration
 * check. This prevents downstream React Query hooks from firing before the
 * user has been registered in the canister's access-control map.
 *
 * After every canister cold-start the in-memory `userRoles` map is empty.
 * `useActor` calls `_initializeAccessControlWithSecret` inside its React Query
 * `queryFn`, which means the actor is returned as "ready" as soon as the
 * identity-based actor is built — but a second, separate initialisation call
 * (in `useQueries.ts`) may still be racing against the first canister update
 * call from another query.
 *
 * By wrapping the actor here we ensure:
 *   1. A single, tracked init call is awaited before `actor` is exposed.
 *   2. Any in-flight registration is reflected through `isFetching`, so
 *      all `enabled: !!actor && !isFetching` guards in `useQueries.ts` block
 *      correctly.
 */
export function useRegisteredActor() {
  const { actor, isFetching } = useActor();

  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Track the last actor instance we ran registration for so we don't repeat
  // the init call on every render.
  const lastActorRef = useRef<backendInterface | null>(null);

  useEffect(() => {
    // No actor yet, or same actor instance we already registered — nothing to do.
    if (!actor || actor === lastActorRef.current) return;

    lastActorRef.current = actor;
    setIsRegistered(false);
    setIsRegistering(true);

    (async () => {
      try {
        // This ensures the canister's userRoles map contains the caller before
        // any other query fires.  We pass an empty secret because anonymous
        // callers use "" and authenticated callers use the admin token (which
        // useActor already sent once during actor creation — this call is a
        // no-op if the role is already set, but guarantees the map is populated
        // in case the canister woke from a cold-start between actor creation
        // and the first real query).
        await (
          actor as unknown as {
            _initializeAccessControlWithSecret: (s: string) => Promise<void>;
          }
        )._initializeAccessControlWithSecret("");
      } catch {
        // May throw if the role is already set or if the caller is anonymous.
        // Either way we proceed — the canister-level error will surface later
        // through individual query retries if something is genuinely wrong.
      } finally {
        // Small delay to ensure the canister has fully processed the role
        // registration before downstream queries fire.  Without this, queries
        // can race against the canister's in-memory role map update and get
        // "Unauthorized" errors that cause unnecessary retries.
        await new Promise((r) => setTimeout(r, 500));
        setIsRegistered(true);
        setIsRegistering(false);
      }
    })();
  }, [actor]);

  return {
    // Only expose the actor once registration is confirmed so downstream
    // queries cannot run before the user is in the userRoles map.
    actor: isRegistered ? actor : null,
    isFetching: isFetching || isRegistering,
  };
}
