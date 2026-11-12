import type { TokenResponse } from "./types";

export const apiBasePath = "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : `Request failed with status ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

let accessToken: string | null = null;
let pendingRefresh: Promise<boolean> | null = null;
let authenticationLostListener: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function onAuthenticationLost(listener: (() => void) | null): void {
  authenticationLostListener = listener;
}

async function sendRequest(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  const isFormData = options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return fetch(`${apiBasePath}${path}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.body === undefined
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body),
    credentials: "same-origin",
  });
}

async function readResponse<ResponseBody>(response: Response): Promise<ResponseBody> {
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    throw new ApiError(response.status, body?.detail);
  }
  return body as ResponseBody;
}

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBasePath}/auth/refresh`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) {
      setAccessToken(null);
      return false;
    }
    const tokens = (await response.json()) as TokenResponse;
    setAccessToken(tokens.accessToken);
    return true;
  } catch {
    return false;
  }
}

function performRefreshAcrossTabs(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("refreshAccessToken", performRefresh);
  }
  return performRefresh();
}

export function refreshAccessToken(): Promise<boolean> {
  if (!pendingRefresh) {
    pendingRefresh = performRefreshAcrossTabs().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

export async function apiRequest<ResponseBody>(
  path: string,
  options: RequestOptions = {},
): Promise<ResponseBody> {
  let response = await sendRequest(path, options);
  if (response.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      authenticationLostListener?.();
      return readResponse<ResponseBody>(response);
    }
    response = await sendRequest(path, options);
  }
  return readResponse<ResponseBody>(response);
}
