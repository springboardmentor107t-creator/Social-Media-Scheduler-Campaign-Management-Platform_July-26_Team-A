/**
 * RoleGate.test.tsx
 *
 * Test coverage:
 *  - 16-combination role × page matrix
 *    • 4 "correct role → page renders children"
 *    • 12 "wrong role → navigate called with correct dashboard route"
 *  - 4 post-login redirect tests (one per role via AuthScreen login)
 *  - 1 unauthenticated redirect test (no token → /login)
 *
 * Role mapping used (from roleUtils.ts / backend/app/core/roles_mapping.py):
 *   "admin"   → /dashboard/admin
 *   "manager" → /dashboard/marketing  (fallback; Business User overridden by localStorage)
 *   "user"    → /dashboard/creator
 *   localStorage["userRole"] = "Business User" → /dashboard/business
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoleGate from "../components/RoleGate";

// ── Mock useNavigate ──────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function setLocalStorage(token: string | null, userRole: string | null) {
  if (token) {
    localStorage.setItem("accessToken", token);
  } else {
    localStorage.removeItem("accessToken");
  }
  if (userRole) {
    localStorage.setItem("userRole", userRole);
  } else {
    localStorage.removeItem("userRole");
  }
}

/**
 * Build a minimal JWT with the given role claim.
 * (header.payload.signature — signature is not verified client-side)
 */
function makeJwt(role: string): string {
  const payload = btoa(JSON.stringify({ sub: "test-user-id", role, type: "access" }));
  return `header.${payload}.sig`;
}

function renderGate(allowedRole: "creator" | "marketing" | "business" | "admin") {
  return render(
    <MemoryRouter>
      <RoleGate allowedRole={allowedRole}>
        <div data-testid="page-content">Dashboard content for {allowedRole}</div>
      </RoleGate>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RoleGate — unauthenticated user", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  it("redirects to /login when no accessToken is present", async () => {
    setLocalStorage(null, null);
    renderGate("creator");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true })
    );
    expect(screen.queryByTestId("page-content")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16-combination matrix: 4 roles × 4 pages
// ─────────────────────────────────────────────────────────────────────────────

describe("RoleGate — Content Creator (auth role: user)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setLocalStorage(makeJwt("user"), "Content Creator");
  });

  it("[creator → /creator] renders children", async () => {
    renderGate("creator");
    await waitFor(() => expect(screen.getByTestId("page-content")).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard/creator", expect.anything());
  });

  it("[creator → /marketing] redirects to /dashboard/creator", async () => {
    renderGate("marketing");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/creator", { replace: true })
    );
    expect(screen.queryByTestId("page-content")).not.toBeInTheDocument();
  });

  it("[creator → /business] redirects to /dashboard/creator", async () => {
    renderGate("business");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/creator", { replace: true })
    );
  });

  it("[creator → /admin] redirects to /dashboard/creator", async () => {
    renderGate("admin");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/creator", { replace: true })
    );
  });
});

describe("RoleGate — Marketing Team (auth role: manager, no Business User override)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setLocalStorage(makeJwt("manager"), "Marketing Team");
  });

  it("[marketing → /marketing] renders children", async () => {
    renderGate("marketing");
    await waitFor(() => expect(screen.getByTestId("page-content")).toBeInTheDocument());
  });

  it("[marketing → /creator] redirects to /dashboard/marketing", async () => {
    renderGate("creator");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/marketing", { replace: true })
    );
  });

  it("[marketing → /business] redirects to /dashboard/marketing", async () => {
    renderGate("business");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/marketing", { replace: true })
    );
  });

  it("[marketing → /admin] redirects to /dashboard/marketing", async () => {
    renderGate("admin");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/marketing", { replace: true })
    );
  });
});

