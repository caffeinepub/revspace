import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { getFailureRate, getLastError } from "../lib/uploadHealth";

/**
 * A small warning banner shown above the upload area when recent uploads
 * have been failing. Dismissed per-session via local state.
 */
export function UploadHealthBanner() {
  const [dismissed, setDismissed] = useState(false);

  const failureRate = getFailureRate();
  const lastError = getLastError();
  const lastAttemptFailed = lastError !== null;

  // Only show if:
  // - failure rate > 30% in the last hour, OR
  // - the last upload failed
  // AND the user hasn't dismissed it this session
  const shouldShow =
    !dismissed && (failureRate > 0.3 || lastAttemptFailed) && failureRate > 0;

  if (!shouldShow) return null;

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-3 relative"
      role="alert"
      aria-live="polite"
      style={{
        background: "oklch(0.22 0.08 55 / 0.25)",
        border: "1px solid oklch(0.72 0.18 55 / 0.45)",
      }}
    >
      <AlertTriangle
        size={15}
        className="shrink-0 mt-0.5"
        style={{ color: "oklch(0.82 0.18 65)" }}
      />

      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-semibold leading-tight"
          style={{ color: "oklch(0.88 0.14 65)" }}
        >
          Recent uploads have been failing
        </p>
        <p
          className="text-[11px] mt-0.5 leading-relaxed"
          style={{ color: "oklch(0.72 0.08 65)" }}
        >
          Your draft is saved.{" "}
          <span style={{ color: "oklch(0.80 0.12 65)" }}>
            Try: smaller file · different browser · better network
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-lg transition-opacity hover:opacity-70"
        aria-label="Dismiss upload warning"
      >
        <X size={13} style={{ color: "oklch(0.72 0.08 65)" }} />
      </button>
    </div>
  );
}
