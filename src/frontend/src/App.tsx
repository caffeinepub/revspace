import { Toaster } from "@/components/ui/sonner";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { Outlet, createRootRoute, createRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import { toast } from "sonner";
import { BullBoostBanner, Layout } from "./components/Layout";
import { LoginScreen } from "./components/LoginScreen";
import { useDeployGuard } from "./hooks/useDeployGuard";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { setFriendOfCreator } from "./lib/friendBadge";
import { setUserPro } from "./lib/pro";

const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const BuildBattlePage = lazy(() =>
  import("./pages/BuildBattlePage").then((m) => ({
    default: m.BuildBattlePage,
  })),
);
const ClubsPage = lazy(() =>
  import("./pages/ClubsPage").then((m) => ({ default: m.ClubsPage })),
);
const CreatePostPage = lazy(() =>
  import("./pages/CreatePostPage").then((m) => ({ default: m.CreatePostPage })),
);
const CreatorPage = lazy(() =>
  import("./pages/CreatorPage").then((m) => ({ default: m.CreatorPage })),
);
const EventsPage = lazy(() =>
  import("./pages/EventsPage").then((m) => ({ default: m.EventsPage })),
);
const ExplorePage = lazy(() =>
  import("./pages/ExplorePage").then((m) => ({ default: m.ExplorePage })),
);
const FeaturedCarPage = lazy(() =>
  import("./pages/FeaturedCarPage").then((m) => ({
    default: m.FeaturedCarPage,
  })),
);
const FeedPage = lazy(() =>
  import("./pages/FeedPage").then((m) => ({ default: m.FeedPage })),
);
const GamePage = lazy(() =>
  import("./pages/GamePage").then((m) => ({ default: m.GamePage })),
);
const GaragePage = lazy(() =>
  import("./pages/GaragePage").then((m) => ({ default: m.GaragePage })),
);
const GuidePage = lazy(() =>
  import("./pages/GuidePage").then((m) => ({ default: m.GuidePage })),
);
const LeaderboardPage = lazy(() =>
  import("./pages/LeaderboardPage").then((m) => ({
    default: m.LeaderboardPage,
  })),
);
const MarketplacePage = lazy(() =>
  import("./pages/MarketplacePage").then((m) => ({
    default: m.MarketplacePage,
  })),
);
const MechanicsPage = lazy(() =>
  import("./pages/MechanicsPage").then((m) => ({ default: m.MechanicsPage })),
);
const MessagesPage = lazy(() =>
  import("./pages/MessagesPage").then((m) => ({ default: m.MessagesPage })),
);
const ModelGalleryPage = lazy(() =>
  import("./pages/ModelGalleryPage").then((m) => ({
    default: m.ModelGalleryPage,
  })),
);
const ModelReelsPage = lazy(() =>
  import("./pages/ModelReelsPage").then((m) => ({
    default: m.ModelReelsPage,
  })),
);
const NotificationsPage = lazy(() =>
  import("./pages/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const ProPage = lazy(() =>
  import("./pages/ProPage").then((m) => ({ default: m.ProPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const ReelsPage = lazy(() =>
  import("./pages/ReelsPage").then((m) => ({ default: m.ReelsPage })),
);
const RevBucksPage = lazy(() =>
  import("./pages/RevBucksPage").then((m) => ({ default: m.RevBucksPage })),
);
const RevSpaceInfoPage = lazy(() =>
  import("./pages/RevSpaceInfoPage").then((m) => ({
    default: m.RevSpaceInfoPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const ShopPage = lazy(() =>
  import("./pages/ShopPage").then((m) => ({ default: m.ShopPage })),
);
const TrackReadyPage = lazy(() =>
  import("./pages/TrackReadyPage").then((m) => ({ default: m.TrackReadyPage })),
);
const DynoOSPage = lazy(() =>
  import("./pages/DynoOSPage").then((m) => ({ default: m.DynoOSPage })),
);
const UserProfilePage = lazy(() =>
  import("./pages/UserProfilePage").then((m) => ({
    default: m.UserProfilePage,
  })),
);

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div
      className="w-8 h-8 border-2 border-white/20 rounded-full animate-spin"
      style={{ borderTopColor: "oklch(var(--orange))" }}
    />
  </div>
);

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
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Layout>
    </AuthGate>
  );
}

// Reels is full-screen, no layout wrapper
function ReelsLayout() {
  return (
    <AuthGate>
      <Suspense fallback={<PageLoader />}>
        <ReelsPage />
      </Suspense>
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
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <FeedPage />
    </Suspense>
  ),
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ExplorePage />
    </Suspense>
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ProfilePage />
    </Suspense>
  ),
});

const garageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/garage",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <GaragePage />
    </Suspense>
  ),
});

const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <EventsPage />
    </Suspense>
  ),
});

