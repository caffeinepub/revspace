/**
 * useAdminActor — creates a fresh authenticated actor and forcefully promotes
 * the caller to #admin using the new adminPromoteToAdmin function.
 *
 * Previous approach: _initializeAccessControlWithSecret(token) — this silently
 * does nothing if the principal is already registered as #user (warm canister).
 *
 * New approach: adminPromoteToAdmin(token) — forcefully overwrites the role to
 * #admin regardless of existing role. This is the definitive fix.
 *
 * adminSetUserMeta(user, newLocation, secret) is also available on the returned
 * actor and bypasses role checks entirely — it authenticates via the secret
 * token directly.
 */

import { useEffect, useRef, useState } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useInternetIdentity } from "./useInternetIdentity";

const ADMIN_TOKEN = "Meonly123$";

export function useAdminActor() {
  const { identity } = useInternetIdentity();
  const [actor, setActor] = useState<backendInterface | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    // Reset state whenever identity changes (including on logout → re-login)
    initRef.current = false;
    setActor(null);
    setIsReady(false);
    setError(null);

    if (!identity) return;

    initRef.current = true;

    (async () => {
      try {
        const a = await createActorWithConfig({
          agentOptions: { identity },
        });

        // Step 1: Try the new adminPromoteToAdmin function — forcefully sets
        // #admin role even if the caller is already registered as #user.
        // This fixes the "warm canister" issue where _initializeAccessControlWithSecret
        // silently does nothing.
        try {
          await a.adminPromoteToAdmin(ADMIN_TOKEN);
        } catch (promoteErr) {
          // If adminPromoteToAdmin doesn't exist yet (old canister) fall back to
          // the old initialize method. adminSetUserMeta will still work because
          // it uses secret-based auth.
          try {
            await a._initializeAccessControlWithSecret(ADMIN_TOKEN);
          } catch {
            // ignore — adminSetUserMeta doesn't need role
          }
          console.warn(
            "[useAdminActor] adminPromoteToAdmin failed, fell back:",
            promoteErr,
          );
        }

        setActor(a);
        setIsReady(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[useAdminActor] init failed:", msg);
        setError(msg);
        // Still set actor even if promote failed — adminSetUserMeta works without role
        try {
          const a2 = await createActorWithConfig({
            agentOptions: { identity },
          });
          setActor(a2);
          setIsReady(true);
        } catch {
          // truly broken
        }
      }
    })();
  }, [identity]);

  return { actor, isReady, error };
}
