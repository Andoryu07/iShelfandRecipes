import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { ApplicationLayout } from "./components/ApplicationLayout";
import {
  RequireHousehold,
  RequireNoHousehold,
  RequireSignedIn,
  RequireSignedOut,
} from "./components/RouteGuards";
import { AuthenticationForm } from "./pages/AuthenticationForm";
import { HouseholdPage } from "./pages/HouseholdPage";
import { HouseholdSetupPage } from "./pages/HouseholdSetupPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OverviewPage } from "./pages/OverviewPage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";
import { RecipesPage } from "./pages/RecipesPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import { StockPage } from "./pages/StockPage";
import {
  AboutPage,
  AccountSettingsPage,
  AppearancePage,
  NotificationsSettingsPage,
  PrivacySettingsPage,
  ProfilePage,
} from "./profile/ProfilePages";

const router = createBrowserRouter([
  {
    element: <RequireSignedOut />,
    children: [
      { path: "/login", element: <AuthenticationForm key="logIn" mode="logIn" /> },
      { path: "/register", element: <AuthenticationForm key="register" mode="register" /> },
    ],
  },
  {
    element: <RequireSignedIn />,
    children: [
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
              { path: "/profile", element: <ProfilePage /> },
              { path: "/profile/account", element: <AccountSettingsPage /> },
              { path: "/profile/appearance", element: <AppearancePage /> },
              { path: "/profile/notifications", element: <NotificationsSettingsPage /> },
              { path: "/profile/privacy", element: <PrivacySettingsPage /> },
              { path: "/profile/about", element: <AboutPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "/privacy", element: <PrivacyPolicyPage /> },
  { path: "*", element: <NotFoundPage /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
