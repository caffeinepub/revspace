import {
  Bell,
  BookOpen,
  Calendar,
  Car,
  CheckCircle,
  ChevronDown,
  Compass,
  Crown,
  DollarSign,
  Film,
  Flame,
  Home,
  MessageCircle,
  Phone,
  Settings,
  ShoppingBag,
  Smartphone,
  Star,
  Trophy,
  User,
  Users,
  Video,
  Wrench,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface FeatureItem {
  title: string;
  icon: React.ComponentType<{
    size?: number;
    style?: React.CSSProperties;
    className?: string;
  }>;
  bullets: string[];
}

// ── Data ───────────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "Create & share posts, photos, videos",
  "Upload Reels (up to 10 min with sound)",
  "My Garage — add and showcase your cars",
  "Follow users & view profiles",
  "Direct Messaging & chat",
  "Car Events — browse & RSVP",
  "Car Clubs — join communities",
  "Marketplace — buy & sell cars/parts",
  "Mechanics Q&A — ask & answer questions",
  "Leaderboard — compete for top spots",
  "Forum — post and reply in threads",
  "Notifications (likes, comments, follows, messages)",
  "Stories — 24-hour photo/video posts",
  "Build Battle — vote on car builds",
  "Performance Shop info page",
  "Standard profile badge",
];

const PRO_FEATURES = [
  "Everything in Free, PLUS:",
  "Gold Crown badge next to your name everywhere",
  "Priority placement on Leaderboard & Explore",
  "Rev Tips tip jar on your profile & reels",
  "Ad-free experience (no sponsored banners)",
  "Extended video uploads",
  "Pro-only profile customization",
  "Early access to new features",
  "Verified Pro status visible to all users",
];

