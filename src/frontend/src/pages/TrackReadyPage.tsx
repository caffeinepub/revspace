import { Link } from "@tanstack/react-router";
import { Crown, Flag, Lock, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUserMeta } from "../hooks/useUserMeta";
import { isUserPro } from "../lib/pro";

const TRACK_URL = "https://trackready-by-revspace-mxe.caffeine.xyz/";

export function TrackReadyPage() {
  const { meta } = useUserMeta();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isPro = isUserPro() || meta?.isPro;
  const isAnonymous = !identity || identity.getPrincipal().isAnonymous();

  // ── Anonymous: sign-in gate ───────────────────────────────────────────────
  if (isAnonymous) {
    return (
      <div
        className="min-h-screen flex flex-col items-center pb-16"
        style={{
          background:
            "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(245,158,11,0.10) 0%, #0a0a0f 55%)",
        }}
      >
        <div className="w-full max-w-lg px-5 pt-16 flex flex-col items-center text-center">
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2 mb-1"
          >
            <Flag size={28} fill="#f59e0b" style={{ color: "#f59e0b" }} />
            <h1
              className="font-display text-4xl font-black tracking-tight"
              style={{ color: "#f59e0b" }}
            >
              Track Ready
            </h1>
          </motion.div>
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs tracking-[0.25em] uppercase mb-5"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            by RevSpace
          </motion.p>

          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-white/70 text-sm leading-relaxed max-w-xs mb-8"
          >
            Sign in to access Track Ready — the performance tracking platform
            built for the RevSpace community.
          </motion.p>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            className="w-full flex flex-col items-center gap-4"
          >
            <button
              type="button"
              onClick={login}
              disabled={isLoggingIn}
              data-ocid="track-ready.signin.primary_button"
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-wait disabled:scale-100"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.5)",
                color: "#f59e0b",
              }}
            >
              {isLoggingIn ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign in with Internet Identity
                </>
              )}
            </button>

            <p className="text-white/30 text-xs max-w-xs leading-relaxed">
              Internet Identity is ICP's secure, decentralized sign-in — we
              don't control it
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 mt-8"
          >
            {[
              "Lap Timer",
              "Performance Logs",
              "Track Events",
              "Build Specs",
            ].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  color: "#f59e0b",
                }}
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Non-Pro: teaser with locked button ──────────────────────────────────
  if (!isPro) {
    return (
      <div
        className="min-h-screen flex flex-col items-center pb-16"
        style={{
          background:
            "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(245,158,11,0.10) 0%, #0a0a0f 55%)",
        }}
      >
        <div className="w-full max-w-lg px-5 pt-16 flex flex-col items-center text-center">
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2 mb-1"
          >
            <Flag size={28} fill="#f59e0b" style={{ color: "#f59e0b" }} />
            <h1
              className="font-display text-4xl font-black tracking-tight"
              style={{ color: "#f59e0b" }}
            >
              Track Ready
            </h1>
          </motion.div>
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs tracking-[0.25em] uppercase mb-5"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            by RevSpace
          </motion.p>

          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-white/70 text-sm leading-relaxed max-w-xs mb-8"
          >
            Log lap times, track your build's performance, and connect with
            other track-day enthusiasts — exclusively for RevSpace Pro members.
          </motion.p>

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {[
              "Lap Timer",
              "Performance Logs",
              "Track Events",
              "Build Specs",
            ].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  color: "#f59e0b",
                }}
              >
                {tag}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.25,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            className="w-full flex flex-col items-center gap-4"
          >
            {/* Locked button */}
            <div
              data-ocid="track-ready.locked.button"
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg tracking-wide cursor-not-allowed select-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "2px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              <Lock size={20} />
              Open Track Ready — Pro Only
            </div>

            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: "#f59e0b" }}
            >
              <Crown size={15} />
              <span className="font-semibold">RevSpace Pro exclusive</span>
            </div>

            <Link
              to="/pro"
              className="w-full"
              data-ocid="track-ready.upgrade.link"
            >
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-black text-base transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  boxShadow:
                    "0 0 24px rgba(245,158,11,0.4), 0 4px 16px rgba(0,0,0,0.3)",
                }}
              >
                <Crown size={17} />
                Upgrade to Pro to Access
              </button>
            </Link>

            <p className="text-white/30 text-xs">
              Pro unlocks Track Ready + all exclusive RevSpace perks.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Pro: open button linking out to Track Ready ──────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center pb-16"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(245,158,11,0.10) 0%, #0a0a0f 55%)",
      }}
    >
      <div className="w-full max-w-lg px-5 pt-12 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-1">
          <Flag size={26} fill="#f59e0b" style={{ color: "#f59e0b" }} />
          <h1
            className="font-display text-3xl font-black tracking-tight"
            style={{ color: "#f59e0b" }}
          >
            Track Ready
          </h1>
        </div>
        <p
          className="text-xs tracking-[0.25em] uppercase mb-2"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          by RevSpace
        </p>

        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-8"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.4)",
            color: "#f59e0b",
          }}
        >
          <Crown size={11} />
          Pro Access Unlocked
        </span>

        <p className="text-white/60 text-sm leading-relaxed max-w-xs mb-8">
          Your Pro membership gives you full access to Track Ready — log lap
          times, track your build's performance, and connect with other
          track-day enthusiasts.
        </p>

        <a
          href={TRACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-ocid="track-ready.open.primary_button"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-black text-lg tracking-wide transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #f97316)",
            boxShadow:
              "0 0 32px rgba(245,158,11,0.4), 0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          <Flag size={20} fill="black" style={{ color: "black" }} />
          Open Track Ready
        </a>

        <p className="text-white/30 text-xs mt-4">
          Opens Track Ready by RevSpace in a new tab.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {["Lap Timer", "Performance Logs", "Track Events", "Build Specs"].map(
            (tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  color: "#f59e0b",
                }}
              >
                {tag}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
