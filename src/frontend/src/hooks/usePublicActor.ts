/**
 * usePublicActor — lightweight hook for public (unauthenticated) reads.
 *
 * KEY CHANGE (v180): The actor is now created as a module-level singleton that
 * initialises eagerly when this module is first imported — before any React
 * component renders. This eliminates the React Query polling loop that was
 * the root cause of:
 *   • Feed / reels staying blank until an async query resolved
 *   • Canister hammering (800 ms poll × 20 retries)
 *   • Race conditions between the actor query and downstream data queries
 *
 * The hook itself is now a thin wrapper that subscribes to the singleton.
 * No React Query, no polling, no retry loops.
 */

import { useEffect, useState } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

// ─── Module-level singleton ───────────────────────────────────────────────────

let _publicActor: backendInterface | null = null;

// Subscribers that want to be notified when the actor resolves
const _subscribers = new Set<(actor: backendInterface) => void>();

function notifySubscribers(actor: backendInterface) {
  for (const cb of _subscribers) cb(actor);
}

// Tracks whether we've started (or are retrying) actor creation
let _started = false;

/**
 * Starts the singleton actor creation if not already started.
 * Safe to call multiple times — uses _started flag as guard.
 */
function startActorCreation(retryCount = 0) {
  if (_started && retryCount === 0) return;
  _started = true;
  createActorWithConfig()
    .then((actor) => {
      _publicActor = actor;
      notifySubscribers(actor);
    })
    .catch(() => {
      // Allow retries by resetting the flag
      _started = false;
      if (retryCount < 3) {
        setTimeout(
          () => startActorCreation(retryCount + 1),
          1500 * (retryCount + 1),
        );
      }
    });
}

// Kick off actor creation immediately on module import
startActorCreation();

/**
 * Returns the singleton public actor, creating it if needed.
 * Resolves once the actor is built.
 */
export function getPublicActor(): Promise<backendInterface> {
  if (_publicActor) return Promise.resolve(_publicActor);
  return new Promise((resolve) => {
    // If already resolved by the time the micro-task runs, return immediately
    if (_publicActor) {
      resolve(_publicActor);
      return;
    }
    const cb = (actor: backendInterface) => {
      _subscribers.delete(cb);
      resolve(actor);
    };
    _subscribers.add(cb);
    // Ensure creation is in-flight
    startActorCreation();
  });
}

// ─── React hook ──────────────────────────────────────────────────────────────

export function usePublicActor() {
  const [actor, setActor] = useState<backendInterface | null>(
    () => _publicActor,
  );

  useEffect(() => {
    // Already resolved — sync state immediately
    if (_publicActor) {
      setActor(_publicActor);
      return;
    }

    // Subscribe to be notified when the actor resolves
    const cb = (a: backendInterface) => {
      setActor(a);
      _subscribers.delete(cb);
    };
    _subscribers.add(cb);

    // Ensure creation has started (idempotent)
    startActorCreation();

    return () => {
      _subscribers.delete(cb);
    };
  }, []);

  return {
    actor,
    // isFetching kept for API compatibility with existing callers
    isFetching: actor === null,
  };
}
