import { useState } from "react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { LoginScreen } from "./components/LoginScreen";
import { Layout } from "./components/Layout";
import { FeedPage } from "./pages/FeedPage";
import { ExplorePage } from "./pages/ExplorePage";
import { ReelsPage } from "./pages/ReelsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { GaragePage } from "./pages/GaragePage";
import { EventsPage } from "./pages/EventsPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { ClubsPage } from "./pages/ClubsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { CreatePostPage } from "./pages/CreatePostPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ShopPage } from "./pages/ShopPage";

const LoadingSpinner = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ background: "oklch(var(--carbon))" }}
  >
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "oklch(var(--orange))" }}
      >
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
      <p className="text-steel text-sm">Loading RevSpace...</p>
    </div>
  </div>
);

// AuthGate: always shows login intro on every page load/refresh, even for returning users.
// "loggedInThisLoad" is a plain module-level variable — it resets to false on every
// full page load (navigation, refresh, new tab), so the login screen is always shown first.
let loggedInThisLoad = false;

function AuthGate({ children }: { children: React.ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const [passedIntro, setPassedIntro] = useState(false);

  if (isInitializing) {
    return <LoadingSpinner />;
  }

  // Show login intro if the user hasn't clicked "Login to Site" in this page load
  if (!passedIntro || !loggedInThisLoad || !identity) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          loggedInThisLoad = true;
          setPassedIntro(true);
        }}
      />
    );
  }

  return <>{children}</>;
}

// Root layout with auth guard
function RootLayout() {
  return (
    <AuthGate>
      <Layout>
        <Outlet />
      </Layout>
    </AuthGate>
  );
}

// Reels is full-screen, no layout wrapper
function ReelsLayout() {
  return (
    <AuthGate>
      <ReelsPage />
    </AuthGate>
  );
}

// Route definitions
const rootRoute = createRootRoute({
  component: RootLayout,
});

const reelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reels",
  component: ReelsLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: FeedPage,
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  component: ExplorePage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const garageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/garage",
  component: GaragePage,
});

const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events",
  component: EventsPage,
});

const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marketplace",
  component: MarketplacePage,
});

const clubsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clubs",
  component: ClubsPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: NotificationsPage,
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  validateSearch: (search: Record<string, unknown>) => ({
    recipient: typeof search.recipient === "string" ? search.recipient : undefined,
  }),
  component: MessagesPage,
});

const createRoute_ = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create",
  component: CreatePostPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const userProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$userId",
  component: function UserProfileRouteComponent() {
    const { userId } = userProfileRoute.useParams();
    return <UserProfilePage userId={userId} />;
  },
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/leaderboard",
  component: LeaderboardPage,
});

const shopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shop",
  component: ShopPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  reelsRoute,
  exploreRoute,
  profileRoute,
  garageRoute,
  eventsRoute,
  marketplaceRoute,
  clubsRoute,
  notificationsRoute,
  messagesRoute,
  createRoute_,
  settingsRoute,
  userProfileRoute,
  leaderboardRoute,
  shopRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" theme="dark" />
    </>
  );
}
