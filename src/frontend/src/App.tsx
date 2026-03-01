import { Toaster } from "@/components/ui/sonner";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { Outlet, createRootRoute, createRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BullBoostBanner, Layout } from "./components/Layout";
import { LoginScreen } from "./components/LoginScreen";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { setFriendOfCreator } from "./lib/friendBadge";
import { setUserPro } from "./lib/pro";
import { AdminPage } from "./pages/AdminPage";
import { BuildBattlePage } from "./pages/BuildBattlePage";
import { ClubsPage } from "./pages/ClubsPage";
import { CreatePostPage } from "./pages/CreatePostPage";
import { EventsPage } from "./pages/EventsPage";
import { ExplorePage } from "./pages/ExplorePage";
import { FeaturedCarPage } from "./pages/FeaturedCarPage";
import { FeedPage } from "./pages/FeedPage";
import { GaragePage } from "./pages/GaragePage";
import { GuidePage } from "./pages/GuidePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { MechanicsPage } from "./pages/MechanicsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { ModelGalleryPage } from "./pages/ModelGalleryPage";
import { ModelReelsPage } from "./pages/ModelReelsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProPage } from "./pages/ProPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReelsPage } from "./pages/ReelsPage";
import { RevBucksPage } from "./pages/RevBucksPage";
import { RevSpaceInfoPage } from "./pages/RevSpaceInfoPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ShopPage } from "./pages/ShopPage";
import { UserProfilePage } from "./pages/UserProfilePage";

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
    recipient:
      typeof search.recipient === "string" ? search.recipient : undefined,
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

const mechanicsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mechanics",
  component: MechanicsPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: RevSpaceInfoPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide",
  component: GuidePage,
});

const proRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pro",
  component: ProPage,
});

const revbucksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/revbucks",
  component: RevBucksPage,
});

const featuredCarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/featured",
  component: FeaturedCarPage,
});

const buildBattleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buildbattle",
  component: BuildBattlePage,
});

const modelReelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/model-reels",
  component: ModelReelsPage,
});

const modelGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/model-gallery",
  component: ModelGalleryPage,
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

export default function App() {
  return (
    <>
      <ProSuccessHandler />
      <FriendBadgeActivator />
      <RouterProvider router={router} />
      <Toaster position="top-center" theme="dark" />
      <BullBoostBanner />
    </>
  );
}
