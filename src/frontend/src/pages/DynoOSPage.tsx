import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  FileBarChart2,
  GitBranch,
  QrCode,
  Thermometer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

// ── Feature data ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: "session",
    number: "01",
    icon: ClipboardList,
    title: "Dyno Session Manager",
    tagline: "Every pull. Every detail. Every time.",
    color: "#00d4ff",
    bullets: [
      "Vehicle profile — VIN, mods, fuel type, boost level",
      "Run-by-run pull tracking with timestamps",
      "Notes per pull, right where you need them",
      "Weather & correction factors logged automatically",
    ],
  },
  {
    id: "comparison",
    number: "02",
    icon: BarChart3,
    title: "Run Comparison Engine",
    tagline: "This alone saves hours per day.",
    color: "#a855f7",
    bullets: [
      "Overlay dyno graphs from any two runs",
      "Auto-highlight gains and losses across the RPM range",
      "% change calculated per mod or tune revision",
      "Instant visual diff — no spreadsheet required",
    ],
  },
  {
    id: "version",
    number: "03",
    icon: GitBranch,
    title: "Tune Version Control",
    tagline: "Like GitHub — but for tune files.",
    color: "#22c55e",
    bullets: [
      "Full version history of every tune revision",
      "One-click rollback to any previous state",
      "Change notes attached to every save",
      "Who touched what, and when",
    ],
  },
  {
    id: "report",
    number: "04",
    icon: FileBarChart2,
    title: "Customer Power Report Generator",
    tagline: "1-click export. Looks pro. Gets shared.",
    color: "#f59e0b",
    bullets: [
      "Branded dyno sheets with your shop's logo",
      "Before/after graphs ready for social media",
      "Full build summary in one document",
      "QR code linking to the car's online profile",
    ],
  },
  {
    id: "safety",
    number: "05",
    icon: AlertTriangle,
    title: "Safety & Anomaly Detection",
    tagline: "A second set of eyes on every pull.",
    color: "#ef4444",
    bullets: [
      "Real-time knock spike detection and flagging",
      "AFR swing alerts before they become problems",
      "Boost creep monitoring across the pull",
      "Dangerous temp thresholds — coolant, oil, IAT",
    ],
  },
];

const PAIN_POINTS = [
  { icon: "📊", label: "Dyno software" },
  { icon: "📋", label: "Spreadsheets" },
  { icon: "📁", label: "Google Drive" },
  { icon: "📱", label: "WhatsApp texts" },
  { icon: "📝", label: "Paper notes" },
  { icon: "❓", label: '"How much power?"' },
];

