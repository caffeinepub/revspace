/**
 * VideoPlayer.tsx
 * Memory-efficient video player for the reels feed.
 *
 * Only loads video data when the reel is active or adjacent:
 *  - isActive  → set src + preload="auto" + play()
 *  - isAdjacent → set src + preload="metadata" (pause, metadata ready)
 *  - neither   → clear src + show poster image only
 *
 * When isActive becomes false, src is cleared after a 2s delay so the
 * browser can finish writing the current decode buffer before freeing memory.
 */

import { useEffect, useRef, useState } from "react";

export interface VideoPlayerProps {
  src: string;
  /** Thumbnail URL — shown as background until video starts playing */
  poster?: string;
  /** Currently visible/playing reel */
  isActive: boolean;
  /** Within 1 position — preload metadata for instant swipe */
  isAdjacent: boolean;
  muted?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  className?: string;
}

export function VideoPlayer({
  src,
  poster,
  isActive,
  isAdjacent,
  muted = true,
  loop = true,
  onEnded,
  onTimeUpdate,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clearSrcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Manage video lifecycle based on active/adjacent state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Cancel any pending src-clear timer
    if (clearSrcTimerRef.current) {
      clearTimeout(clearSrcTimerRef.current);
      clearSrcTimerRef.current = null;
    }

    if (isActive) {
      // Active: load fully and play
      if (video.src !== src) {
        video.src = src;
        video.load();
      }
      video.preload = "auto";
      video.muted = muted;
      setVideoError(false);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay blocked — video will play on user interaction
            setIsPlaying(false);
          });
      }
    } else if (isAdjacent) {
      // Adjacent: load metadata only so seeking is instant on swipe
      if (video.src !== src) {
        video.src = src;
        video.preload = "metadata";
        video.load();
      }
      video.pause();
      setIsPlaying(false);
    } else {
      // Far away: pause immediately, then clear src after a 2s delay
      // The delay allows the browser to finish any in-progress decode
      video.pause();
      setIsPlaying(false);
      clearSrcTimerRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = "";
          videoRef.current.load();
        }
      }, 2000);
    }

    return () => {
      if (clearSrcTimerRef.current) {
        clearTimeout(clearSrcTimerRef.current);
      }
    };
  }, [isActive, isAdjacent, src, muted]);

  // Sync muted state without resetting src
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Poster image — always present as background, hidden once video plays */}
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: isPlaying ? 0 : 1,
            transition: "opacity 0.3s ease",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        muted={muted}
        loop={loop}
        playsInline
        preload={isActive ? "auto" : isAdjacent ? "metadata" : "none"}
        data-ocid="video_player.canvas_target"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: isPlaying ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (video && video.duration > 0) {
            onTimeUpdate?.(video.currentTime, video.duration);
          }
        }}
        onError={() => {
          setVideoError(true);
          setIsPlaying(false);
        }}
      >
        <track kind="captions" />
      </video>

      {/* Error state overlay */}
      {videoError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ background: "oklch(0.1 0.005 240)" }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="opacity-30"
            style={{ color: "white" }}
          >
            <title>Video unavailable</title>
            <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M4 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H4z" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          <p className="text-xs opacity-40" style={{ color: "white" }}>
            Video unavailable
          </p>
        </div>
      )}
    </div>
  );
}
