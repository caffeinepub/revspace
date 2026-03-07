/**
 * MediaImage — progressive image component for the RevSpace feed.
 *
 * Loading strategy:
 * 1. Renders an orange-tinted placeholder immediately (no blank box).
 * 2. Once the browser downloads the real image it fades in over 250ms.
 * 3. On second+ views within the same session the image renders instantly
 *    (no fade, no placeholder) because we track loaded URLs in a module-level
 *    Set — this is faster than localStorage and has zero JSON overhead.
 * 4. Supports fetchpriority="high" for the first posts in the feed so the
 *    browser prioritises them over lower-priority assets.
 */

import { useEffect, useRef, useState } from "react";

// ── Session-scoped in-memory cache of already-loaded media URLs ──────────────
// Reset on full page reload (intentional — avoids stale CDN URL issues).
const _loadedUrls = new Set<string>();

export function markUrlLoaded(url: string) {
  _loadedUrls.add(url);
}

export function isUrlLoaded(url: string): boolean {
  return _loadedUrls.has(url);
}

// ── Prefetch helper — kick off image load before it scrolls into view ────────
const _prefetching = new Set<string>();

export function prefetchImage(url: string | undefined): void {
  if (!url || _loadedUrls.has(url) || _prefetching.has(url)) return;
  _prefetching.add(url);
  const img = new Image();
  img.onload = () => {
    _loadedUrls.add(url);
    _prefetching.delete(url);
  };
  img.onerror = () => _prefetching.delete(url);
  img.src = url;
}

interface MediaImageProps {
  src: string;
  alt?: string;
  className?: string;
  /** Set true for first 1-2 posts so browser prioritises them */
  highPriority?: boolean;
  /** Called when load fails — parent can show fallback */
  onError?: () => void;
}

export function MediaImage({
  src,
  alt = "",
  className = "",
  highPriority = false,
  onError,
}: MediaImageProps) {
  const alreadyLoaded = isUrlLoaded(src);
  const [loaded, setLoaded] = useState(alreadyLoaded);
  const imgRef = useRef<HTMLImageElement>(null);

  // If the browser already has the image decoded (cache hit), the `complete`
  // property is true synchronously — skip the fade animation entirely.
  useEffect(() => {
    if (loaded) return;
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      markUrlLoaded(src);
      setLoaded(true);
    }
  }, [src, loaded]);

  const handleLoad = () => {
    markUrlLoaded(src);
    setLoaded(true);
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: "oklch(0.12 0.01 240)" }}
    >
      {/* Placeholder shimmer — only visible while loading */}
      {!loaded && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.14 0.01 240) 0%, oklch(0.18 0.02 38) 50%, oklch(0.14 0.01 240) 100%)",
            backgroundSize: "200% 200%",
            animation: "mediaShimmer 1.4s ease-in-out infinite",
          }}
          aria-hidden="true"
        />
      )}

      {/* biome-ignore lint/a11y/useAltText: alt prop is passed from parent and forwarded below */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        // fetchpriority is a standard HTML attribute but not yet in React types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ fetchpriority: highPriority ? "high" : "auto" } as any)}
        loading={highPriority ? "eager" : "lazy"}
        decoding={highPriority ? "sync" : "async"}
        onLoad={handleLoad}
        onError={onError}
        style={{
          opacity: loaded ? 1 : 0,
          transition: alreadyLoaded ? "none" : "opacity 0.25s ease-out",
        }}
      />

      <style>{`
        @keyframes mediaShimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
