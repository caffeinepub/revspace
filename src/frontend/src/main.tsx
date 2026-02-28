import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "../index.css";

// ── Deploy version cache-bust ─────────────────────────────────────────────────
// Each build stamps a unique version string. On load we compare it against the
// last known version stored in sessionStorage. If they differ (new deploy), we
// clear all caches and do a hard reload once so the browser always runs the
// latest code — not a stale cached version.
const BUILD_VERSION = "v91-20260228-2200";
const VERSION_KEY = "revspace_build_version";

(function checkVersion() {
  try {
    const stored = sessionStorage.getItem(VERSION_KEY);
    if (stored && stored !== BUILD_VERSION) {
      // New deploy detected — clear caches then hard-reload
      sessionStorage.setItem(VERSION_KEY, BUILD_VERSION);
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
      window.location.reload();
      return;
    }
    sessionStorage.setItem(VERSION_KEY, BUILD_VERSION);
  } catch {
    // sessionStorage blocked — proceed normally
  }
})();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
