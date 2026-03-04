import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  BookOpen,
  Calendar,
  Car,
  Clapperboard,
  Coins,
  Compass,
  Film,
  Gamepad2,
  Gauge,
  GaugeCircle,
  Home,
  Info,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Swords,
  Trophy,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useNotificationPoller } from "../hooks/useNotificationPoller";
import {
  registerServiceWorker,
  requestNotificationPermission,
} from "../hooks/usePushNotifications";
import { getBalance } from "../lib/revbucks";

interface LayoutProps {
  children: ReactNode;
}

// ─── Notification Permission Banner ──────────────────────────────────────────
function NotificationPromptBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only prompt if permission hasn't been asked yet
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    const wasDismissed = localStorage.getItem("rs_notif_prompt_dismissed");
    if (wasDismissed) return;
    // Small delay so we don't jump the user on page load
    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!show || dismissed) return null;

  const handleEnable = async () => {
    setShow(false);
    setDismissed(true);
    const result = await requestNotificationPermission();
    if (result === "granted") {
      await registerServiceWorker();
    }
    localStorage.setItem("rs_notif_prompt_dismissed", "1");
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("rs_notif_prompt_dismissed", "1");
  };

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed top-0 left-0 right-0 z-[300] md:left-auto md:right-4 md:top-4 md:max-w-sm"
      style={{
        background: "oklch(0.16 0.03 220)",
        borderBottom: "1px solid oklch(var(--orange) / 0.4)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 md:rounded-xl md:border md:border-orange/40">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "oklch(var(--orange) / 0.15)" }}
        >
          <Bell size={16} style={{ color: "oklch(var(--orange))" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">
            Enable notifications
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Get alerts for chats, likes &amp; comments
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleEnable}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
            }}
            data-ocid="notifications.enable.primary_button"
          >
            Enable
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "oklch(var(--steel))" }}
            data-ocid="notifications.enable.close_button"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const OWNER_PRINCIPAL =
  "lxabr-wc334-2wlj6-karlm-6ez4a-sahnr-7s7ge-2onmm-u4ht3-pue6x-jae";

const NAV_GROUPS = [
  {
    label: "Discover",
    items: [
      { to: "/", label: "Feed", icon: Home },
      { to: "/explore", label: "Explore", icon: Compass },
      { to: "/reels", label: "Reels", icon: Film },
    ],
  },
  {
    label: "Models",
    items: [
      { to: "/model-reels", label: "Model Reels", icon: Clapperboard },
      { to: "/model-gallery", label: "Model Gallery", icon: LayoutGrid },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/events", label: "Events", icon: Calendar },
      { to: "/clubs", label: "Car Clubs", icon: Users },
      { to: "/buildbattle", label: "Build Battle", icon: Swords },
      { to: "/mechanics", label: "Mechanics", icon: Wrench },
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
      { to: "/shop", label: "Performance Shop", icon: Store },
      { to: "/featured", label: "Featured Car", icon: Star },
    ],
  },
  {
    label: "RevBucks",
    items: [{ to: "/revbucks", label: "RevBucks", icon: Coins }],
  },
  {
    label: "My Space",
    items: [
      { to: "/garage", label: "My Garage", icon: Car },
      { to: "/profile", label: "Profile", icon: User },
    ],
  },
  {
    label: "Pro Perks",
    items: [
      { to: "/game", label: "Rev Racing", icon: Gamepad2 },
      { to: "/track-ready", label: "Track Ready", icon: GaugeCircle },
      { to: "/dyno-os", label: "DynoOS", icon: Gauge },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/messages", label: "Messages", icon: MessageCircle },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Info",
    items: [
      { to: "/guide", label: "Guide", icon: BookOpen },
      { to: "/about", label: "About RevSpace", icon: Info },
      { to: "/admin", label: "Admin Panel", icon: ShieldCheck },
    ],
  },
] as const;

function useIsAdmin(): boolean {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();
  const storageKey = principal ? `revspace_admin_${principal}` : null;

  const [isAdmin, setIsAdmin] = useState(false);

  // Read from localStorage immediately when we know who the user is
  useEffect(() => {
    if (!storageKey) return;
    if (localStorage.getItem(storageKey) === "1") {
      setIsAdmin(true);
    }
  }, [storageKey]);

  // Verify from backend and update localStorage cache
  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .isCallerAdmin()
      .then((result) => {
        setIsAdmin(result);
        if (storageKey) {
          if (result) {
            localStorage.setItem(storageKey, "1");
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      })
      .catch(() => setIsAdmin(false));
  }, [actor, isFetching, storageKey]);

  return isAdmin;
}

function useRevBucksBalance(): number {
  const { identity } = useInternetIdentity();
  const [balance, setBalance] = useState(0);
  useEffect(() => {
    const principal = identity?.getPrincipal().toText();
    if (!principal) return;
    setBalance(getBalance(principal));
    // Poll every 30s — frequent polling was causing UI freezes
    const id = setInterval(() => setBalance(getBalance(principal)), 30000);
    return () => clearInterval(id);
  }, [identity]);
  return balance;
}

// Bottom tab bar items
const BOTTOM_TABS = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/notifications", label: "Alerts", icon: Bell },
] as const;

