import { Button } from "@/components/ui/button";
import {
  Bell,
  Car,
  CheckCircle,
  Crown,
  Film,
  Gamepad2,
  Loader2,
  MessageCircle,
  Shield,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUserMeta } from "../hooks/useUserMeta";
import { isUserPro, setUserPro } from "../lib/pro";

const PRO_PERKS = [
  {
    icon: Crown,
    title: "Gold Crown Badge",
    desc: "Stand out with an exclusive gold crown next to your name across the entire platform.",
  },
  {
    icon: Star,
    title: "Verified Pro Status",
    desc: "Your profile shows a verified Pro badge that builds trust with other users and sellers.",
  },
  {
    icon: Zap,
    title: "Priority on Leaderboard",
    desc: "Pro members get boosted ranking visibility and a dedicated Pro tier in the leaderboard.",
  },
  {
    icon: Film,
    title: "Extended Reels (10 min)",
    desc: "Upload full-length build videos, dyno pulls, and event recaps without length restrictions.",
  },
  {
    icon: Trophy,
    title: "Rev Tips Tip Jar",
    desc: "Enable a tip jar on your profile and reels so fans can support your builds directly.",
  },
  {
    icon: Car,
    title: "Featured Marketplace Listings",
    desc: "Bump your car and parts listings to the top of search results for maximum visibility.",
  },
  {
    icon: Shield,
    title: "Ad-Free Experience",
    desc: "Browse RevSpace without any third-party ads interrupting your feed or reels.",
  },
  {
    icon: Bell,
    title: "Advanced Notifications",
    desc: "Get instant push notifications for new followers, messages, and comments on your builds.",
  },
  {
    icon: MessageCircle,
    title: "Pro Support",
    desc: "Direct access to priority support via Instagram @boddysum for any issues or requests.",
  },
  {
    icon: Gamepad2,
    title: "Exclusive Game Access",
    desc: "Pro members get access to Rev Racing — an exclusive game embedded right inside RevSpace.",
  },
];

const FREE_VS_PRO = [
  { feature: "Create posts & reels", free: true, pro: true },
  { feature: "My Garage", free: true, pro: true },
  { feature: "Follow & messaging", free: true, pro: true },
  { feature: "Marketplace (basic)", free: true, pro: true },
  { feature: "Car events & clubs", free: true, pro: true },
  { feature: "Leaderboard", free: true, pro: true },
  { feature: "Forum & Mechanics Q&A", free: true, pro: true },
  { feature: "Gold crown badge", free: false, pro: true },
  { feature: "Priority leaderboard rank", free: false, pro: true },
  { feature: "Rev Tips tip jar", free: false, pro: true },
  { feature: "Featured marketplace listings", free: false, pro: true },
  { feature: "Ad-free experience", free: false, pro: true },
  { feature: "Pro support", free: false, pro: true },
];

