import { apiRequest } from "./apiClient";
import type { TokenResponse, User } from "./types";

export function registerAccount(
  email: string,
  password: string,
  displayName: string,
): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/auth/register", {
    method: "POST",
    body: { email, password, displayName },
  });
}

export function logIn(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/auth/login", { method: "POST", body: { email, password } });
}

export function logOut(): Promise<void> {
  return apiRequest<void>("/auth/logout", { method: "POST" });
}

export function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/auth/me");
}