describe("RoleGate — Business User (auth role: manager, userRole override in localStorage)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // Business User and Marketing Team share auth role "manager".
    // localStorage["userRole"] = "Business User" is the tiebreaker.
    setLocalStorage(makeJwt("manager"), "Business User");
  });

  it("[business → /business] renders children", async () => {
    renderGate("business");
    await waitFor(() => expect(screen.getByTestId("page-content")).toBeInTheDocument());
  });

  it("[business → /creator] redirects to /dashboard/business", async () => {
    renderGate("creator");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/business", { replace: true })
    );
  });

  it("[business → /marketing] redirects to /dashboard/business", async () => {
    renderGate("marketing");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/business", { replace: true })
    );
  });

  it("[business → /admin] redirects to /dashboard/business", async () => {
    renderGate("admin");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/business", { replace: true })
    );
  });
});

describe("RoleGate — Administrator (auth role: admin)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setLocalStorage(makeJwt("admin"), "Administrator");
  });

  it("[admin → /admin] renders children", async () => {
    renderGate("admin");
    await waitFor(() => expect(screen.getByTestId("page-content")).toBeInTheDocument());
  });

  it("[admin → /creator] redirects to /dashboard/admin", async () => {
    renderGate("creator");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin", { replace: true })
    );
  });

  it("[admin → /marketing] redirects to /dashboard/admin", async () => {
    renderGate("marketing");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin", { replace: true })
    );
  });

  it("[admin → /business] redirects to /dashboard/admin", async () => {
    renderGate("business");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin", { replace: true })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Post-login redirect tests (4 roles)
// ─────────────────────────────────────────────────────────────────────────────
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import AuthScreen from "../components/AuthScreen";

// Mock API service
vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
  setTokens: vi.fn(),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  clearSession: vi.fn(),
}));
vi.mock("../components/MapLoader", () => ({ default: () => <div data-testid="map-loader" /> }));
vi.mock("../components/ThemeToggle", () => ({ default: () => <button>Theme</button> }));

import { apiFetch } from "../services/api";
const mockApiFetch = vi.mocked(apiFetch);

function renderAuthLogin() {
  return render(
    <MemoryRouter>
      <AuthScreen initialMode="login" />
    </MemoryRouter>
  );
}

describe("Post-login redirect — correct dashboard per role", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockApiFetch.mockClear();
    localStorage.clear();
  });

  async function doLogin(authRole: string) {
    mockApiFetch.mockResolvedValueOnce({
      access_token: makeJwt(authRole),
      refresh_token: "refresh-token",
      user: { email: "test@test.com", full_name: "Test User", username: "test", role: authRole },
    });
    renderAuthLogin();
    await userEvent.type(screen.getByLabelText(/email address/i), "test@test.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    fireEvent.submit(screen.getByRole("button", { name: /^log in$/i }).closest("form")!);
  }

  it("logs in as admin → navigates to /dashboard/admin", async () => {
    await doLogin("admin");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin"),
      { timeout: 1500 }
    );
  });

  it("logs in as manager (Marketing) → navigates to /dashboard/marketing", async () => {
    await doLogin("manager");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/marketing"),
      { timeout: 1500 }
    );
  });

  it("logs in as user (Creator) → navigates to /dashboard/creator", async () => {
    await doLogin("user");
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/creator"),
      { timeout: 1500 }
    );
  });

  it("signup as Business User → navigates to /dashboard/business", async () => {
    mockApiFetch.mockResolvedValueOnce({
      access_token: makeJwt("manager"),
      refresh_token: "refresh-token",
      user: { email: "biz@test.com", full_name: "Biz User", username: "bizuser", role: "manager" },
    });

    render(
      <MemoryRouter>
        <AuthScreen initialMode="signup" />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/full name/i), "Biz User");
    await userEvent.type(screen.getByLabelText(/work email/i), "biz@test.com");
    const pwFields = screen.getAllByPlaceholderText(/8\+|re-enter/i);
    await userEvent.type(pwFields[0], "password12");
    await userEvent.type(pwFields[1], "password12");

    // Set the role select to "Business User"
    const roleSelect = screen.getByLabelText(/your role/i);
    await userEvent.selectOptions(roleSelect, "Business User");

    // Accept ToS
    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);

    fireEvent.submit(
      screen.getByRole("button", { name: /create account/i }).closest("form")!
    );

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/business"),
      { timeout: 1500 }
    );
  });
});
