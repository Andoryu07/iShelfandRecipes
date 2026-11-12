import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthenticationLost, refreshAccessToken, setAccessToken } from "../api/apiClient";
import {
  getCurrentUser,
  logIn as logInRequest,
  logOut as logOutRequest,
  registerAccount,
} from "../api/authenticationApi";
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
    setUser(await getCurrentUser());
    setStatus("signedIn");
  }, []);

  useEffect(() => {
    onAuthenticationLost(signOutLocally);
    refreshAccessToken()
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

  const logOut = useCallback(async () => {
    try {
      await logOutRequest();
    } finally {
      signOutLocally();
    }
  }, [signOutLocally]);

  const value = useMemo(
    () => ({ status, user, logIn, register, logOut, replaceUser: setUser }),
    [status, user, logIn, register, logOut],
  );

  return <AuthenticationContext.Provider value={value}>{children}</AuthenticationContext.Provider>;
}
