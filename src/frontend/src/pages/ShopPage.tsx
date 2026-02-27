import { ChevronRight, Instagram, Mail, MapPin, Phone } from "lucide-react";

const SPECIALTIES = [
  "Honda & Acura Performance",
  "Custom Engine Swaps",
  "Full & Partial Engine Rebuilds",
  "Custom Modifications & Vehicle Customization",
  "ECU Chipping & Engine Management",
  "Dyno Tuning & Street Tuning",
  "Transmission Rebuilds & Drivetrain Services",
];

export function ShopPage() {
  return (
    <div className="relative min-h-screen">
      {/* Fixed background image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/assets/uploads/images-7--1.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Dark overlay */}
      <div className="fixed inset-0 z-0 bg-black/70" />

      {/* Scrollable content */}
      <div className="relative z-10 min-h-screen">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center min-h-screen px-6 py-24 text-center">
          <p
            className="tag-text text-sm tracking-[0.3em] mb-4"
            style={{ color: "oklch(var(--orange-bright))" }}
          >
            Wenatchee, WA · Est. Performance Shop
          </p>

          <h1
            className="display font-black uppercase leading-none mb-4"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "clamp(3.5rem, 12vw, 8rem)",
              letterSpacing: "-0.01em",
              color: "white",
              textShadow: "0 2px 40px rgba(0,0,0,0.8)",
            }}
          >
            ALTERED
            <br />
            <span style={{ color: "oklch(var(--orange-bright))" }}>
              IMPORTS
            </span>
          </h1>

          {/* Orange accent line */}
          <div
            className="w-24 h-1 rounded-full mb-6"
            style={{ background: "oklch(var(--orange))" }}
          />

          <p
            className="text-xl font-semibold italic tracking-wide"
            style={{ color: "oklch(var(--orange-bright))" }}
          >
            Build different. Build altered.
          </p>

          {/* Scroll cue */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60">
            <span className="text-white text-xs tracking-widest uppercase">
              Scroll
            </span>
            <div
              className="w-px h-10 rounded-full"
              style={{
                background: "linear-gradient(to bottom, white, transparent)",
              }}
            />
          </div>
        </section>

        {/* Content Card */}
        <section className="px-4 pb-24">
          <div
            className="max-w-3xl mx-auto rounded-2xl overflow-hidden"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Card header stripe */}
            <div
              className="h-1 w-full"
              style={{
                background:
                  "linear-gradient(90deg, oklch(var(--orange)), oklch(var(--ember)))",
              }}
            />

            <div className="p-8 lg:p-12 flex flex-col gap-10">
              {/* About */}
              <div className="flex flex-col gap-4">
                <p className="text-white/90 text-base lg:text-lg leading-relaxed">
                  Altered Imports is a performance-focused automotive shop built
                  for enthusiasts who demand more from their cars. We specialize
                  in Honda and Acura platforms, delivering everything from stock
                  rebuilds to full custom motor swaps, precision tuning, and
                  complete drivetrain solutions.
                </p>
                <p className="text-white/80 text-base leading-relaxed">
                  Our mission is simple: build reliable, powerful, and
                  personalized vehicles that match our customers' vision—whether
                  that's a clean daily driver, a street-focused build, or a
                  track-ready setup. We combine hands-on experience with modern
                  tuning technology to deliver real, measurable results.
                </p>
              </div>

              {/* Specialties */}
              <div>
                <h2
                  className="uppercase font-black tracking-wider text-xl mb-6"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    color: "oklch(var(--orange-bright))",
                    letterSpacing: "0.12em",
                  }}
                >
                  What We Specialize In
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SPECIALTIES.map((specialty) => (
                    <div
                      key={specialty}
                      className="flex items-center gap-3 py-3 px-4 rounded-lg transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <ChevronRight
                        size={16}
                        strokeWidth={2.5}
                        style={{ color: "oklch(var(--orange))", flexShrink: 0 }}
                      />
                      <span className="text-white/85 text-sm leading-snug">
                        {specialty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Closing text */}
              <div className="flex flex-col gap-4">
                <p className="text-white/80 text-base leading-relaxed">
                  From precise ECU calibration to complete powertrain
                  transformations, every build at Altered Imports is handled
                  with attention to detail, reliability, and performance-first
                  thinking. We don't believe in shortcuts—only clean work,
                  proven setups, and honest results.
                </p>
                <p className="text-white/80 text-base leading-relaxed">
                  Whether you're upgrading, rebuilding, or starting from
                  scratch, Altered Imports is where passion meets precision.
                </p>
              </div>

              {/* Tagline */}
              <div className="text-center py-4">
                <p
                  className="text-4xl lg:text-5xl font-black uppercase tracking-tight text-white"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Build different.{" "}
                  <span style={{ color: "oklch(var(--orange-bright))" }}>
                    Build altered.
                  </span>
                </p>
              </div>

              {/* Divider */}
              <div
                className="h-px w-full"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />

              {/* Location & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Location */}
                <div
                  className="flex flex-col gap-3 p-5 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "oklch(var(--orange) / 0.2)" }}
                    >
                      <MapPin
                        size={16}
                        style={{ color: "oklch(var(--orange-bright))" }}
                      />
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "oklch(var(--orange-bright))" }}
                    >
                      Location
                    </span>
                  </div>
                  <p className="text-white font-semibold text-base">
                    Wenatchee, WA
                  </p>
                </div>

                {/* Contact */}
                <div
                  className="flex flex-col gap-3 p-5 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "oklch(var(--orange) / 0.2)" }}
                    >
                      <Mail
                        size={16}
                        style={{ color: "oklch(var(--orange-bright))" }}
                      />
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "oklch(var(--orange-bright))" }}
                    >
                      Contact
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href="https://instagram.com/mr.altered"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-white/85 hover:text-white transition-colors text-sm"
                    >
                      <Instagram
                        size={14}
                        style={{ color: "oklch(var(--orange-bright))" }}
                      />
                      @mr.altered
                    </a>
                    <a
                      href="tel:5096791389"
                      className="flex items-center gap-2 text-white/85 hover:text-white transition-colors text-sm"
                    >
                      <Phone
                        size={14}
                        style={{ color: "oklch(var(--orange-bright))" }}
                      />
                      509-679-1389
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div
              className="px-8 lg:px-12 py-5 text-center text-xs"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              © 2026 Altered Imports · Built with ❤️ using{" "}
              <a
                href="https://caffeine.ai"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "oklch(var(--orange-bright))" }}
                className="hover:underline"
              >
                caffeine.ai
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
