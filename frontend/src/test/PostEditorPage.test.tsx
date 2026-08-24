/**
 * PostEditorPage.test.tsx
 *
 * Tests the Post Editor (Create, Edit, Duplicate flows):
 * - Renders the create form with title and body fields
 * - Validates required fields before submission
 * - Shows "Save Draft" and "Schedule Post" buttons
 * - Loads existing post data in edit mode (mocked)
 * - Content type buttons render correctly
 * - Schedule mode tabs are present
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PostEditorPage from "../pages/dashboard/PostEditorPage";

// ── Mock API ──────────────────────────────────────────────────────────────────
vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

// ── Mock heavy components ─────────────────────────────────────────────────────
vi.mock("../components/DashboardShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">{children}</div>
  ),
}));

vi.mock("../components/RoleGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="role-gate">{children}</div>
  ),
}));

vi.mock("../components/PlatformPreview", () => ({
  default: () => <div data-testid="platform-preview">Preview</div>,
}));

vi.mock("../components/BestTimeToPost", () => ({
  default: () => <div data-testid="best-time">Best Time Suggestion</div>,
}));

import { apiFetch } from "../services/api";

function renderCreatePage() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/creator/new"]}>
      <Routes>
        <Route path="/dashboard/creator/new" element={<PostEditorPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderEditPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/creator/${id}/edit`]}>
      <Routes>
        <Route path="/dashboard/creator/:id/edit" element={<PostEditorPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PostEditorPage — Create Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock social accounts fetch
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "sa-1", provider: "youtube", account_name: "Test Channel", is_active: true },
    ]);
  });

  it("renders post title input field", async () => {
    renderCreatePage();
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Summer Product Announcement/i)).toBeInTheDocument()
    );
  });

  it("renders post body/caption textarea", async () => {
    renderCreatePage();
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Write your main post copy/i)).toBeInTheDocument()
    );
  });

  it("renders Save as Draft button", async () => {
    renderCreatePage();
    await waitFor(() =>
      expect(screen.getByText("Save as Draft")).toBeInTheDocument()
    );
  });

  it("renders Schedule Post action button", async () => {
    renderCreatePage();
    await waitFor(() =>
      expect(screen.getByText(/Schedule Post/i)).toBeInTheDocument()
    );
  });

  it("renders content type format buttons", async () => {
    renderCreatePage();
    await waitFor(() => {
      expect(screen.getByText(/Text/i)).toBeInTheDocument();
      expect(screen.getByText(/Single Image/i)).toBeInTheDocument();
      expect(screen.getByText(/Video/i)).toBeInTheDocument();
      expect(screen.getByText(/Carousel/i)).toBeInTheDocument();
    });
  });

  it("renders schedule mode tabs (Draft, Publish Now, Schedule Later)", async () => {
    renderCreatePage();
    await waitFor(() => {
      expect(screen.getByText("Save Draft")).toBeInTheDocument();
      expect(screen.getByText("Publish Now")).toBeInTheDocument();
      expect(screen.getByText("Schedule Later")).toBeInTheDocument();
    });
  });

  it("shows validation error when submitting without a title", async () => {
    renderCreatePage();
    await waitFor(() => screen.getByText("Schedule Post"));

    fireEvent.click(screen.getByText(/Schedule Post/i));

    await waitFor(() =>
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    );
  });

  it("title character counter shows 0/255 initially", async () => {
    renderCreatePage();
    await waitFor(() =>
      expect(screen.getByText("0/255")).toBeInTheDocument()
    );
  });

  it("character counter updates as user types title", async () => {
    renderCreatePage();
    await waitFor(() => screen.getByPlaceholderText(/Summer Product Announcement/i));

    fireEvent.change(
      screen.getByPlaceholderText(/Summer Product Announcement/i),
      { target: { value: "My Test Title" } }
    );
    expect(screen.getByText("13/255")).toBeInTheDocument();
  });

  it("renders back navigation button to creator dashboard", async () => {
    renderCreatePage();
    await waitFor(() =>
      expect(screen.getByText(/Back to My Content/i)).toBeInTheDocument()
    );
  });
});

describe("PostEditorPage — Edit Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state while fetching post data", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderEditPage("content-123");
    expect(screen.getByText(/Loading post details/i)).toBeInTheDocument();
  });

  it("populates form fields with existing post data after fetch", async () => {
    (apiFetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { id: "sa-1", provider: "youtube", account_name: "Test Channel", is_active: true },
      ])
      .mockResolvedValueOnce({
        id: "content-123",
        title: "Existing Post Title",
        body: "Existing post body content.",
        content_type: "text",
        media_urls: [],
        status: "draft",
        display_status: "Draft",
      });

    renderEditPage("content-123");

    await waitFor(() =>
      expect(
        (screen.getByPlaceholderText(/Summer Product Announcement/i) as HTMLInputElement).value
      ).toBe("Existing Post Title")
    );
  });
});
