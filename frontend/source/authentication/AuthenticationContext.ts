import { createContext, useContext } from "react";
import type { User } from "../api/types";

export type AuthenticationStatus = "loading" | "signedIn" | "signedOut";

export interface AuthenticationState {
  status: AuthenticationStatus;
  user: User | null;
  logIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logOut: () => Promise<void>;
  replaceUser: (user: User) => void;
}

export const AuthenticationContext = createContext<AuthenticationState | null>(null);

export function useAuthentication(): AuthenticationState {
  const authentication = useContext(AuthenticationContext);
  if (!authentication) {
    throw new Error("useAuthentication must be used inside AuthenticationProvider");
  }
  return authentication;
}
