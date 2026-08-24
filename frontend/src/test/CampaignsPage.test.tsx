/**
 * CampaignsPage.test.tsx
 *
 * Tests the Campaigns dashboard page:
 * - Loading state on mount
 * - Empty state when no campaigns exist
 * - Campaign list renders with name and status
 * - Status filter select is present
 * - "Create New Campaign" button opens modal
 * - Modal has required form fields
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CampaignsPage from "../pages/dashboard/CampaignsPage";

// ── Mock campaign service ─────────────────────────────────────────────────────
vi.mock("../services/campaignService", () => ({
  fetchCampaigns: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  fetchCampaignTracking: vi.fn(),
  schedulePostForCampaign: vi.fn(),
  fetchCampaignScheduledPosts: vi.fn(),
}));

// ── Mock DashboardShell (complex layout not needed in unit tests) ─────────────
vi.mock("../components/DashboardShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">{children}</div>
  ),
}));

import {
  fetchCampaigns,
} from "../services/campaignService";

const mockCampaigns = [
  {
    id: "camp-1",
    name: "Summer Launch",
    description: "Q3 product campaign",
    status: "active",
    budget: "$5,000",
    spent: "$1,200",
    platforms: ["twitter", "linkedin"],
    target_audience: "Tech Professionals",
  },
  {
    id: "camp-2",
    name: "Winter Promo",
    description: null,
    status: "draft",
    budget: "$2,000",
    spent: "$0",
    platforms: ["instagram"],
    target_audience: "Consumers",
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <CampaignsPage />
    </MemoryRouter>
  );
}

describe("CampaignsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state on initial mount", () => {
    // Return a promise that never resolves to hold loading state
    (fetchCampaigns as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    renderPage();
    expect(screen.getByText(/loading campaigns/i)).toBeInTheDocument();
  });

  it("shows empty state when no campaigns are returned", async () => {
    (fetchCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no campaigns found/i)).toBeInTheDocument()
    );
  });

  it("renders campaign list with names after loading", async () => {
    (fetchCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue(mockCampaigns);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Summer Launch")).toBeInTheDocument()
    );
    expect(screen.getByText("Winter Promo")).toBeInTheDocument();
  });

  it("renders summary metric cards", async () => {
    (fetchCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue(mockCampaigns);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/total campaigns/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/active campaigns/i)).toBeInTheDocument();
  });

  it("has a status filter dropdown", async () => {
    (fetchCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no campaigns found/i)).toBeInTheDocument()
    );
    // Filter select should include "All Statuses" option
    expect(screen.getByText("All Statuses")).toBeInTheDocument();
  });

  it("opens create campaign modal on button click", async () => {
    (fetchCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no campaigns found/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText(/create new campaign/i));
    expect(screen.getAllByText("Create Campaign").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Q4 Growth Drive/i)).toBeInTheDocument();
  });

  it("closes create modal on Cancel click", async () => {
    (fetchCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no campaigns found/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText(/create new campaign/i));
    expect(screen.getAllByText("Create Campaign").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Q4 Growth Drive/i)).not.toBeInTheDocument()
    );
  });

  it("shows platform badges for each campaign", async () => {
    (fetchCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue(mockCampaigns);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Summer Launch")).toBeInTheDocument()
    );
    // Platform badges (case-insensitive because JSDOM does not apply CSS text-transform: uppercase)
    expect(screen.getByText(/twitter/i)).toBeInTheDocument();
    expect(screen.getByText(/linkedin/i)).toBeInTheDocument();
    expect(screen.getByText(/instagram/i)).toBeInTheDocument();
  });

  it("filters campaigns by search term", async () => {
    (fetchCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue(mockCampaigns);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Summer Launch")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByPlaceholderText(/search campaigns/i), {
      target: { value: "winter" },
    });

    expect(screen.queryByText("Summer Launch")).not.toBeInTheDocument();
    expect(screen.getByText("Winter Promo")).toBeInTheDocument();
  });
});
