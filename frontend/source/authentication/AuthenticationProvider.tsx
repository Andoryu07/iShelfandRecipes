import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthenticationLost, refreshAccessTokenOnStartup, setAccessToken } from "../api/apiClient";
import { listHouseholds } from "../api/householdsApi";
import { householdsQueryKey } from "../households/useCurrentHousehold";
import {
  getCurrentUser,
  logIn as logInRequest,
  logOut as logOutRequest,
  registerAccount,
  startAsGuest as startAsGuestRequest,
} from "../api/authenticationApi";
import { texts } from "../translations/cs";
import type { User } from "../api/types";
import { AuthenticationContext, type AuthenticationStatus } from "./AuthenticationContext";

export function AuthenticationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthenticationStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const signOutLocally = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("signedOut");
    queryClient.clear();
  }, [queryClient]);

  const loadCurrentUser = useCallback(async () => {
    const [currentUser] = await Promise.all([
      getCurrentUser(),
      queryClient.prefetchQuery({ queryKey: householdsQueryKey, queryFn: listHouseholds }),
    ]);
    setUser(currentUser);
    setStatus("signedIn");
  }, [queryClient]);

  useEffect(() => {
    onAuthenticationLost(signOutLocally);
    refreshAccessTokenOnStartup()
      .then((refreshed) => (refreshed ? loadCurrentUser() : signOutLocally()))
      .catch(signOutLocally);
    return () => onAuthenticationLost(null);
  }, [loadCurrentUser, signOutLocally]);

  const logIn = useCallback(
    async (email: string, password: string) => {
      const tokens = await logInRequest(email, password);
      setAccessToken(tokens.accessToken);
      await loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const tokens = await registerAccount(email, password, displayName);
      setAccessToken(tokens.accessToken);
      await loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const startAsGuest = useCallback(async () => {
    const tokens = await startAsGuestRequest(texts.guest.householdName);
    setAccessToken(tokens.accessToken);
    await loadCurrentUser();
  }, [loadCurrentUser]);

  const logOut = useCallback(async () => {
    try {
      await logOutRequest();
    } finally {
      signOutLocally();
    }
  }, [signOutLocally]);

  const value = useMemo(
    () => ({ status, user, logIn, register, startAsGuest, logOut, replaceUser: setUser }),
    [status, user, logIn, register, startAsGuest, logOut],
  );

  return <AuthenticationContext.Provider value={value}>{children}</AuthenticationContext.Provider>;
}
