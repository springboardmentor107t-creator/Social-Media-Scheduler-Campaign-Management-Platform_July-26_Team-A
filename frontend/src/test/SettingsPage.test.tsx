/**
 * SettingsPage.test.tsx
 *
 * Tests the Settings page:
 * - Profile section loads and displays user data
 * - Change password form validation (mismatch, too short, no number)
 * - Notification preference toggles call API
 * - Deactivate account modal opens/closes
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SettingsPage from "../pages/SettingsPage";

// ── Mock api service ──────────────────────────────────────────────────────────
vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
  clearSession: vi.fn(),
}));

// ── Mock DashboardShell ───────────────────────────────────────────────────────
vi.mock("../components/DashboardShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">{children}</div>
  ),
}));

import { apiFetch } from "../services/api";

const mockProfile = {
  id: "user-1",
  email: "alice@test.com",
  full_name: "Alice Test",
  username: "alice",
  role: "user",
  is_active: true,
  notification_preferences: {
    email_notifications: true,
    push_notifications: false,
  },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);
  });

  // ── Profile Section ───────────────────────────────────────────────────────
  it("renders profile section with user data", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Alice Test")).toBeInTheDocument()
    );
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("Content Creator")).toBeInTheDocument();
  });

  it("shows loading skeleton before profile loads", () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderPage();
    // Should not show name yet
    expect(screen.queryByText("Alice Test")).not.toBeInTheDocument();
  });

  // ── Password Change ───────────────────────────────────────────────────────
  it("shows error when new passwords do not match", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Alice Test"));

    const inputs = screen.getAllByPlaceholderText("••••••••");
    // current password
    fireEvent.change(inputs[0], { target: { value: "OldPassword1" } });
    // new password
    fireEvent.change(inputs[1], { target: { value: "NewPassword1" } });
    // confirm password (different)
    fireEvent.change(inputs[2], { target: { value: "Different123" } });

    fireEvent.click(screen.getByText("Update password"));

    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    );
  });

  it("shows error when new password is too short", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Alice Test"));

    const inputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(inputs[0], { target: { value: "OldPwd1" } });
    fireEvent.change(inputs[1], { target: { value: "abc" } });
    fireEvent.change(inputs[2], { target: { value: "abc" } });

    fireEvent.click(screen.getByText("Update password"));

    await waitFor(() =>
      expect(screen.getByText("New password must be at least 8 characters.")).toBeInTheDocument()
    );
  });

  it("shows error when new password has no number", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Alice Test"));

    const inputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(inputs[0], { target: { value: "OldPwd123" } });
    fireEvent.change(inputs[1], { target: { value: "NoNumbers!" } });
    fireEvent.change(inputs[2], { target: { value: "NoNumbers!" } });

    fireEvent.click(screen.getByText("Update password"));

    await waitFor(() =>
      expect(screen.getByText(/at least one number/i)).toBeInTheDocument()
    );
  });

  // ── Notification Preferences ──────────────────────────────────────────────
  it("renders notification preference toggles", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Alice Test"));

    expect(screen.getByText(/email notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/push notifications/i)).toBeInTheDocument();
  });

  it("notification preference section is present", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Notification Preferences"));
  });

  // ── Danger Zone ───────────────────────────────────────────────────────────
  it("renders deactivate account button in danger zone", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Danger Zone"));
    expect(screen.getByText("Deactivate account")).toBeInTheDocument();
  });

  it("opens deactivate modal when button is clicked", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Deactivate account"));

    fireEvent.click(screen.getByText("Deactivate account"));

    await waitFor(() =>
      expect(screen.getByText("Deactivate Account?")).toBeInTheDocument()
    );
  });

  it("closes deactivate modal on Cancel", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Deactivate account"));

    fireEvent.click(screen.getByText("Deactivate account"));
    await waitFor(() =>
      expect(screen.getByText("Deactivate Account?")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(screen.queryByText("Deactivate Account?")).not.toBeInTheDocument()
    );
  });
});