function MobileNav({
  unreadCount,
  unreadMessageCount,
}: {
  unreadCount: number;
  unreadMessageCount: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const matchRoute = useMatchRoute();
  const isAdmin = useIsAdmin();
  const rbBalance = useRevBucksBalance();
  const { identity: mobileIdentity } = useInternetIdentity();
  const isOwner = mobileIdentity?.getPrincipal().toText() === OWNER_PRINCIPAL;
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  return (
    <>
      {/* ── Top header bar (mobile only) ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 md:hidden"
        style={{
          background: "oklch(var(--carbon) / 0.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid oklch(var(--border))",
        }}
      >
        <Link
          to="/"
          className="flex items-center gap-2"
          data-ocid="nav.feed.link"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "oklch(var(--orange))" }}
          >
            <Car size={15} className="text-carbon" />
          </div>
          <span className="revspace-logo text-xl text-foreground">
            Rev<span style={{ color: "oklch(var(--orange))" }}>Space</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Admin shortcut */}
          <Link to="/admin" aria-label="Admin Panel" data-ocid="nav.admin.link">
            <ShieldCheck
              size={22}
              style={{
                color: isAdmin
                  ? "oklch(0.8 0.22 75)"
                  : "oklch(var(--steel-light))",
              }}
            />
          </Link>
        </div>
      </header>

      {/* ── Mobile RevSpace Parts ad strip below header ── */}
      <div
        className="fixed top-[53px] left-0 right-0 z-40 md:hidden"
        style={{
          background: "oklch(var(--carbon) / 0.98)",
          borderBottom: "1px solid oklch(var(--border))",
        }}
      >
        <a
          href="https://ebay.com/inf/revreel?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=5339143418&toolid=80008&mkevt=1"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-1.5"
        >
          <img
            src="/assets/generated/revspace-parts-banner.dim_400x90.png"
            alt="RevSpace Parts - Shop JDM & Performance Parts"
            className="h-8 object-contain"
            style={{ maxWidth: 200, borderRadius: 4 }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span
            className="text-xs font-semibold tracking-wide"
            style={{ color: "oklch(var(--orange))" }}
          >
            RevSpace Parts →
          </span>
        </a>
      </div>

      {/* ── Bottom tab bar (mobile only) ── */}
      <nav
        className={`fixed left-0 right-0 z-[150] md:hidden ${drawerOpen ? "hidden" : "flex"}`}
        style={{
          bottom: "52px",
          background: "oklch(var(--carbon) / 0.98)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid oklch(var(--border))",
        }}
        aria-label="Bottom navigation"
      >
        {/* First 4 tabs: direct nav links */}
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            matchRoute({ to: tab.to, fuzzy: tab.to !== "/" }) !== false;
          const isMsgs = tab.to === "/messages";
          const isAlerts = tab.to === "/notifications";
          const badge = isMsgs
            ? unreadMessageCount
            : isAlerts
              ? unreadCount
              : 0;

          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
              style={{ minWidth: 0 }}
              data-ocid={`nav.${tab.label.toLowerCase()}.tab`}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{
                    color: isActive
                      ? "oklch(var(--orange))"
                      : "oklch(var(--steel-light))",
                    transition: "color 0.15s ease",
                  }}
                />
                {badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1"
                    style={{
                      background: isAlerts
                        ? "oklch(var(--ember))"
                        : "oklch(0.58 0.22 27)",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[9px] font-semibold tracking-wide uppercase"
                style={{
                  color: isActive
                    ? "oklch(var(--orange))"
                    : "oklch(var(--steel))",
                  transition: "color 0.15s ease",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* "More" tab — opens pull-up drawer */}
        <button
          type="button"
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
          onClick={() => setDrawerOpen(true)}
          aria-label="More navigation"
          data-ocid="nav.more.button"
          style={{ minWidth: 0 }}
        >
          <MoreHorizontal
            size={22}
            strokeWidth={1.8}
            style={{
              color: drawerOpen
                ? "oklch(var(--orange))"
                : "oklch(var(--steel-light))",
              transition: "color 0.15s ease",
            }}
          />
          <span
            className="text-[9px] font-semibold tracking-wide uppercase"
            style={{
              color: drawerOpen
                ? "oklch(var(--orange))"
                : "oklch(var(--steel))",
              transition: "color 0.15s ease",
            }}
          >
            More
          </span>
        </button>
      </nav>

      {/* ── Full-screen overlay nav ── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer"
            ref={drawerRef}
            className="fixed inset-0 z-[210] flex flex-col md:hidden overflow-hidden"
            style={{
              background: "rgba(0, 0, 0, 0.88)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-ocid="nav.more.sheet"
          >
            {/* Header row */}
            <div className="flex items-center justify-between px-5 pt-12 pb-4 shrink-0">
              <Link
                to="/"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "oklch(var(--orange))" }}
                >
                  <Car size={16} className="text-carbon" />
                </div>
                <span className="revspace-logo text-xl text-white">
                  Rev
                  <span style={{ color: "oklch(var(--orange))" }}>Space</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                data-ocid="nav.more.close_button"
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Create Post CTA */}
            <div className="px-5 pb-4 shrink-0">
              <Link
                to="/create"
                onClick={() => setDrawerOpen(false)}
                data-ocid="nav.create.primary_button"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold"
                style={{
                  background: "oklch(var(--orange))",
                  color: "oklch(var(--carbon))",
                  boxShadow: "0 0 32px oklch(var(--orange) / 0.5)",
                }}
              >
                <Plus size={18} strokeWidth={2.5} />
                Create Post
              </Link>
            </div>

            {/* Scrollable nav groups */}
            <nav
              className="flex-1 overflow-y-auto px-4"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}
            >
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="mb-2">
                  <p
                    className="px-2 pt-3 pb-2 text-[10px] uppercase tracking-widest font-bold"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        matchRoute({
                          to: item.to,
                          fuzzy: item.to !== "/",
                        }) !== false;
                      const isAdminItem = item.label === "Admin Panel";
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setDrawerOpen(false)}
                          data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "-")}.link`}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-95"
                          style={{
                            background: isActive
                              ? "oklch(var(--orange) / 0.2)"
                              : "rgba(255,255,255,0.07)",
                            border: isActive
                              ? "1px solid oklch(var(--orange) / 0.5)"
                              : "1px solid rgba(255,255,255,0.08)",
                            color: isAdminItem
                              ? "oklch(0.85 0.22 75)"
                              : isActive
                                ? "oklch(var(--orange))"
                                : "rgba(255,255,255,0.9)",
                          }}
                        >
                          <div className="relative shrink-0">
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                            {item.label === "Notifications" &&
                              unreadCount > 0 && (
                                <span
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                                  style={{ background: "oklch(var(--ember))" }}
                                >
                                  {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                              )}
                            {item.label === "Messages" &&
                              unreadMessageCount > 0 && (
                                <span
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                                  style={{ background: "oklch(0.58 0.22 27)" }}
                                >
                                  {unreadMessageCount > 9
                                    ? "9+"
                                    : unreadMessageCount}
                                </span>
                              )}
                          </div>
                          <span className="text-xs font-semibold truncate flex-1">
                            {item.label}
                          </span>
                          {item.label === "RevBucks" && (
                            <span
                              className="text-[9px] font-bold px-1 py-0.5 rounded-full shrink-0"
                              style={{
                                background: "oklch(var(--orange) / 0.2)",
                                color: "oklch(var(--orange-bright))",
                              }}
                            >
                              ⚡{rbBalance}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                    {/* Owner-only: Creator Profile link injected into My Space */}
                    {group.label === "My Space" && isOwner && (
                      <Link
                        to="/creator"
                        onClick={() => setDrawerOpen(false)}
                        data-ocid="nav.creator-profile.link"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-95"
                        style={{
                          background:
                            matchRoute({ to: "/creator", fuzzy: false }) !==
                            false
                              ? "oklch(var(--orange) / 0.2)"
                              : "rgba(255,255,255,0.07)",
                          border:
                            matchRoute({ to: "/creator", fuzzy: false }) !==
                            false
                              ? "1px solid oklch(var(--orange) / 0.5)"
                              : "1px solid rgba(255,255,255,0.08)",
                          color:
                            matchRoute({ to: "/creator", fuzzy: false }) !==
                            false
                              ? "oklch(var(--orange))"
                              : "rgba(255,255,255,0.9)",
                        }}
                      >
                        <Star size={18} strokeWidth={2} />
                        <span className="text-xs font-semibold truncate flex-1">
                          Creator Profile
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Sidebar({
  unreadCount,
  unreadMessageCount,
}: {
  unreadCount: number;
  unreadMessageCount: number;
}) {
  const matchRoute = useMatchRoute();
  const rbBalance = useRevBucksBalance();
  const { identity: sidebarIdentity } = useInternetIdentity();
  const isOwner = sidebarIdentity?.getPrincipal().toText() === OWNER_PRINCIPAL;

  return (
    <aside className="sidebar-nav">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 px-3 py-4 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "oklch(var(--orange))" }}
        >
          <Car size={18} className="text-carbon" />
        </div>
        <span className="revspace-logo text-2xl text-foreground">
          Rev<span className="text-orange">Space</span>
        </span>
      </Link>

      {/* Create Post button */}
      <Link to="/create" className="mb-4">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: "oklch(var(--orange))",
            color: "oklch(var(--carbon))",
            boxShadow: "0 0 20px oklch(var(--orange) / 0.3)",
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          Create Post
        </div>
      </Link>

      <div className="flex flex-col">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p
              className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-widest font-semibold"
              style={{ color: "oklch(var(--steel))" }}
            >
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                matchRoute({ to: item.to, fuzzy: item.to !== "/" }) !== false;
              const isAdminItem = item.label === "Admin Panel";

              return (
                <Link key={item.to} to={item.to}>
                  <div
                    className={`sidebar-item ${isActive ? "active" : ""}`}
                    style={
                      isAdminItem ? { color: "oklch(0.8 0.22 75)" } : undefined
                    }
                  >
                    <div className="relative">
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                          style={{ background: "oklch(var(--ember))" }}
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                      {item.label === "Messages" && unreadMessageCount > 0 && (
                        <span
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                          style={{ background: "oklch(0.58 0.22 27)" }}
                        >
                          {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                        </span>
                      )}
                    </div>
                    <span className="flex-1">{item.label}</span>
                    {item.label === "RevBucks" && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "oklch(var(--orange) / 0.15)",
                          color: "oklch(var(--orange-bright))",
                          border: "1px solid oklch(var(--orange) / 0.3)",
                        }}
                      >
                        ⚡{rbBalance}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
            {/* Owner-only: Creator Profile link in My Space */}
            {group.label === "My Space" && isOwner && (
              <Link to="/creator">
                <div
                  className={`sidebar-item ${matchRoute({ to: "/creator", fuzzy: false }) !== false ? "active" : ""}`}
                >
                  <Star size={18} strokeWidth={2} />
                  <span className="flex-1">Creator Profile</span>
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Ad banner */}
      <div className="mt-auto pt-4 px-3 pb-2">
        <p
          className="text-[10px] uppercase tracking-wider mb-1"
          style={{ color: "oklch(var(--steel))" }}
        >
          RevSpace Parts
        </p>
        <a
          href="https://ebay.com/inf/revreel?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=5339143418&toolid=80008&mkevt=1"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg overflow-hidden transition-all duration-200 hover:opacity-90 hover:scale-[1.02] cursor-pointer"
          style={{
            border: "1px solid oklch(var(--border))",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <img
            src="/assets/generated/revspace-parts-banner.dim_400x90.png"
            alt="RevSpace Parts - Shop JDM & Performance Parts"
            className="w-full object-contain"
            style={{ height: 90 }}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const parent = img.parentElement;
              if (parent) {
                parent.style.display = "flex";
                parent.style.alignItems = "center";
                parent.style.justifyContent = "center";
                parent.style.height = "90px";
                parent.style.background = "#111";
                parent.innerHTML =
                  '<span style="color: oklch(var(--orange)); font-size: 12px; font-weight: 600;">RevSpace Parts →</span>';
              }
            }}
          />
        </a>
      </div>

      {/* Footer */}
      <div className="pt-2 px-3 text-[11px] text-steel">
        <p>© 2026 RevSpace</p>
        <p>
          Built with ❤️ using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </aside>
  );
}

// ─── BullBoostBanner ─────────────────────────────────────────────────────────
export function BullBoostBanner() {
  return (
    <a
      href="https://bullboostperformance.com/?ref=xprbexxu"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 px-4 py-2 transition-opacity duration-200 hover:opacity-90 active:opacity-80"
      style={{
        background:
          "linear-gradient(90deg, #000 0%, #0a0a0a 40%, #111 60%, #000 100%)",
        borderTop: "1px solid oklch(var(--orange) / 0.4)",
        minHeight: 52,
        boxShadow:
          "0 -4px 24px rgba(0,0,0,0.6), 0 -1px 0 oklch(var(--orange) / 0.2)",
      }}
    >
      <img
        src="/assets/generated/bull-boost-banner.dim_600x80.png"
        alt="Bull Boost Performance"
        style={{ height: 36, maxWidth: 240, objectFit: "contain" }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <span
        className="text-xs font-semibold tracking-wider uppercase"
        style={{ color: "oklch(var(--orange-bright))", letterSpacing: "0.1em" }}
      >
        Bull Boost Performance →
      </span>
    </a>
  );
}

export function Layout({ children }: LayoutProps) {
  const matchRoute = useMatchRoute();
  const { identity } = useInternetIdentity();

  // Detect if user is currently on /messages — suppress message notification badges while chatting
  const isOnMessagesPage = matchRoute({ to: "/messages" }) !== false;

  // Single shared notifications subscription for both Sidebar and MobileNav.
  // useNotificationPoller wraps useMyNotifications and fires native phone
  // notifications for each newly arrived unread notification.
  const { data: notifications } = useNotificationPoller();

  // Register service worker + request notification permission once after login
  const swRegistered = useRef(false);
  useEffect(() => {
    if (!identity || swRegistered.current) return;
    swRegistered.current = true;

    // Register SW first (non-blocking)
    void registerServiceWorker();

    // If permission was already granted, no prompt needed — SW is enough
    // The banner handles the "default" case with a user-friendly prompt
  }, [identity]);

  // When actively chatting, exclude message-type notifications from badge counts
  const unreadCount = (notifications ?? []).filter(
    (n) => !n.isRead && (isOnMessagesPage ? n.notifType !== "message" : true),
  ).length;

  // Unread message count — derived from unread notifications of type "message"
  const unreadMessageCount =
    notifications?.filter((n) => !n.isRead && n.notifType === "message")
      .length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Native notification permission prompt banner */}
      <AnimatePresence>
        {identity && <NotificationPromptBanner key="notif-banner" />}
      </AnimatePresence>

      <Sidebar
        unreadCount={unreadCount}
        unreadMessageCount={unreadMessageCount}
      />
      <MobileNav
        unreadCount={unreadCount}
        unreadMessageCount={unreadMessageCount}
      />
      {/* paddingBottom clears the fixed BullBoost banner (52px) + bottom tab bar (56px) + safe-area */}
      <main
        className="main-content"
        style={{
          paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {children}
      </main>
    </div>
  );
}
