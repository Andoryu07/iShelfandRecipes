import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { ApplicationLayout } from "./components/ApplicationLayout";
import {
  RequireHousehold,
  RequireNoHousehold,
  RequireSignedIn,
  RequireSignedOut,
} from "./components/RouteGuards";
import { AuthenticationForm } from "./pages/AuthenticationForm";
import { LoadingScreen } from "./components/LoadingScreen";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OverviewPage } from "./pages/OverviewPage";
import { StockPage } from "./pages/StockPage";

function lazyPage<Name extends string>(load: () => Promise<Record<Name, ComponentType>>, name: Name) {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}

const HouseholdPage = lazyPage(() => import("./pages/HouseholdPage"), "HouseholdPage");
const HouseholdSetupPage = lazyPage(() => import("./pages/HouseholdSetupPage"), "HouseholdSetupPage");
const RecipeDetailPage = lazyPage(() => import("./pages/RecipeDetailPage"), "RecipeDetailPage");
const RecipesPage = lazyPage(() => import("./pages/RecipesPage"), "RecipesPage");
const PrivacyPolicyPage = lazyPage(() => import("./pages/PrivacyPolicyPage"), "PrivacyPolicyPage");
const ReceiptsPage = lazyPage(() => import("./pages/ReceiptsPage"), "ReceiptsPage");
const ForgotPasswordPage = lazyPage(() => import("./pages/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = lazyPage(() => import("./pages/ResetPasswordPage"), "ResetPasswordPage");
const JoinLinkPage = lazyPage(() => import("./pages/JoinLinkPage"), "JoinLinkPage");
const ShoppingListPage = lazyPage(() => import("./pages/ShoppingListPage"), "ShoppingListPage");
const AboutPage = lazyPage(() => import("./profile/ProfilePages"), "AboutPage");
const AccountSettingsPage = lazyPage(() => import("./profile/ProfilePages"), "AccountSettingsPage");
const AppearancePage = lazyPage(() => import("./profile/ProfilePages"), "AppearancePage");
const NotificationsSettingsPage = lazyPage(
  () => import("./profile/ProfilePages"),
  "NotificationsSettingsPage",
);
const PrivacySettingsPage = lazyPage(() => import("./profile/ProfilePages"), "PrivacySettingsPage");
const PremiumPage = lazyPage(() => import("./profile/ProfilePages"), "PremiumPage");
const AddHouseholdPage = lazyPage(() => import("./pages/AddHouseholdPage"), "AddHouseholdPage");
const ProfilePage = lazyPage(() => import("./profile/ProfilePages"), "ProfilePage");

const router = createBrowserRouter([
  {
    element: <RequireSignedOut />,
    children: [
      { path: "/login", element: <AuthenticationForm key="logIn" mode="logIn" /> },
      { path: "/register", element: <AuthenticationForm key="register" mode="register" /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <RequireSignedIn />,
    children: [
      { path: "/join", element: <JoinLinkPage /> },
      {
        element: <RequireNoHousehold />,
        children: [{ path: "/household/setup", element: <HouseholdSetupPage /> }],
      },
      {
        element: <RequireHousehold />,
        children: [
          {
            element: <ApplicationLayout />,
            children: [
              { path: "/", element: <Navigate to="/overview" replace /> },
              { path: "/overview", element: <OverviewPage /> },
              { path: "/stock", element: <StockPage /> },
              { path: "/receipts", element: <ReceiptsPage /> },
              { path: "/recipes", element: <RecipesPage /> },
              { path: "/recipes/:recipeId", element: <RecipeDetailPage /> },
              { path: "/household", element: <HouseholdPage /> },
              { path: "/shopping-list", element: <ShoppingListPage /> },
              { path: "/profile", element: <ProfilePage /> },
              { path: "/profile/account", element: <AccountSettingsPage /> },
              { path: "/profile/appearance", element: <AppearancePage /> },
              { path: "/profile/notifications", element: <NotificationsSettingsPage /> },
              { path: "/profile/privacy", element: <PrivacySettingsPage /> },
              { path: "/profile/about", element: <AboutPage /> },
              { path: "/profile/premium", element: <PremiumPage /> },
              { path: "/households/add", element: <AddHouseholdPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "/privacy", element: <PrivacyPolicyPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "*", element: <NotFoundPage /> },
]);

export function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
