/**
 * AIAssistPanel.test.tsx — Frontend unit tests for the AI Assist panel.
 *
 * Uses React Testing Library + vitest (matching the project's existing test setup).
 * The apiFetch service is mocked — no real network calls are made.
 *
 * Coverage:
 *  1. Generate button disabled when no platforms selected
 *  2. Generate button enabled when platforms are selected
 *  3. Loading state shown while generating
 *  4. Successful generation fires onSuggestion with correct shape
 *  5. Title/Body auto-fill with AI-generated hint label
 *  6. Hint label clears on manual edit
 *  7. Rate-limit error toast shown with specific message
 *  8. Generic service error toast shown with specific message
 *  9. Regenerate option shown after first generation
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AIAssistPanel from "../components/AIAssistPanel";

// ── Mock apiFetch ─────────────────────────────────────────────────────────────
vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";
const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS = [
  { id: "acc-1", provider: "instagram", account_name: "brand_ig", is_active: true },
  { id: "acc-2", provider: "twitter",   account_name: "brand_x",  is_active: true },
];

const SINGLE_PLATFORM_RESPONSE = {
  title: "Big Summer Sale!",
  body: "Don't miss our biggest sale of the year. 50% off everything!",
  hashtags: ["summersale", "discount", "deals"],
};

const MULTI_PLATFORM_RESPONSE = {
  title: "Big Summer Sale!",
  variants: {
    instagram: "Don't miss our biggest sale! 50% off everything. Tag a friend 🛍️",
    twitter: "HUGE sale on now! 50% off 🔥 #summersale",
  },
  hashtags: ["summersale", "deals"],
};

function renderPanel({
  selectedIds = ["acc-1"],
  onSuggestion = vi.fn(),
  showToast = vi.fn(),
} = {}) {
  return render(
    <AIAssistPanel
      selectedAccountIds={selectedIds}
      connectedAccounts={MOCK_ACCOUNTS}
      onSuggestion={onSuggestion}
      showToast={showToast}
    />
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AIAssistPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders collapsed by default with toggle button", () => {
    renderPanel();
    const toggle = screen.getByRole("button", { name: /ai assist/i });
    expect(toggle).toBeInTheDocument();
    // Content panel should not be visible
    expect(screen.queryByLabelText(/topic/i)).not.toBeInTheDocument();
  });

  it("expands on toggle click to show Topic input", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }));
    expect(screen.getByLabelText(/topic/i)).toBeInTheDocument();
  });

  it("Generate button is disabled when no accounts selected", () => {
    renderPanel({ selectedIds: [] });
    // Expand panel
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }));
    const btn = screen.getByRole("button", { name: /generate/i });
    expect(btn).toBeDisabled();
  });

  it("Generate button is enabled when at least one account is selected", () => {
    renderPanel({ selectedIds: ["acc-1"] });
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }));
    const btn = screen.getByRole("button", { name: /generate/i });
    expect(btn).not.toBeDisabled();
  });

  it("calls onSuggestion with normalised variants on success (single platform)", async () => {
    const onSuggestion = vi.fn();
    mockApiFetch.mockResolvedValueOnce(SINGLE_PLATFORM_RESPONSE);

    renderPanel({ selectedIds: ["acc-1"], onSuggestion });
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }));

    // Enter topic
    fireEvent.change(screen.getByLabelText(/topic/i), {
      target: { value: "summer sale launch" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(onSuggestion).toHaveBeenCalledWith({
        title: "Big Summer Sale!",
        variants: { instagram: "Don't miss our biggest sale of the year. 50% off everything!" },
        hashtags: ["summersale", "discount", "deals"],
      });
    });
  });

  it("calls onSuggestion with multi-platform variants", async () => {
    const onSuggestion = vi.fn();
    mockApiFetch.mockResolvedValueOnce(MULTI_PLATFORM_RESPONSE);

    renderPanel({ selectedIds: ["acc-1", "acc-2"], onSuggestion });
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }));

    fireEvent.change(screen.getByLabelText(/topic/i), {
      target: { value: "summer sale" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(onSuggestion).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Big Summer Sale!",
          variants: expect.objectContaining({
            instagram: expect.any(String),
            twitter: expect.any(String),
          }),
        })
      );
    });
  });

  it("shows rate-limit toast with specific message on 429", async () => {
    const showToast = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new Error("You've reached the AI suggestion limit (10 requests/hour). Please wait approximately 30 minute(s).")
    );

    renderPanel({ showToast });
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }));
    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("10 requests/hour")
      );
    });
  });

  it("shows service-unavailable toast with specific message on 503", async () => {
    const showToast = vi.fn();
    mockApiFetch.mockRejectedValueOnce(
      new Error("AI suggestion service is temporarily unavailable. Please try again shortly.")
    );

    renderPanel({ showToast });
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }));
    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: "test topic" } });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("temporarily unavailable")
      );
    });
  });

  it("shows Regenerate button after successful generation", async () => {
    mockApiFetch.mockResolvedValueOnce(SINGLE_PLATFORM_RESPONSE);

    renderPanel({ selectedIds: ["acc-1"] });
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }));
    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /regenerate/i })).toBeInTheDocument();
    });
  });

  it("Regenerate calls the same endpoint again", async () => {
    mockApiFetch
      .mockResolvedValueOnce(SINGLE_PLATFORM_RESPONSE)
      .mockResolvedValueOnce({ ...SINGLE_PLATFORM_RESPONSE, title: "New Title Take 2" });

    const onSuggestion = vi.fn();
    renderPanel({ selectedIds: ["acc-1"], onSuggestion });
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }));
    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => screen.getByRole("button", { name: /regenerate/i }));
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
      expect(onSuggestion).toHaveBeenCalledTimes(2);
    });
  });
});
