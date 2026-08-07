/**
 * roleUtils.ts
 *
 * Central role-mapping utilities for the SocialPilot frontend.
 *
 * MAPPING SOURCE (resolved 2026-07-31):
 * ------------------------------------
 * The backend stores exactly 3 auth roles in the UserRole enum:
 *   "admin" | "manager" | "user"
 *
 * These map to 4 frontend display labels via the authoritative table in
 *   backend/app/core/roles_mapping.py (FRONTEND_TO_BACKEND_ROLE).
 *
 * "Business User" and "Marketing Team" both map to "manager" at the
 * backend level. To distinguish them client-side, the display role label
 * is stored in localStorage["userRole"] at signup/login time.
 *
 * At login (no dropdown), "manager" defaults to "Marketing Team".
 */

// ─── Auth role → route key ────────────────────────────────────────────────────
// Derived from the reverse of backend/app/core/roles_mapping.py
export const AUTH_ROLE_TO_ROUTE_KEY: Record<string, FrontendRoleKey> = {
  admin:   "admin",
  manager: "marketing", // fallback for ambiguous "manager" — signup stores the real label
  user:    "creator",
};

// ─── Auth role → display label (fallback when localStorage is absent) ─────────
export const AUTH_ROLE_TO_DISPLAY: Record<string, string> = {
  admin:   "Administrator",
  manager: "Marketing Team",
  user:    "Content Creator",
};

// ─── Frontend role keys ───────────────────────────────────────────────────────
export type FrontendRoleKey = "creator" | "marketing" | "business" | "admin";

// ─── Display label → route key ───────────────────────────────────────────────
// Source: FRONTEND_TO_BACKEND_ROLE (roles_mapping.py) applied in reverse,
// augmented with route keys for UI routing.
export const DISPLAY_TO_ROUTE_KEY: Record<string, FrontendRoleKey> = {
  "Content Creator": "creator",
  "Marketing Team":  "marketing",
  "Business User":   "business",
  "Administrator":   "admin",
};

// ─── Route key → full dashboard path ─────────────────────────────────────────
export const ROLE_DASHBOARD_PATHS: Record<FrontendRoleKey, string> = {
  creator:   "/dashboard/creator",
  marketing: "/dashboard/marketing",
  business:  "/dashboard/business",
  admin:     "/dashboard/admin",
};

// ─── Route key → display label ───────────────────────────────────────────────
export const ROUTE_KEY_TO_DISPLAY: Record<FrontendRoleKey, string> = {
  creator:   "Content Creator",
  marketing: "Marketing Team",
  business:  "Business User",
  admin:     "Administrator",
};

// ─── Route key → role_reference API label (for GET /api/roles/{label}) ───────
export const ROUTE_KEY_TO_API_LABEL: Record<FrontendRoleKey, string> = {
  creator:   "Content Creator",
  marketing: "Marketing Team",
  business:  "Business User",
  admin:     "Administrator",
};

// ─── Decode JWT role claim from localStorage ─────────────────────────────────
export function decodeJwtRole(): string {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return "user";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.role as string) ?? "user";
  } catch {
    return "user";
  }
}

// ─── Get the current user's frontend role key ────────────────────────────────
/**
 * Priority order:
 * 1. localStorage["userRole"]  — display label stored at signup/login
 * 2. JWT "role" claim (auth role) — decoded and converted via AUTH_ROLE_TO_ROUTE_KEY
 * 3. Fallback: "creator"
 */
export function getFrontendRole(): FrontendRoleKey {
  // 1. Try stored display label (most accurate — preserves Business User vs Marketing Team)
  const stored = localStorage.getItem("userRole");
  if (stored && DISPLAY_TO_ROUTE_KEY[stored]) {
    return DISPLAY_TO_ROUTE_KEY[stored];
  }

  // 2. Fall back to JWT claim
  const authRole = decodeJwtRole();
  return AUTH_ROLE_TO_ROUTE_KEY[authRole] ?? "creator";
}

// ─── Get the dashboard path for the current user ─────────────────────────────
export function getDashboardRoute(): string {
  return ROLE_DASHBOARD_PATHS[getFrontendRole()];
}

// ─── Derive and store userRole from a backend auth role string at login ───────
/**
 * Called after a successful login response where no display-role dropdown
 * was shown. Stores the best-guess display label in localStorage.
 * Note: "manager" defaults to "Marketing Team" (see mapping source above).
 */
export function storeAuthRoleAsDisplayRole(authRole: string): void {
  const display = AUTH_ROLE_TO_DISPLAY[authRole] ?? "Content Creator";
  localStorage.setItem("userRole", display);
}
