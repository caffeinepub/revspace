/**
 * Lightweight client-side upload health tracker.
 * Stores a rolling window of the last 20 upload attempts in localStorage.
 */

export interface UploadAttempt {
  timestamp: number;
  success: boolean;
  errorType?: string;
  fileSizeMB?: number;
}

const STORAGE_KEY = "revspace_upload_health";
const MAX_ATTEMPTS = 20;

function loadAttempts(): UploadAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UploadAttempt[];
  } catch {
    return [];
  }
}

function saveAttempts(attempts: UploadAttempt[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    // localStorage might be full — silently ignore
  }
}

/**
 * Record an upload attempt result.
 * Keeps a rolling window of the last MAX_ATTEMPTS attempts.
 */
export function recordUploadAttempt(attempt: UploadAttempt): void {
  const attempts = loadAttempts();
  attempts.unshift(attempt); // newest first
  if (attempts.length > MAX_ATTEMPTS) {
    attempts.splice(MAX_ATTEMPTS);
  }
  saveAttempts(attempts);
}

/**
 * Get recent upload attempts within a given time window.
 * Defaults to the last 1 hour.
 */
export function getRecentAttempts(windowMs = 60 * 60 * 1000): UploadAttempt[] {
  const cutoff = Date.now() - windowMs;
  return loadAttempts().filter((a) => a.timestamp >= cutoff);
}

/**
 * Get the upload failure rate (0–1) for the last `windowMs` milliseconds.
 * Returns 0 if there are no recent attempts.
 */
export function getFailureRate(windowMs = 60 * 60 * 1000): number {
  const recent = getRecentAttempts(windowMs);
  if (recent.length === 0) return 0;
  const failures = recent.filter((a) => !a.success).length;
  return failures / recent.length;
}

/**
 * Get the error type string from the most recent failed upload, or null.
 */
export function getLastError(): string | null {
  const all = loadAttempts();
  const lastFailure = all.find((a) => !a.success);
  return lastFailure?.errorType ?? null;
}

/**
 * Clear all upload history.
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