const FEATURE_GUIDE: FeatureItem[] = [
  {
    title: "Feed",
    icon: Home,
    bullets: [
      "Scroll your home feed to see the latest posts from people you follow.",
      "Like & comment on posts — tap the heart or chat bubble icon.",
      "New posts always appear at the top for freshest content.",
    ],
  },
  {
    title: "Reels",
    icon: Film,
    bullets: [
      "Swipe through vertical short-form car videos up to 10 minutes long.",
      "Tap the sound icon in the corner to toggle audio on/off.",
      "Tag your reel with a topic (Street Drift, Burnout, Build, etc.) when uploading.",
    ],
  },
  {
    title: "My Garage",
    icon: Car,
    bullets: [
      "Add your cars with photos, make, model, year, and specs.",
      "Attach a Build Log with a timeline of mods, costs, and progress photos.",
      "Showcase your entire fleet — every car gets its own gallery.",
    ],
  },
  {
    title: "Explore",
    icon: Compass,
    bullets: [
      "Discover new users, builds, and trending content on the platform.",
      "Search by username to find a specific user's profile.",
      "Browse featured builds from the RevSpace community.",
    ],
  },
  {
    title: "Create Post",
    icon: Zap,
    bullets: [
      "Tap the orange + button in the sidebar or menu to open the post creator.",
      "Upload photos or videos directly from your phone or device.",
      "Add a caption, then tap Post — it goes live instantly.",
    ],
  },
  {
    title: "Stories",
    icon: Video,
    bullets: [
      "Tap your profile circle on the story row or tap the + to add a new story.",
      "Stories are 24-hour photo or video posts — they disappear automatically.",
      "Tap any circle in the story row to view someone's active story.",
    ],
  },
  {
    title: "Events",
    icon: Calendar,
    bullets: [
      "Browse upcoming car meets and shows near you or around the world.",
      "RSVP to events and upload photos from the event to its gallery.",
      "Create your own meet with a location, date, and cover image.",
    ],
  },
  {
    title: "Marketplace",
    icon: ShoppingBag,
    bullets: [
      "List your car or parts for sale — add photos, price, and description.",
      "Tap the seller's name on any listing to message them directly.",
      "Delete your own listings when the item is sold.",
    ],
  },
  {
    title: "Car Clubs",
    icon: Users,
    bullets: [
      "Join or create a club built around a shared interest or style.",
      "Post content and photos within your club's community.",
      "Connect with club members and coordinate meets.",
    ],
  },
  {
    title: "Mechanics",
    icon: Wrench,
    bullets: [
      "Post a car question with a category tag (Engine, Suspension, Electrical, etc.).",
      "Get answers from experienced builders in the community.",
      "Browse existing questions — your problem may already be solved.",
    ],
  },
  {
    title: "Messages",
    icon: MessageCircle,
    bullets: [
      "Chat directly with any user — tap their username anywhere to start a thread.",
      "New messages appear as real-time notifications in your bell icon.",
      "All your conversations are saved in the Messages page.",
    ],
  },
  {
    title: "Leaderboard",
    icon: Trophy,
    bullets: [
      "See top users ranked by posts, followers, and engagement.",
      "Earn your spot by posting consistently and growing your following.",
      "Pro members get priority placement on the leaderboard.",
    ],
  },
  {
    title: "Forum",
    icon: BookOpen,
    bullets: [
      "Start a thread in categories: General, Builds, Tech Help, Events, Marketplace Talk.",
      "Reply to any thread — all replies are visible to the community.",
      "Like threads and delete your own posts anytime.",
    ],
  },
  {
    title: "Build Battle",
    icon: Flame,
    bullets: [
      "Submit two cars to a head-to-head community vote.",
      "The community picks the winner — votes are live and visible.",
      "View past battle history and results.",
    ],
  },
  {
    title: "Rev Tips",
    icon: DollarSign,
    bullets: [
      "Add your Cash App or Venmo handle in Settings to activate your tip jar.",
      "A Tip button appears on your profile and reels so fans can support you.",
      "This is a Pro feature — upgrade to RevSpace Pro to unlock it.",
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    bullets: [
      "Get alerted for likes, comments, follows, and new messages.",
      "Tap the bell icon to see your full notification feed.",
      "Badge counts show unread notifications at a glance.",
    ],
  },
  {
    title: "Profile",
    icon: User,
    bullets: [
      "Customize your display name, bio, avatar photo, and profile banner.",
      "View all your posts, garage cars, and follower/following counts.",
      "Tap your follower/following count to see a list and navigate to any user.",
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    bullets: [
      "Update your profile info, avatar, and banner photo from here.",
      "Add your Cash App/Venmo handle to enable Rev Tips (Pro feature).",
      "Tap 'Upgrade to Pro' to unlock the gold crown badge and Pro perks.",
    ],
  },
];

const ANDROID_STEPS = [
  "Open RevSpace in Chrome on your Android phone.",
  "Tap the 3-dot menu (⋮) in the top-right corner of Chrome.",
  'Tap "Add to Home screen" from the menu.',
  'Tap "Add" to confirm when prompted.',
  "RevSpace icon will appear on your home screen — tap it to launch like a native app!",
];

const IPHONE_STEPS = [
  "Open RevSpace in Safari on your iPhone (must be Safari, not Chrome).",
  "Tap the Share button (the box with an upward arrow) at the bottom of the screen.",
  'Scroll down in the share sheet and tap "Add to Home Screen".',
  'Tap "Add" in the top-right corner to confirm.',
  "RevSpace icon will appear on your home screen — it opens full-screen like a real app!",
];

// ── Sub-components ─────────────────────────────────────────────────────────

const sectionHeaderStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  color: "oklch(var(--foreground))",
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2
        className="text-3xl md:text-4xl font-black uppercase tracking-wide mb-2"
        style={sectionHeaderStyle}
      >
        {children}
      </h2>
      <div
        className="h-1 w-16 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, oklch(var(--orange)), oklch(var(--orange) / 0))",
        }}
      />
    </div>
  );
}

