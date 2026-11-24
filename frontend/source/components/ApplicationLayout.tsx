import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import KitchenRoundedIcon from "@mui/icons-material/KitchenRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import {
  AppBar,
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { HouseholdSwitcher } from "../households/HouseholdSwitcher";
import { LockedHouseholdBanner } from "../households/LockedHouseholdBanner";
import { selectHousehold, useCurrentHousehold } from "../households/useCurrentHousehold";
import { useShoppingList } from "../shopping/useShoppingList";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import { Suspense, useEffect } from "react";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { texts } from "../translations/cs";
import { HelpButton, TourHint, TourOffer, useRequestedTour } from "../tour/TourEntryPoints";
import { TourProvider } from "../tour/TourProvider";

const navigationItems = [
  { path: "/overview", label: texts.navigation.overview, icon: <SpaceDashboardRoundedIcon /> },
  { path: "/stock", label: texts.navigation.stock, icon: <KitchenRoundedIcon /> },
  { path: "/recipes", label: texts.navigation.recipes, icon: <MenuBookRoundedIcon /> },
  { path: "/receipts", label: texts.navigation.receipts, icon: <ReceiptLongRoundedIcon /> },
  { path: "/household", label: texts.navigation.household, icon: <HomeRoundedIcon /> },
];

const sideNavigationWidth = 232;

interface PageInformation {
  title: string;
  backTo: string | null;
}

export function pageInformation(pathname: string): PageInformation {
  const profileTitles: Record<string, string> = {
    "/profile/account": texts.profile.account,
    "/profile/appearance": texts.profile.appearance,
    "/profile/notifications": texts.profile.notifications,
    "/profile/privacy": texts.profile.privacy,
    "/profile/about": texts.profile.about,
    "/profile/premium": texts.premium.title,
  };
  if (profileTitles[pathname]) {
    return { title: profileTitles[pathname], backTo: "/profile" };
  }
  if (pathname === "/profile") {
    return { title: texts.profile.title, backTo: "/overview" };
  }
  if (pathname === "/households/add") {
    return { title: texts.households.addTitle, backTo: "/household" };
  }
  if (pathname === "/shopping-list") {
    return { title: texts.shoppingList.title, backTo: "/overview" };
  }
  if (/^\/recipes\/\d+/.test(pathname)) {
    return { title: texts.navigation.recipe, backTo: "/recipes" };
  }
  const item = navigationItems.find((navigationItem) => pathname.startsWith(navigationItem.path));
  return { title: item?.label ?? texts.applicationName, backTo: null };
}

export function ApplicationLayout() {
  return (
    <TourProvider>
      <ApplicationLayoutContent />
    </TourProvider>
  );
}

function ApplicationLayoutContent() {
  useRequestedTour();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthentication();
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("md"));
  const activePath = navigationItems.find((item) => location.pathname.startsWith(item.path))?.path ?? false;
  const page = pageInformation(location.pathname);
  const { household, households } = useCurrentHousehold();
  const [searchParameters, setSearchParameters] = useSearchParams();
  const requestedHouseholdId = Number(searchParameters.get("household"));

  useEffect(() => {
    if (!requestedHouseholdId) {
      return;
    }
    if (households.some((candidate) => candidate.id === requestedHouseholdId)) {
      selectHousehold(requestedHouseholdId);
    }
    setSearchParameters(
      (parameters) => {
        parameters.delete("household");
        return parameters;
      },
      { replace: true },
    );
  }, [requestedHouseholdId, households, setSearchParameters]);

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      {isWide && (
        <Drawer
          variant="permanent"
          sx={{
            width: sideNavigationWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": { width: sideNavigationWidth },
          }}
        >
          <Typography variant="h6" color="primary" sx={{ px: 2.5, py: 2.5 }}>
            {texts.applicationName}
          </Typography>
          <List sx={{ px: 1 }} data-tour="navigation">
            {navigationItems.map((item) => (
              <ListItemButton
                key={item.path}
                selected={item.path === activePath}
                onClick={() => navigate(item.path)}
                sx={{ borderRadius: 3, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}
        >
          <Toolbar
            sx={{ maxWidth: "var(--page-maximum-width)", width: "100%", mx: "auto", px: { xs: 1, sm: 2 } }}
          >
            {page.backTo ? (
              <IconButton
                aria-label={texts.common.back}
                onClick={() => navigate(page.backTo!)}
                sx={{ mr: 0.5 }}
              >
                <ArrowBackRoundedIcon />
              </IconButton>
            ) : (
              <Box sx={{ width: 8 }} />
            )}
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <Typography variant="h6" component="h1" noWrap sx={{ lineHeight: 1.2 }}>
                {page.title}
              </Typography>
              <HouseholdSwitcher />
            </Box>
            <HelpButton />
            <ShoppingCartButton />
            <IconButton
              aria-label={texts.profile.title}
              onClick={() => navigate("/profile")}
              data-tour="profileButton"
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  fontSize: 16,
                }}
              >
                {user?.displayName.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Toolbar>
        </AppBar>
        <main className="page">
          <LockedHouseholdBanner />
          <TourHint />
          <TourOffer />
          <Suspense fallback={<PageLoading />}>
            <Outlet key={household?.id} />
          </Suspense>
        </main>
      </Box>
      {!isWide && (
        <Paper
          className="bottomNavigation"
          elevation={0}
          component="nav"
          data-tour="navigation"
          sx={{ borderTop: 1, borderColor: "divider" }}
        >
          <BottomNavigation showLabels value={activePath} onChange={(_, path: string) => navigate(path)}>
            {navigationItems.map((item) => (
              <BottomNavigationAction
                key={item.path}
                value={item.path}
                label={item.label}
                icon={item.icon}
                sx={{
                  minWidth: 0,
                  px: 0.25,
                  "& .MuiBottomNavigationAction-label, & .MuiBottomNavigationAction-label.Mui-selected": {
                    fontSize: "0.7rem",
                  },
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}

function PageLoading() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress />
    </Box>
  );
}

function ShoppingCartButton() {
  const navigate = useNavigate();
  const { household } = useCurrentHousehold();
  const shoppingListQuery = useShoppingList(household?.id ?? 0);
  const openCount = (shoppingListQuery.data ?? []).filter((item) => !item.isChecked).length;
  return (
    <IconButton
      aria-label={texts.shoppingList.open}
      onClick={() => navigate("/shopping-list")}
      data-tour="shoppingCart"
      sx={{ mr: 0.5 }}
    >
      <Badge badgeContent={openCount} color="primary" max={99}>
        <ShoppingCartRoundedIcon />
      </Badge>
    </IconButton>
  );
}
