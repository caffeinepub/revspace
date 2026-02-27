import { type ReactNode, useState } from "react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  Home,
  Compass,
  Plus,
  Bell,
  User,
  Car,
  Calendar,
  ShoppingBag,
  Users,
  MessageCircle,
  Settings,
  Trophy,
  Store,
  Menu,
  X,
  Film,
} from "lucide-react";
import { useMyNotifications } from "../hooks/useQueries";

interface LayoutProps {
  children: ReactNode;
}

const ALL_NAV_ITEMS = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/reels", label: "Reels", icon: Film },
  { to: "/garage", label: "My Garage", icon: Car },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { to: "/clubs", label: "Car Clubs", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/shop", label: "Shop", icon: Store },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

function MobileNav() {
  const [open, setOpen] = useState(false);
  const matchRoute = useMatchRoute();
  const { data: notifications } = useMyNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

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
          width: "72vw",
          maxWidth: 280,
          background: "oklch(var(--carbon))",
          borderRight: "1px solid oklch(var(--border))",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 mb-2">
          <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
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
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={22} style={{ color: "oklch(var(--steel-light))" }} />
          </button>
        </div>

        {/* Create Post */}
        <Link to="/create" onClick={() => setOpen(false)} className="mx-4 mb-4">
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

        {/* All 13 nav links */}
        <div className="flex flex-col gap-0.5 px-2 overflow-y-auto flex-1">
          {ALL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = matchRoute({ to: item.to, fuzzy: item.to !== "/" }) !== false;
            return (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
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
                  </div>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="px-4 py-4 text-[11px]" style={{ color: "oklch(var(--steel))" }}>
          <p>© 2026 RevSpace</p>
          <p>
            Built with ❤️ using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "oklch(var(--orange))" }}
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

function Sidebar() {
  const matchRoute = useMatchRoute();
  const { data: notifications } = useMyNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

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

      <div className="flex flex-col gap-0.5">
        {ALL_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = matchRoute({ to: item.to, fuzzy: item.to !== "/" }) !== false;

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
                </div>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 px-3 text-[11px] text-steel">
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

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
