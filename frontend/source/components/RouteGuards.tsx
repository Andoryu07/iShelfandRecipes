import { Alert } from "@mui/material";
import { Navigate, Outlet } from "react-router";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { LoadingScreen } from "./LoadingScreen";

export function RequireSignedOut() {
  const { status } = useAuthentication();
  if (status === "loading") {
    return <LoadingScreen />;
  }
  return status === "signedIn" ? <Navigate to="/" replace /> : <Outlet />;
}

export function RequireSignedIn() {
  const { status } = useAuthentication();
  if (status === "loading") {
    return <LoadingScreen />;
  }
  return status === "signedOut" ? <Navigate to="/login" replace /> : <Outlet />;
}

export function RequireHousehold() {
  const { household, isPending, error } = useCurrentHousehold();
  if (isPending) {
    return <LoadingScreen />;
  }
  if (error) {
    return <Alert severity="error">{describeError(error)}</Alert>;
  }
  return household ? <Outlet /> : <Navigate to="/household/setup" replace />;
}

export function RequireNoHousehold() {
  const { household, isPending } = useCurrentHousehold();
  if (isPending) {
    return <LoadingScreen />;
  }
  return household ? <Navigate to="/household" replace /> : <Outlet />;
}
