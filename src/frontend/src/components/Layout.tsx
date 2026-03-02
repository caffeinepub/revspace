import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Calendar,
  Car,
  Clapperboard,
  Coins,
  Compass,
  Film,
  Gamepad2,
  Home,
  Info,
  LayoutGrid,
  Menu,
  MessageCircle,
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
import { type ReactNode, useEffect, useState } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useMyNotifications } from "../hooks/useQueries";
import { getBalance } from "../lib/revbucks";

interface LayoutProps {
  children: ReactNode;
}

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
    items: [{ to: "/game", label: "Rev Racing", icon: Gamepad2 }],
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

function MobileNav({
  unreadCount,
  unreadMessageCount,
}: {
  unreadCount: number;
  unreadMessageCount: number;
}) {
  const [open, setOpen] = useState(false);
  const matchRoute = useMatchRoute();
  const isAdmin = useIsAdmin();
  const rbBalance = useRevBucksBalance();

  return (
    <>
      {/* Top bar on mobile */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 md:hidden"
        style={{
          background: "oklch(var(--carbon) / 0.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid oklch(var(--border))",
        }}
      >
        <Link to="/" className="flex items-center gap-2">
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
          {/* Notification badge */}
          <Link to="/notifications" className="relative">
            <Bell size={22} style={{ color: "oklch(var(--steel-light))" }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                style={{ background: "oklch(var(--ember))" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          {/* Admin shortcut — only shown to admins */}
          {isAdmin && (
            <Link to="/admin" aria-label="Admin Panel">
              <ShieldCheck size={22} style={{ color: "oklch(0.8 0.22 75)" }} />
            </Link>
          )}
          {/* Hamburger */}
          <button
            onClick={() => setOpen(true)}
            type="button"
            className="p-1"
            aria-label="Open menu"
          >
            <Menu size={26} style={{ color: "oklch(var(--foreground))" }} />
          </button>
        </div>
      </header>

      {/* Mobile ad banner strip below header */}
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
            src="/assets/uploads/Black-and-White-Graffiti-Urban-Clothing-Brand-Logo-1.png"
            alt="JDM Store - Shop Parts & Accessories"
            className="h-8 object-contain"
            style={{ maxWidth: 120, background: "#000", borderRadius: 4 }}
          />
          <span
            className="text-xs font-semibold tracking-wide"
            style={{ color: "oklch(var(--orange))" }}
          >
            Shop Parts &amp; Accessories →
          </span>
        </a>
      </div>

      {/* Drawer overlay */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[100] md:hidden w-full h-full border-0 p-0 cursor-default"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          aria-label="Close menu"
          style={{ background: "rgba(0,0,0,0.6)" }}
        />
      )}

      {/* Drawer panel */}
      <div
        className="fixed top-0 left-0 h-full z-[101] flex flex-col md:hidden transition-transform duration-300"
        style={{
          width: "80vw",
          maxWidth: 300,
          background: "oklch(var(--carbon))",
          borderRight: "1px solid oklch(var(--border))",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(var(--orange))" }}
            >
              <Car size={16} className="text-carbon" />
            </div>
            <span className="revspace-logo text-xl text-foreground">
              Rev<span style={{ color: "oklch(var(--orange))" }}>Space</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} style={{ color: "oklch(var(--steel-light))" }} />
          </button>
        </div>

        {/* Create Post */}
        <Link
          to="/create"
          onClick={() => setOpen(false)}
          className="mx-4 mb-2 shrink-0"
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
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

        {/* All nav links — takes all remaining height and scrolls */}
        <nav
          className="flex flex-col px-2 overflow-y-auto"
          style={{ flex: "1 1 0", minHeight: 0, paddingBottom: 8 }}
        >
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
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                  >
                    <div className={`sidebar-item ${isActive ? "active" : ""}`}>
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
              {/* Admin Panel — appended inside the Info group for admins */}
              {group.label === "Info" && isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)}>
                  <div
                    className={`sidebar-item ${matchRoute({ to: "/admin" }) !== false ? "active" : ""}`}
                    style={{ color: "oklch(0.8 0.22 75)" }}
                  >
                    <ShieldCheck size={18} />
                    <span>Admin Panel</span>
                  </div>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Ad banner — shrinks but never pushes nav off screen */}
        <div
          className="px-3 py-2 shrink-0"
          style={{ borderTop: "1px solid oklch(var(--border))" }}
        >
          <a
            href="https://ebay.com/inf/revreel?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=5339143418&toolid=80008&mkevt=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg overflow-hidden px-2 py-1.5 transition-opacity hover:opacity-80"
            style={{
              border: "1px solid oklch(var(--border))",
              background: "#000",
            }}
          >
            <img
              src="/assets/uploads/Black-and-White-Graffiti-Urban-Clothing-Brand-Logo-1.png"
              alt="JDM Store"
              style={{ height: 28, width: "auto", objectFit: "contain" }}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: "oklch(var(--orange))" }}
            >
              Shop Parts & Accessories →
            </span>
          </a>
        </div>
      </div>
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
  const isAdmin = useIsAdmin();
  const rbBalance = useRevBucksBalance();

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

              return (
                <Link key={item.to} to={item.to}>
                  <div className={`sidebar-item ${isActive ? "active" : ""}`}>
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
            {/* Admin Panel — appended inside the Info group for admins */}
            {group.label === "Info" && isAdmin && (
              <Link to="/admin">
                <div
                  className={`sidebar-item ${matchRoute({ to: "/admin" }) !== false ? "active" : ""}`}
                  style={{ color: "oklch(0.8 0.22 75)" }}
                >
                  <ShieldCheck size={18} />
                  <span>Admin Panel</span>
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
          Sponsored
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
            src="/assets/uploads/Black-and-White-Graffiti-Urban-Clothing-Brand-Logo-1.png"
            alt="JDM Store - Parts and Accessories"
            className="w-full object-contain"
            style={{ height: 90, background: "#000" }}
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
        src="/assets/uploads/z86GgQCwZ7Hm4-1.png"
        alt="Bull Boost Performance"
        style={{ height: 36, maxWidth: 200, objectFit: "contain" }}
      />
      <span
        className="text-xs font-semibold tracking-wider uppercase hidden sm:inline"
        style={{ color: "oklch(var(--orange-bright))", letterSpacing: "0.1em" }}
      >
        bullboostperformance.com →
      </span>
    </a>
  );
}

export function Layout({ children }: LayoutProps) {
  // Single shared notifications subscription for both Sidebar and MobileNav
  const { data: notifications } = useMyNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  // Unread message count — derived from unread notifications of type "message"
  const unreadMessageCount =
    notifications?.filter((n) => !n.isRead && n.notifType === "message")
      .length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        unreadCount={unreadCount}
        unreadMessageCount={unreadMessageCount}
      />
      <MobileNav
        unreadCount={unreadCount}
        unreadMessageCount={unreadMessageCount}
      />
      {/* paddingBottom clears the fixed BullBoost banner (52px) + safe-area + breathing room */}
      <main
        className="main-content"
        style={{
          paddingBottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {children}
      </main>
    </div>
  );
}
