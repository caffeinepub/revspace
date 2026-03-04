/**
 * Weekly Featured Car engine.
 * Submissions are stored in localStorage keyed by a shared "global" store.
 * Each submission auto-expires after 7 days (checked on read).
 */

export interface FeaturedCar {
  id: string;
  ownerPrincipal: string;
  ownerName: string;
  carName: string;
  year: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[]; // up to 5 images (imageUrl is kept for backwards compatibility)
  submittedAt: number; // ms timestamp
}

const STORAGE_KEY = "revspace_featured_cars";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const FEATURE_COST_RB = 1200;

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadAll(): FeaturedCar[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FeaturedCar[]) : [];
  } catch {
    return [];
  }
}

function saveAll(cars: FeaturedCar[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
}

// ─── Auto-expiry ──────────────────────────────────────────────────────────────

function isActive(car: FeaturedCar): boolean {
  return Date.now() - car.submittedAt < SEVEN_DAYS_MS;
}

/** Returns only non-expired featured cars, pruning expired ones from storage. */
export function getActiveFeaturedCars(): FeaturedCar[] {
  const all = loadAll();
  const active = all.filter(isActive);
  if (active.length !== all.length) {
    // Prune expired entries
    saveAll(active);
  }
  return active.sort((a, b) => b.submittedAt - a.submittedAt);
}

// ─── Submission ───────────────────────────────────────────────────────────────

export function submitFeaturedCar(
  data: Omit<FeaturedCar, "id" | "submittedAt">,
): FeaturedCar {
  const car: FeaturedCar = {
    ...data,
    id: `fc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    submittedAt: Date.now(),
  };
  const all = loadAll();
  all.unshift(car);
  saveAll(all);
  return car;
}

// ─── Deletion ─────────────────────────────────────────────────────────────────

/** Remove a featured car by ID. Only the owner should call this. */
export function deleteFeaturedCar(id: string): void {
  const all = loadAll();
  saveAll(all.filter((c) => c.id !== id));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Milliseconds remaining until a featured car expires. */
export function msUntilExpiry(car: FeaturedCar): number {
  return Math.max(0, car.submittedAt + SEVEN_DAYS_MS - Date.now());
}

/** Human-readable countdown string, e.g. "5d 3h 12m". */
export function formatTimeLeft(car: FeaturedCar): string {
  const ms = msUntilExpiry(car);
  if (ms <= 0) return "Expired";

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