const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marketplace",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <MarketplacePage />
    </Suspense>
  ),
});

const clubsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clubs",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ClubsPage />
    </Suspense>
  ),
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <NotificationsPage />
    </Suspense>
  ),
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  validateSearch: (search: Record<string, unknown>) => ({
    recipient:
      typeof search.recipient === "string" ? search.recipient : undefined,
  }),
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <MessagesPage />
    </Suspense>
  ),
});

const createRoute_ = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <CreatePostPage />
    </Suspense>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <SettingsPage />
    </Suspense>
  ),
});

const userProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$userId",
  component: function UserProfileRouteComponent() {
    const { userId } = userProfileRoute.useParams();
    return (
      <Suspense fallback={<PageLoader />}>
        <UserProfilePage userId={userId} />
      </Suspense>
    );
  },
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/leaderboard",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <LeaderboardPage />
    </Suspense>
  ),
});

const shopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shop",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ShopPage />
    </Suspense>
  ),
});

const mechanicsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mechanics",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <MechanicsPage />
    </Suspense>
  ),
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <RevSpaceInfoPage />
    </Suspense>
  ),
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <AdminPage />
    </Suspense>
  ),
});

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <GuidePage />
    </Suspense>
  ),
});

const proRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pro",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ProPage />
    </Suspense>
  ),
});

const revbucksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/revbucks",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <RevBucksPage />
    </Suspense>
  ),
});

const featuredCarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/featured",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <FeaturedCarPage />
    </Suspense>
  ),
});

const buildBattleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buildbattle",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <BuildBattlePage />
    </Suspense>
  ),
});

const modelReelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/model-reels",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ModelReelsPage />
    </Suspense>
  ),
});

const modelGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/model-gallery",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ModelGalleryPage />
    </Suspense>
  ),
});

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <GamePage />
    </Suspense>
  ),
});

const trackReadyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/track-ready",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <TrackReadyPage />
    </Suspense>
  ),
});

const creatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/creator",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <CreatorPage />
    </Suspense>
  ),
});

const dynoOsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dyno-os",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <DynoOSPage />
    </Suspense>
  ),
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
  mechanicsRoute,
  aboutRoute,
  adminRoute,
  guideRoute,
  proRoute,
  revbucksRoute,
  featuredCarRoute,
  buildBattleRoute,
  modelReelsRoute,
  modelGalleryRoute,
  gameRoute,
  trackReadyRoute,
  creatorRoute,
  dynoOsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function ProSuccessHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isProSuccess = params.get("rs_pro") === "XR9k2mVp";
    if (isProSuccess && window.location.pathname === "/pro") {
      setUserPro();
      toast.success("Welcome to RevSpace Pro! Your crown is now active.", {
        duration: 6000,
      });
      // Clean the URL param without reloading
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, "", cleanUrl);
    }
  }, []);
  return null;
}

function FriendBadgeActivator() {
  const { identity } = useInternetIdentity();

  useEffect(() => {
    if (!identity) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref?.toUpperCase() === "FRIENDOFCREATOR") {
      const principalStr = identity.getPrincipal().toString();
      setFriendOfCreator(principalStr);
      toast.success(
        "You've been added as a Friend of the Creator! 💜 Check your profile for the badge.",
        { duration: 6000 },
      );
      // Clean the URL param without reloading
      const cleanUrl =
        window.location.pathname +
        (window.location.hash ? window.location.hash : "");
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [identity]);

  return null;
}

function DeployGuard() {
  useDeployGuard();
  return null;
}

export default function App() {
  return (
    <>
      <DeployGuard />
      <ProSuccessHandler />
      <FriendBadgeActivator />
      <RouterProvider router={router} />
      <Toaster position="top-center" theme="dark" />
      <BullBoostBanner />
    </>
  );
}