function FeatureAccordion({ item }: { item: FeatureItem }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: "oklch(var(--surface))",
        border: open
          ? "1px solid oklch(var(--orange) / 0.4)"
          : "1px solid oklch(var(--border))",
        boxShadow: open ? "0 0 16px oklch(var(--orange) / 0.08)" : "none",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left focus-visible:outline-none group"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{
              background: open
                ? "oklch(var(--orange) / 0.2)"
                : "oklch(var(--surface-elevated))",
            }}
          >
            <Icon
              size={16}
              style={{
                color: open
                  ? "oklch(var(--orange))"
                  : "oklch(var(--steel-light))",
              }}
            />
          </div>
          <span
            className="text-sm font-bold uppercase tracking-wide transition-colors"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: open
                ? "oklch(var(--orange-bright))"
                : "oklch(var(--foreground))",
              fontSize: "0.95rem",
              letterSpacing: "0.05em",
            }}
          >
            {item.title}
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: "oklch(var(--steel))",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-4 pb-4 pt-0"
              style={{
                borderTop: "1px solid oklch(var(--border))",
              }}
            >
              <ul className="mt-3 space-y-2">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5">
                    <CheckCircle
                      size={14}
                      className="mt-0.5 shrink-0"
                      style={{ color: "oklch(var(--orange))" }}
                    />
                    <span
                      className="text-sm leading-relaxed"
                      style={{ color: "oklch(var(--steel-light))" }}
                    >
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepCard({
  platform,
  icon: PlatformIcon,
  steps,
  accent,
}: {
  platform: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  steps: string[];
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={{
        background: "oklch(var(--surface))",
        border: `1px solid ${accent}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}
        >
          <PlatformIcon size={20} style={{ color: accent }} />
        </div>
        <h3
          className="text-xl font-black uppercase tracking-wide"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "oklch(var(--foreground))",
          }}
        >
          {platform}
        </h3>
      </div>

      {/* Steps */}
      <ol className="space-y-3">
        {steps.map((step, idx) => (
          <li key={step} className="flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
              style={{
                background: `${accent}1a`,
                border: `1px solid ${accent}55`,
                color: accent,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >
              {idx + 1}
            </div>
            <span
              className="text-sm leading-relaxed"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              {step}
            </span>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function GuidePage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(var(--carbon))" }}
    >
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 py-16 md:py-24 text-center"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(var(--orange) / 0.1) 0%, transparent 70%), oklch(var(--carbon))",
        }}
      >
        {/* Grid lines texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, oklch(var(--orange) / 0.025) 0px, oklch(var(--orange) / 0.025) 1px, transparent 1px, transparent 80px)",
            backgroundSize: "80px 100%",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-5"
            style={{
              background: "oklch(var(--orange) / 0.12)",
              border: "1px solid oklch(var(--orange) / 0.3)",
              color: "oklch(var(--orange))",
            }}
          >
            <BookOpen size={12} />
            Platform Guide
          </div>

          <h1
            className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-4"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              lineHeight: 0.95,
              background:
                "linear-gradient(135deg, oklch(var(--foreground)) 40%, oklch(var(--orange)) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            RevSpace{" "}
            <span
              style={{
                WebkitTextFillColor: "oklch(var(--orange))",
                color: "oklch(var(--orange))",
              }}
            >
              Guide
            </span>
          </h1>

          <p
            className="text-base md:text-lg leading-relaxed mt-4"
            style={{ color: "oklch(var(--steel-light))" }}
          >
            Everything you need to know to get the most out of RevSpace — from
            features and how to use them, to installing the app on your phone.
          </p>

          <div
            className="mt-6 h-px w-20 mx-auto"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(var(--orange)), transparent)",
            }}
          />
        </motion.div>
      </section>

      {/* ── Section 1: Free vs Pro Comparison ─────────────────────────────── */}
      <section className="px-4 md:px-6 py-14 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionHeader>
            Free vs <span style={{ color: "oklch(var(--orange))" }}>Pro</span>
          </SectionHeader>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="rounded-2xl p-6 flex flex-col gap-5"
            style={{
              background: "oklch(var(--surface))",
              border: "1px solid oklch(var(--border))",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "oklch(var(--surface-elevated))",
                  border: "1px solid oklch(var(--border))",
                }}
              >
                <Star
                  size={18}
                  style={{ color: "oklch(var(--steel-light))" }}
                />
              </div>
              <div>
                <h3
                  className="text-xl font-black uppercase tracking-wide"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    color: "oklch(var(--foreground))",
                  }}
                >
                  Free
                </h3>
                <p className="text-xs" style={{ color: "oklch(var(--steel))" }}>
                  Standard account
                </p>
              </div>
              <div
                className="ml-auto text-2xl font-black"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "oklch(var(--foreground))",
                }}
              >
                $0
                <span
                  className="text-sm font-medium"
                  style={{ color: "oklch(var(--steel))" }}
                >
                  /mo
                </span>
              </div>
            </div>

            <ul className="space-y-2.5">
              {FREE_FEATURES.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <CheckCircle
                    size={15}
                    className="mt-0.5 shrink-0"
                    style={{ color: "oklch(var(--steel-light))" }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: "oklch(var(--steel-light))" }}
                  >
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(145deg, oklch(0.13 0.01 60) 0%, oklch(0.11 0.008 40) 100%)",
              border: "1px solid oklch(0.65 0.22 60 / 0.55)",
              boxShadow:
                "0 8px 40px oklch(0.65 0.22 60 / 0.12), inset 0 1px 0 oklch(0.65 0.22 60 / 0.3)",
            }}
          >
            {/* Glow accent */}
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.65 0.22 60 / 0.15), transparent 70%)",
              }}
            />

            {/* Popular badge */}
            <div
              className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                background: "oklch(0.65 0.22 60 / 0.2)",
                border: "1px solid oklch(0.65 0.22 60 / 0.5)",
                color: "oklch(0.85 0.2 60)",
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >
              ⭐ Premium
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "oklch(0.65 0.22 60 / 0.2)",
                  border: "1px solid oklch(0.65 0.22 60 / 0.4)",
                }}
              >
                <Crown size={18} style={{ color: "oklch(0.85 0.2 60)" }} />
              </div>
              <div>
                <h3
                  className="text-xl font-black uppercase tracking-wide"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    color: "oklch(0.92 0.18 60)",
                  }}
                >
                  RevSpace Pro
                </h3>
                <p className="text-xs" style={{ color: "oklch(0.65 0.15 60)" }}>
                  Gold crown membership
                </p>
              </div>
            </div>

            <ul className="space-y-2.5">
              {PRO_FEATURES.map((feat, i) => (
                <li key={feat} className="flex items-start gap-2.5">
                  {i === 0 ? (
                    <Crown
                      size={15}
                      className="mt-0.5 shrink-0"
                      style={{ color: "oklch(0.85 0.2 60)" }}
                    />
                  ) : (
                    <CheckCircle
                      size={15}
                      className="mt-0.5 shrink-0"
                      style={{ color: "oklch(0.75 0.2 60)" }}
                    />
                  )}
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        i === 0
                          ? "oklch(0.85 0.2 60)"
                          : "oklch(var(--foreground))",
                      fontWeight: i === 0 ? 700 : 400,
                    }}
                  >
                    {feat}
                  </span>
                </li>
              ))}
            </ul>

            {/* Upgrade button */}
            <a
              href="https://buy.stripe.com/bJe9AUd3V0kIfpjcFp9EI00"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.68 0.22 55), oklch(0.6 0.24 40))",
                color: "oklch(0.08 0.005 240)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "1.1rem",
                letterSpacing: "0.05em",
                boxShadow:
                  "0 4px 20px oklch(0.65 0.22 55 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.15)",
                textDecoration: "none",
              }}
            >
              <Crown size={18} />
              Upgrade to Pro →
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: Feature Guide ───────────────────────────────────────── */}
      <section className="px-4 md:px-6 py-14 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionHeader>
            How to <span style={{ color: "oklch(var(--orange))" }}>Use</span>{" "}
            RevSpace
          </SectionHeader>
          <p
            className="text-sm mb-8 -mt-4"
            style={{ color: "oklch(var(--steel))" }}
          >
            Tap any feature below to expand step-by-step instructions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
        >
          {FEATURE_GUIDE.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.03 }}
            >
              <FeatureAccordion item={item} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Section 3: Download / Install ─────────────────────────────────── */}
      <section className="px-4 md:px-6 py-14 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionHeader>
            Install the{" "}
            <span style={{ color: "oklch(var(--orange))" }}>App</span> on Your
            Phone
          </SectionHeader>
        </motion.div>

        {/* PWA note banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="flex items-start gap-3 rounded-xl px-5 py-4 mb-8"
          style={{
            background: "oklch(var(--orange) / 0.08)",
            border: "1px solid oklch(var(--orange) / 0.25)",
          }}
        >
          <Smartphone
            size={20}
            className="shrink-0 mt-0.5"
            style={{ color: "oklch(var(--orange))" }}
          />
          <p
            className="text-sm leading-relaxed"
            style={{ color: "oklch(var(--steel-light))" }}
          >
            <span
              className="font-bold"
              style={{ color: "oklch(var(--orange-bright))" }}
            >
              No App Store needed.
            </span>{" "}
            RevSpace is a Progressive Web App (PWA). Add it to your home screen
            on any phone and it works like a fully native app — with an icon,
            full-screen mode, and fast loading. It works on both Android and
            iPhone.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <StepCard
            platform="Android (Chrome)"
            icon={Phone}
            steps={ANDROID_STEPS}
            accent="oklch(0.72 0.2 142)"
          />
          <StepCard
            platform="iPhone (Safari)"
            icon={Smartphone}
            steps={IPHONE_STEPS}
            accent="oklch(0.65 0.18 250)"
          />
        </div>

        {/* Tip note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-center"
        >
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: "oklch(var(--steel))" }}
          >
            💡 Once installed, the app opens full-screen with no browser address
            bar — just like a native app.
          </p>
        </motion.div>
      </section>

      {/* ── Pro CTA strip ──────────────────────────────────────────────────── */}
      <section className="px-4 md:px-6 pb-20 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="rounded-2xl overflow-hidden relative"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.13 0.01 55) 0%, oklch(0.1 0.008 40) 100%)",
            border: "1px solid oklch(0.65 0.22 60 / 0.4)",
            boxShadow: "0 8px 40px oklch(0.65 0.22 60 / 0.1)",
          }}
        >
          {/* Glare */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.65 0.22 60 / 0.1), transparent 70%)",
            }}
          />

          <div className="relative z-10 px-6 py-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <Crown size={22} style={{ color: "oklch(0.85 0.2 60)" }} />
                <h2
                  className="text-2xl md:text-3xl font-black uppercase tracking-wide"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    color: "oklch(0.92 0.18 60)",
                  }}
                >
                  Ready to go Pro?
                </h2>
              </div>
              <p
                className="text-sm leading-relaxed max-w-md"
                style={{ color: "oklch(var(--steel-light))" }}
              >
                Get the gold crown badge, Rev Tips tip jar, priority leaderboard
                placement, ad-free browsing, and exclusive Pro perks. Support
                RevSpace and stand out in the community.
              </p>
            </div>
            <a
              href="https://buy.stripe.com/bJe9AUd3V0kIfpjcFp9EI00"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.68 0.22 55), oklch(0.6 0.24 40))",
                color: "oklch(0.08 0.005 240)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "1.1rem",
                letterSpacing: "0.05em",
                boxShadow:
                  "0 4px 24px oklch(0.65 0.22 55 / 0.45), inset 0 1px 0 oklch(1 0 0 / 0.2)",
                textDecoration: "none",
              }}
            >
              <Crown size={18} />
              Upgrade to Pro →
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <section
        className="mb-16 px-6 py-8 text-center"
        style={{ borderTop: "1px solid oklch(var(--border))" }}
      >
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: "oklch(var(--steel))" }}
        >
          © {new Date().getFullYear()} RevSpace — Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(var(--orange))" }}
          >
            caffeine.ai
          </a>
        </p>
      </section>
    </div>
  );
}
