/**
 * useAdminActor — creates a fresh authenticated actor that explicitly passes
 * the admin token to _initializeAccessControlWithSecret.
 *
 * The standard useActor hook reads the token from the URL hash / sessionStorage
 * via getSecretParameter("caffeineAdminToken"). Because the admin panel stores
 * the token in localStorage (not sessionStorage), the regular actor always calls
 * _initializeAccessControlWithSecret("") — which registers the caller as a
 * regular #user. When the admin later tries to call adminUpdateUserLocation,
 * adminDeletePost, etc., the canister rejects with "Unauthorized".
 *
 * This hook builds a separate actor that passes the correct token, ensuring the
 * canister registers (or promotes) the caller as #admin. It is only used for
 * admin write calls — public reads continue to use usePublicActor.
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
        // Pass the real admin token so the canister registers/promotes this
        // principal as #admin — even if it was previously registered as #user.
        await a._initializeAccessControlWithSecret(ADMIN_TOKEN);
        setActor(a);
        setIsReady(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[useAdminActor] init failed:", msg);
        setError(msg);
        setIsReady(false);
      }
    })();
  }, [identity]);

  return { actor, isReady, error };
}
