import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError, onAuthenticationLost, setAccessToken } from "./apiClient";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function authorizationHeaderOf(call: unknown[]): string | undefined {
  const options = call[1] as RequestInit;
  return (options.headers as Record<string, string> | undefined)?.Authorization;
}

describe("apiRequest", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("expiredAccessToken");
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    onAuthenticationLost(null);
  });

  it("refreshes the access token once and repeats the request after a 401", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/auth/refresh") {
        return jsonResponse(200, { accessToken: "freshAccessToken" });
      }
      const call = fetchMock.mock.calls.at(-1)!;
      return authorizationHeaderOf(call) === "Bearer freshAccessToken"
        ? jsonResponse(200, { url })
        : jsonResponse(401, { detail: "Not authenticated" });
    });

    const results = await Promise.all([apiRequest("/households"), apiRequest("/households/1/members")]);

    expect(results).toEqual([{ url: "/api/households" }, { url: "/api/households/1/members" }]);
    const refreshCalls = fetchMock.mock.calls.filter(([input]) => String(input) === "/api/auth/refresh");
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0][1]).toMatchObject({ method: "POST", credentials: "same-origin" });
  });

  it("reports lost authentication when the refresh fails", async () => {
    const authenticationLost = vi.fn();
    onAuthenticationLost(authenticationLost);
    fetchMock.mockImplementation(async (input) =>
      String(input) === "/api/auth/refresh"
        ? jsonResponse(401, { detail: "Invalid refresh token" })
        : jsonResponse(401, { detail: "Not authenticated" }),
    );

    await expect(apiRequest("/households")).rejects.toBeInstanceOf(ApiError);
    expect(authenticationLost).toHaveBeenCalledOnce();
  });

  it("does not try to refresh after a failed login", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: "Incorrect email or password" }));

    await expect(apiRequest("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
