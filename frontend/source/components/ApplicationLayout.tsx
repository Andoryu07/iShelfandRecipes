import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import KitchenRoundedIcon from "@mui/icons-material/KitchenRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router";
import { texts } from "../translations/cs";

const navigationItems = [
  { path: "/stock", label: texts.navigation.stock, icon: <KitchenRoundedIcon /> },
  { path: "/receipts", label: texts.navigation.receipts, icon: <ReceiptLongRoundedIcon /> },
  { path: "/recipes", label: texts.navigation.recipes, icon: <MenuBookRoundedIcon /> },
  { path: "/household", label: texts.navigation.household, icon: <HomeRoundedIcon /> },
];

export function ApplicationLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = navigationItems.find((item) => location.pathname.startsWith(item.path))?.path ?? false;

  return (
    <>
      <main className="page">
        <Outlet />
      </main>
      <Paper className="bottomNavigation" elevation={8} component="nav">
        <BottomNavigation showLabels value={activePath} onChange={(_, path: string) => navigate(path)}>
          {navigationItems.map((item) => (
            <BottomNavigationAction key={item.path} value={item.path} label={item.label} icon={item.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </>
  );
}
