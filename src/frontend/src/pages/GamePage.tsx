import { Link } from "@tanstack/react-router";
import { Crown, Lock, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useUserMeta } from "../hooks/useUserMeta";
import { isUserPro } from "../lib/pro";

const GAME_URL = "https://street-legends-racing-xbm.caffeine.xyz/";
const GAME_SCREENSHOT = "/assets/uploads/Screenshot_20260301-213816-1--1.png";

export function GamePage() {
  const { meta } = useUserMeta();
  const isPro = isUserPro() || meta?.isPro;

  // ── Non-Pro: ad page with locked Play button ──────────────────────────────
  if (!isPro) {
    return (
      <div
        className="min-h-screen flex flex-col items-center pb-16"
        style={{
          background:
            "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(0,220,180,0.10) 0%, #0a0a0f 55%)",
        }}
      >
        {/* Hero screenshot */}
        <div
          className="w-full relative overflow-hidden"
          style={{ maxHeight: 340 }}
        >
          <img
            src={GAME_SCREENSHOT}
            alt="Street Legends Racing"
            className="w-full object-cover object-top"
            style={{ maxHeight: 340 }}
          />
          {/* teal glow overlay at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24"
            style={{
              background: "linear-gradient(to bottom, transparent, #0a0a0f)",
            }}
          />
          {/* Live chip */}
          <div
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(0,220,180,0.5)",
              color: "#00dbb4",
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#00dbb4" }}
            />
            LIVE
          </div>
        </div>

        {/* Content */}
        <div className="w-full max-w-lg px-5 pt-6 flex flex-col items-center text-center">
          {/* Logo / title */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2 mb-1"
          >
            <Zap size={28} fill="#00dbb4" style={{ color: "#00dbb4" }} />
            <h1
              className="font-display text-4xl font-black tracking-tight"
              style={{ color: "#00dbb4" }}
            >
              Street Legends
            </h1>
          </motion.div>
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs tracking-[0.25em] uppercase mb-5"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Racing Social
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-white/70 text-sm leading-relaxed max-w-xs mb-8"
          >
            Join live street races, challenge rivals, and climb the leaderboard
            in the underground racing world built for RevSpace Pro members.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {[
              "Live Race Feed",
              "Head-to-Head Races",
              "Live Meet Spots",
              "Rival Crews",
            ].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(0,220,180,0.08)",
                  border: "1px solid rgba(0,220,180,0.25)",
                  color: "#00dbb4",
                }}
              >
                {tag}
              </span>
            ))}
          </motion.div>

          {/* Lock CTA */}
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
            {/* Locked play button */}
            <div
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg tracking-wide cursor-not-allowed select-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "2px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              <Lock size={20} />
              Play Now — Pro Only
            </div>

            {/* Pro badge */}
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: "#f59e0b" }}
            >
              <Crown size={15} />
              <span className="font-semibold">RevSpace Pro exclusive</span>
            </div>

            {/* Upgrade CTA */}
            <Link to="/pro" className="w-full">
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
                Upgrade to Pro to Play
              </button>
            </Link>

            <p className="text-white/30 text-xs">
              Pro unlocks Street Legends + all exclusive RevSpace perks.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Pro: full-screen embedded game ────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      {/* Thin header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{
          background: "rgba(10,10,15,0.98)",
          borderBottom: "1px solid rgba(0,220,180,0.2)",
        }}
      >
        <Zap size={18} fill="#00dbb4" style={{ color: "#00dbb4" }} />
        <h1
          className="font-display text-base font-black tracking-wide flex-1"
          style={{ color: "#00dbb4" }}
        >
          Street Legends
        </h1>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.4)",
            color: "#f59e0b",
          }}
        >
          <Crown size={10} />
          PRO
        </span>
      </div>

      {/* Game iframe */}
      <iframe
        src={GAME_URL}
        title="Street Legends Racing"
        allow="fullscreen; gamepad"
        allowFullScreen
        className="w-full border-0"
        style={{ flex: "1 1 0", minHeight: 0 }}
      />
    </div>
  );
}