export function ProPage() {
  const { meta, isLoading: metaLoading, saveMetaWithRetry } = useUserMeta();
  const [upgradeHandled, setUpgradeHandled] = useState(false);

  // Check BOTH on-chain meta AND localStorage for instant reads right after
  // the Stripe redirect (localStorage is written immediately; on-chain may
  // still be syncing).
  const isPro = meta.isPro || isUserPro();

  // Detect Stripe redirect success — save on-chain + localStorage backup
  useEffect(() => {
    if (upgradeHandled) return;
    const params = new URLSearchParams(window.location.search);
    const justUpgraded = params.get("rs_pro") === "XR9k2mVp";
    if (justUpgraded) {
      setUpgradeHandled(true);
      window.history.replaceState(null, "", "/pro");

      // ALWAYS write localStorage immediately so the crown shows right away —
      // even if meta.isPro is already true (could be a re-purchase/re-sync).
      setUserPro();
      toast.success("Welcome to RevSpace Pro! Your crown is now active.", {
        duration: 6000,
      });

      // Sync to on-chain in the background — retry aggressively.
      // We don't gate the success toast on this because it may take a moment.
      const loadingToastId = toast.loading("Syncing Pro status to chain…");
      saveMetaWithRetry({ isPro: true }, 15)
        .then(() => {
          toast.dismiss(loadingToastId);
        })
        .catch(() => {
          toast.dismiss(loadingToastId);
          toast.warning(
            "Pro is active. Visit Settings and tap Save Profile if the crown disappears.",
            { duration: 8000 },
          );
        });
    }
  }, [upgradeHandled, saveMetaWithRetry]);

  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(var(--carbon)) 0%, oklch(0.18 0.04 40) 100%)",
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(var(--orange) / 0.15) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-12 text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
            }}
          >
            <Crown size={38} className="text-black" />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-display text-5xl md:text-6xl font-black text-white mb-3"
            style={{ textShadow: "0 0 40px oklch(var(--orange) / 0.5)" }}
          >
            RevSpace Pro
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="text-white/70 text-lg mb-8 max-w-md mx-auto"
          >
            Unlock the full RevSpace experience. Built for serious enthusiasts
            who want to stand out.
          </motion.p>

          {metaLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center gap-2 px-6 py-3 text-white/60"
            >
              <Loader2 size={20} className="animate-spin" />
              Loading status…
            </motion.div>
          ) : isPro ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-black text-lg"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
              }}
            >
              <Crown size={20} />
              You're already Pro!
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <a
                href="https://buy.stripe.com/bJe9AUd3V0kIfpjcFp9EI00"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  className="font-bold text-lg px-10 py-6 rounded-xl shadow-2xl"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #f97316)",
                    color: "#000",
                    border: "none",
                  }}
                >
                  <Crown size={20} className="mr-2" />
                  Upgrade to Pro
                </Button>
              </a>
              <p className="text-white/40 text-xs mt-3">
                Secure checkout powered by Stripe
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Perks grid */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-center mb-8 text-white">
          Everything You Unlock
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRO_PERKS.map((perk, i) => (
            <motion.div
              key={perk.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-5 border"
              style={{
                background: "oklch(var(--surface))",
                borderColor: "oklch(var(--border))",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "oklch(var(--orange) / 0.15)" }}
              >
                <perk.icon
                  size={20}
                  style={{ color: "oklch(var(--orange))" }}
                />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1">
                {perk.title}
              </h3>
              <p className="text-steel text-xs leading-relaxed">{perk.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Free vs Pro comparison */}
      <div className="max-w-xl mx-auto px-4 pb-12">
        <h2 className="font-display text-2xl font-bold text-center mb-6 text-white">
          Free vs Pro
        </h2>
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ borderColor: "oklch(var(--border))" }}
        >
          {/* Header */}
          <div
            className="grid grid-cols-3 px-4 py-3 text-sm font-bold"
            style={{ background: "oklch(var(--surface))" }}
          >
            <span className="text-steel">Feature</span>
            <span className="text-center text-white/60">Free</span>
            <span
              className="text-center"
              style={{ color: "oklch(var(--orange))" }}
            >
              Pro
            </span>
          </div>

          {FREE_VS_PRO.map((row, i) => (
            <div
              key={row.feature}
              className="grid grid-cols-3 px-4 py-3 text-sm border-t"
              style={{
                borderColor: "oklch(var(--border))",
                background:
                  i % 2 === 0
                    ? "oklch(var(--carbon))"
                    : "oklch(var(--surface))",
              }}
            >
              <span className="text-white/80">{row.feature}</span>
              <span className="flex justify-center">
                {row.free ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <span className="text-steel text-base leading-none">—</span>
                )}
              </span>
              <span className="flex justify-center">
                {row.pro ? (
                  <CheckCircle
                    size={16}
                    style={{ color: "oklch(var(--orange))" }}
                  />
                ) : (
                  <span className="text-steel text-base leading-none">—</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* CTA at bottom */}
        {!isPro && (
          <div className="text-center mt-8">
            <a
              href="https://buy.stripe.com/bJe9AUd3V0kIfpjcFp9EI00"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="font-bold px-8"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  color: "#000",
                  border: "none",
                }}
              >
                <Crown size={16} className="mr-2" />
                Get RevSpace Pro
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-steel border-t border-border">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