const STAT_CHIPS = [
  { icon: TrendingUp, value: "Run-by-Run", label: "Tracking" },
  { icon: Zap, value: "1-Click", label: "Reports" },
  { icon: Activity, value: "Live", label: "Anomaly Detection" },
  { icon: GitBranch, value: "Full", label: "Version Control" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function DynoOSPage() {
  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "#08090e" }}
      data-ocid="dyno-os.page"
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Hero image */}
        <div className="relative h-56 sm:h-72 md:h-80 overflow-hidden">
          <img
            src="/assets/generated/dyno-os-hero.dim_1200x500.jpg"
            alt="DynoOS dashboard"
            className="w-full h-full object-cover object-center"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(8,9,14,0.3) 0%, rgba(8,9,14,0.0) 40%, rgba(8,9,14,0.85) 80%, #08090e 100%)",
            }}
          />
          {/* Top glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,212,255,0.12) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Hero text — overlaps image bottom */}
        <div className="px-5 -mt-16 relative z-10 max-w-2xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest"
                style={{
                  background: "rgba(0,212,255,0.1)",
                  border: "1px solid rgba(0,212,255,0.3)",
                  color: "#00d4ff",
                }}
              >
                <Zap size={10} />
                Dyno Intelligence Platform
              </span>
            </div>

            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2"
              style={{
                fontFamily: "'Mona Sans', sans-serif",
                color: "#ffffff",
                textShadow: "0 0 40px rgba(0,212,255,0.3)",
              }}
            >
              Dyno
              <span style={{ color: "#00d4ff" }}>OS</span>
            </h1>

            <p
              className="text-base sm:text-lg font-semibold mb-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              The Operating System for Dyno Tuners
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              Shop management + tuning intelligence, built for dynos.
            </p>
          </motion.div>

          {/* Stat chips */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6"
          >
            {STAT_CHIPS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center py-3 px-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <Icon size={14} style={{ color: "#00d4ff" }} className="mb-1" />
                <span
                  className="text-sm font-black"
                  style={{ color: "#ffffff" }}
                >
                  {value}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Problem section ──────────────────────────────────────────────── */}
      <section className="px-5 mt-10 max-w-2xl mx-auto">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <p
            className="text-xs font-black uppercase tracking-widest mb-2"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            The Problem
          </p>
          <h2
            className="text-2xl font-black leading-tight mb-4"
            style={{ color: "#ffffff" }}
          >
            Dyno tuners currently juggle{" "}
            <span style={{ color: "#ef4444" }}>six separate systems.</span>
          </h2>
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            There is no unified system. Every job leaks time, context, and
            professionalism into the cracks between tools.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PAIN_POINTS.map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <span className="text-base">{icon}</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Divider line */}
          <div
            className="h-px mt-8"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(0,212,255,0.3), transparent)",
            }}
          />
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="px-5 mt-8 max-w-2xl mx-auto space-y-4">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xs font-black uppercase tracking-widest mb-6"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Core Features
        </motion.p>

        {FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              data-ocid={`dyno-os.feature.item.${i + 1}`}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Feature header */}
              <div
                className="flex items-start gap-4 p-4 pb-3"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Number + icon */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span
                    className="text-[10px] font-black tabular-nums"
                    style={{ color: `${feature.color}80` }}
                  >
                    {feature.number}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${feature.color}12`,
                      border: `1px solid ${feature.color}30`,
                    }}
                  >
                    <Icon size={18} style={{ color: feature.color }} />
                  </div>
                </div>

                {/* Title + tagline */}
                <div className="flex-1 min-w-0 pt-1">
                  <h3
                    className="text-base font-black leading-tight"
                    style={{ color: "#ffffff" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-xs mt-0.5 font-semibold italic"
                    style={{ color: feature.color }}
                  >
                    {feature.tagline}
                  </p>
                </div>
              </div>

              {/* Bullet points */}
              <ul className="p-4 pt-3 space-y-2">
                {feature.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2.5 text-sm"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: feature.color }}
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </section>

      {/* ── CTA section ──────────────────────────────────────────────────── */}
      <section className="px-5 mt-10 max-w-2xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl p-6 text-center"
          style={{
            background:
              "radial-gradient(ellipse 100% 120% at 50% 0%, rgba(0,212,255,0.08) 0%, rgba(8,9,14,0.0) 70%)",
            border: "1px solid rgba(0,212,255,0.15)",
          }}
        >
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.25)",
            }}
          >
            <Thermometer size={22} style={{ color: "#00d4ff" }} />
          </div>

          <h2 className="text-2xl font-black mb-2" style={{ color: "#ffffff" }}>
            Built for the Dyno Bay
          </h2>
          <p
            className="text-sm leading-relaxed mb-6 max-w-xs mx-auto"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            One platform to manage sessions, track tunes, impress customers, and
            never miss a safety flag again.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <div
              data-ocid="dyno-os.cta.primary_button"
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black text-sm tracking-wide"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #0080ff)",
                color: "#000000",
                boxShadow: "0 0 28px rgba(0,212,255,0.25)",
              }}
            >
              <QrCode size={16} />
              Coming Soon — Join the Waitlist
            </div>
          </div>

          <p
            className="text-[11px] mt-4"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            DynoOS is in development. Contact @boddysum on Instagram to learn
            more.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
