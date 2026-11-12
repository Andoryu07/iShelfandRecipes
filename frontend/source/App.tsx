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
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import { StockPage } from "./pages/StockPage";
import { texts } from "./translations/cs";

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
              { path: "/", element: <Navigate to="/stock" replace /> },
              { path: "/stock", element: <StockPage /> },
              { path: "/receipts", element: <ReceiptsPage /> },
              { path: "/recipes", element: <PlaceholderPage title={texts.navigation.recipes} /> },
              { path: "/household", element: <HouseholdPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
