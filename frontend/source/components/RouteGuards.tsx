import { Alert } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router";
import { AccountRestoreScreen } from "../authentication/AccountRestoreScreen";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { LoadingScreen } from "./LoadingScreen";

interface RedirectState {
  from?: { pathname: string; search: string; hash?: string };
}

export function RequireSignedOut() {
  const { status } = useAuthentication();
  const from = (useLocation().state as RedirectState | null)?.from;
  if (status === "loading") {
    return <LoadingScreen />;
  }
  return status === "signedIn" ? (
    <Navigate to={from ? `${from.pathname}${from.search}${from.hash ?? ""}` : "/"} replace />
  ) : (
    <Outlet />
  );
}

export function RequireSignedIn() {
  const { status, user } = useAuthentication();
  const location = useLocation();
  if (status === "loading") {
    return <LoadingScreen />;
  }
  if (status === "signedOut") {
    const from =
      location.pathname === "/"
        ? undefined
        : { pathname: location.pathname, search: location.search, hash: location.hash };
    return <Navigate to="/login" replace state={{ from } satisfies RedirectState} />;
  }
  if (user?.deletionScheduledAt) {
    return <AccountRestoreScreen deletionScheduledAt={user.deletionScheduledAt} />;
  }
  return <Outlet />;
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
