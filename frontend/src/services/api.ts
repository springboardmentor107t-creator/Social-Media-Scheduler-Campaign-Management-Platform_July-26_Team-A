/**
 * api.ts — Central authenticated fetch wrapper with automatic JWT refresh.
 *
 * Usage (replaces raw fetch everywhere):
 *   import { apiFetch } from "../services/api";
 *   const data = await apiFetch("/users/me");
 *
 * Behaviour:
 *  1. Attaches Authorization: Bearer <accessToken> on every request.
 *  2. On 401, attempts ONE silent token refresh via POST /api/auth/refresh.
 *  3. If the refresh succeeds, rotates both tokens in localStorage and retries
 *     the original request with the new access token.
 *  4. If the refresh fails (expired, invalid, account deactivated), clears
 *     localStorage and redirects to /login.
 */

const API_BASE = "http://127.0.0.1:8000";

// ─── Token storage helpers ──────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return localStorage.getItem("accessToken");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
}

// ─── Redirect helper ────────────────────────────────────────────────────────

function redirectToLogin(): void {
  clearSession();
  // Use window.location so this works outside React component tree
  window.location.replace("/login");
}

// ─── Silent refresh ─────────────────────────────────────────────────────────

let isRefreshing = false;
// Queue of { resolve, reject } callbacks waiting for a refresh in progress
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  refreshQueue = [];
}

async function silentRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token stored");
  }

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    throw new Error("Refresh failed");
  }

  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);

  // Keep display name in sync if the response carries user data
  if (data.user) {
    if (data.user.full_name) localStorage.setItem("userName", data.user.full_name);
    if (data.user.email) localStorage.setItem("userEmail", data.user.email);
  }

  return data.access_token;
}

// ─── Core apiFetch ──────────────────────────────────────────────────────────

export interface ApiFetchOptions extends RequestInit {
  /** Skip automatic 401 handling (useful for the refresh call itself). */
  skipRefresh?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipRefresh = false, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  let response = await fetch(url, { ...fetchOptions, headers });

  // ── 401 → attempt a single silent refresh ──────────────────────────────
  if (response.status === 401 && !skipRefresh) {
    if (isRefreshing) {
      // Another refresh is already in-flight: queue this request
      const newToken = await new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      });
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, { ...fetchOptions, headers });
    } else {
      isRefreshing = true;
      try {
        const newToken = await silentRefresh();
        processQueue(null, newToken);
        headers.set("Authorization", `Bearer ${newToken}`);
        response = await fetch(url, { ...fetchOptions, headers });
      } catch (err) {
        processQueue(err, null);
        redirectToLogin();
        // Throw so any awaiting caller also rejects cleanly
        throw new Error("Session expired. Redirecting to login.");
      } finally {
        isRefreshing = false;
      }
    }
  }

  // ── Non-OK responses after retry → throw structured error ─────────────
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // body is not JSON — keep generic message
    }
    throw new Error(detail);
  }

  // ── Success ─────────────────────────────────────────────────────────────
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  return response.text() as unknown as Promise<T>;
}
