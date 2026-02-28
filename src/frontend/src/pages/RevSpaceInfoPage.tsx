import {
  Car,
  DollarSign,
  Flame,
  Heart,
  Instagram,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

const features = [
  {
    icon: Video,
    title: "Short-Form Videos & Photos",
    description:
      "A feed dedicated entirely to automotive content — clips, builds, burnouts, and more. Zero noise, pure cars.",
  },
  {
    icon: Zap,
    title: "Swipe-Based Discovery",
    description:
      "Find new builds instantly by swiping. Every swipe reveals another passionate builder from around the world.",
  },
  {
    icon: Car,
    title: "Detailed Car Profiles",
    description:
      "Showcase your build with specs, mod lists, build history, future plans, and every twist-of-the-wrench story.",
  },
  {
    icon: Users,
    title: "Follow Creators & Builders",
    description:
      "Connect with local enthusiasts, follow legendary builders, and grow your own community of fellow gearheads.",
  },
  {
    icon: Heart,
    title: "Community-Driven",
    description:
      "A platform powered by passion, not algorithms chasing trends. Real content from real enthusiasts — always.",
  },
  {
    icon: Flame,
    title: "Your Digital Garage",
    description:
      "Whether you're JDM, muscle, Euro, off-road, or street — RevGrid is your digital home for every build.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function RevSpaceInfoPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(var(--carbon))" }}
    >
      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 py-20 md:py-28 text-center"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(var(--orange) / 0.12) 0%, transparent 70%), oklch(var(--carbon))",
        }}
      >
        {/* Background texture lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, oklch(var(--orange) / 0.03) 0px, oklch(var(--orange) / 0.03) 1px, transparent 1px, transparent 80px)",
            backgroundSize: "80px 100%",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{
              background: "oklch(var(--orange) / 0.12)",
              border: "1px solid oklch(var(--orange) / 0.3)",
              color: "oklch(var(--orange))",
            }}
          >
            <Flame size={12} />
            The Car Enthusiast Platform
          </motion.div>

          <h1
            className="text-6xl md:text-8xl font-black uppercase tracking-tight mb-4"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              background:
                "linear-gradient(135deg, oklch(var(--foreground)) 30%, oklch(var(--orange)) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 0.95,
            }}
          >
            Rev
            <span
              style={{
                WebkitTextFillColor: "oklch(var(--orange))",
                color: "oklch(var(--orange))",
              }}
            >
              Space
            </span>
          </h1>

          <p
            className="text-xl md:text-2xl mt-4 mb-8 leading-relaxed font-medium"
            style={{
              color: "oklch(var(--steel-light))",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            The ultimate social platform built by{" "}
            <span style={{ color: "oklch(var(--orange))" }}>
              car enthusiasts
            </span>
            , for{" "}
            <span style={{ color: "oklch(var(--orange))" }}>
              car enthusiasts
            </span>
            .
          </p>

          {/* Divider line */}
          <div
            className="h-px w-24 mx-auto"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(var(--orange)), transparent)",
            }}
          />
        </motion.div>
      </section>

      {/* ── About ────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="rounded-2xl p-8 md:p-10"
            style={{
              background: "oklch(var(--surface))",
              border: "1px solid oklch(var(--border))",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <h2
              className="text-3xl md:text-4xl font-black uppercase tracking-wide mb-5"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                color: "oklch(var(--foreground))",
              }}
            >
              What is{" "}
              <span style={{ color: "oklch(var(--orange))" }}>RevSpace</span>?
            </h2>
            <div
              className="space-y-4 text-base md:text-lg leading-relaxed"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              <p>
                Think TikTok — but every post is pure automotive culture. From
                slammed builds and drift clips to engine swaps, burnouts,
                restorations, and daily drivers,{" "}
                <strong style={{ color: "oklch(var(--foreground))" }}>
                  RevGrid
                </strong>{" "}
                is where cars take center stage.
              </p>
              <p>
                Swipe left or right through endless car content, discover unique
                builds, and connect with owners from all over the world. Every
                profile is more than just a username — showcase your car with
                photos, videos, specs, build lists, future plans, and mods in
                progress.
              </p>
              <p>
                Whether you're into{" "}
                <span style={{ color: "oklch(var(--orange))" }}>JDM</span>,{" "}
                <span style={{ color: "oklch(var(--orange))" }}>muscle</span>,{" "}
                <span style={{ color: "oklch(var(--orange))" }}>Euro</span>,{" "}
                <span style={{ color: "oklch(var(--orange))" }}>off-road</span>,
                or{" "}
                <span style={{ color: "oklch(var(--orange))" }}>
                  street builds
                </span>
                , RevGrid is your digital garage.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Features Grid ─────────────────────────────────── */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h2
            className="text-3xl md:text-4xl font-black uppercase tracking-wide"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "oklch(var(--foreground))",
            }}
          >
            🔥 <span style={{ color: "oklch(var(--orange))" }}>Features</span>
          </h2>
          <p
            className="mt-2 text-sm uppercase tracking-widest"
            style={{ color: "oklch(var(--steel))" }}
          >
            Built for builders, by builders
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: "oklch(var(--surface))",
                  border: "1px solid oklch(var(--border))",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "oklch(var(--orange) / 0.15)" }}
                >
                  <Icon size={20} style={{ color: "oklch(var(--orange))" }} />
                </div>
                <div>
                  <h3
                    className="text-base font-bold mb-1"
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      color: "oklch(var(--foreground))",
                      fontSize: "1.05rem",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "oklch(var(--steel-light))" }}
                  >
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Movement tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 text-center px-4 py-5 rounded-xl"
          style={{
            background: "oklch(var(--orange) / 0.08)",
            border: "1px solid oklch(var(--orange) / 0.2)",
          }}
        >
          <p
            className="text-xl md:text-2xl font-bold"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "oklch(var(--orange))",
              letterSpacing: "0.03em",
            }}
          >
            RevGrid isn't just an app — it's a movement for people who live and
            breathe cars.
          </p>
        </motion.div>
      </section>

      {/* ── Support & Contact Row ──────────────────────────── */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Support Card */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl p-7 flex flex-col gap-5"
            style={{
              background: "oklch(var(--surface))",
              border: "1px solid oklch(var(--border))",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(var(--orange) / 0.15)" }}
              >
                <DollarSign
                  size={20}
                  style={{ color: "oklch(var(--orange))" }}
                />
              </div>
              <h2
                className="text-2xl font-black uppercase"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "oklch(var(--foreground))",
                }}
              >
                Support{" "}
                <span style={{ color: "oklch(var(--orange))" }}>RevSpace</span>
              </h2>
            </div>

            <p
              className="text-sm leading-relaxed"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              RevGrid is independently built and community-powered. If you'd
              like to support development, server costs, and future features,
              donations are always appreciated.
            </p>
          </motion.div>

          {/* Contact Card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl p-7 flex flex-col gap-5"
            style={{
              background: "oklch(var(--surface))",
              border: "1px solid oklch(var(--border))",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(var(--orange) / 0.15)" }}
              >
                <Instagram
                  size={20}
                  style={{ color: "oklch(var(--orange))" }}
                />
              </div>
              <h2
                className="text-2xl font-black uppercase"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "oklch(var(--foreground))",
                }}
              >
                📩{" "}
                <span style={{ color: "oklch(var(--orange))" }}>Contact</span>
              </h2>
            </div>

            <p
              className="text-sm leading-relaxed"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Questions, collabs, or just want to show off your build? Slide
              into our DMs.
            </p>

            <a
              href="https://instagram.com/boddysum"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-base transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background:
                  "linear-gradient(135deg, oklch(var(--orange) / 0.15), oklch(var(--orange) / 0.05))",
                border: "1px solid oklch(var(--orange) / 0.4)",
                color: "oklch(var(--orange-bright))",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.05em",
                boxShadow: "0 0 16px oklch(var(--orange) / 0.1)",
                textDecoration: "none",
              }}
            >
              <Instagram size={18} />
              @boddysum
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Footer strip ────────────────────────────────── */}
      <section
        className="mt-8 mb-16 px-6 py-10 text-center"
        style={{
          borderTop: "1px solid oklch(var(--border))",
        }}
      >
        <p
          className="text-4xl md:text-5xl font-black uppercase tracking-tight"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "oklch(var(--foreground) / 0.15)",
            letterSpacing: "-0.01em",
          }}
        >
          Built Different.{" "}
          <span style={{ color: "oklch(var(--orange) / 0.3)" }}>
            Built Altered.
          </span>
        </p>
        <p
          className="mt-4 text-xs uppercase tracking-widest"
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
