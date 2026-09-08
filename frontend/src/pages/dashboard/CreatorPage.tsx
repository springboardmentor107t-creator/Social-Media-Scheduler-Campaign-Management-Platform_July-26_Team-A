/**
 * CreatorPage.tsx — Content Creator Dashboard
 * Route: /dashboard/creator
 *
 * NEW in this pass:
 *   - Skeleton loaders on stat cards (500ms minimum)
 *   - EmptyState for zero-content table state
 *   - OnboardingChecklist widget (dismissible, localStorage-backed)
 *   - Bulk actions on My Content table (select-all, bulk delete, bulk reschedule)
 */
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell, { type NavItem } from "../../components/DashboardShell";
import RoleGate from "../../components/RoleGate";
import ConfirmModal from "../../components/ConfirmModal";
import EmptyState, { PostsEmptyIcon } from "../../components/EmptyState";
import { StatCardSkeleton } from "../../components/Skeleton";
import OnboardingChecklist from "../../components/OnboardingChecklist";
import { apiFetch, uploadFileApi } from "../../services/api";

// ── Nav items for Content Creator ─────────────────────────────────────────────
const CREATOR_NAV: NavItem[] = [
  { label: "My Dashboard",      href: "/dashboard/creator" },
  { label: "Campaigns",         href: "/dashboard/campaigns" },
  { label: "Analytics",         href: "/dashboard/analytics" },
  { label: "My Content",        href: "/dashboard/creator" },
  { label: "Drafts",            href: "/dashboard/creator" },
  { label: "Media Library",     href: "/dashboard/creator" },
  { label: "Publishing History",href: "/dashboard/creator" },
  { label: "Profile",           href: "/dashboard/profile" },
  { label: "Connect Accounts",  href: "/dashboard/connect" },
  { label: "Calendar",          href: "/dashboard/calendar" },
  { label: "Preview",           href: "/dashboard/preview" },
  { label: "Settings",          href: "/dashboard/settings" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type PostStatus = "Draft" | "Scheduled" | "Published" | "Failed";

interface ContentRow {
  id: string;
  title: string;
  platform: string;
  status: PostStatus;
  scheduledTime: string;
}

interface Draft {
  id: string;
  title: string;
  lastEdited: string;
  platform: string;
}

interface RecurringPost {
  id: string;
  title: string;
  frequency: string;
  nextRun: string;
  platform: string;
  active: boolean;
}

interface HistoryEntry {
  id: string;
  title: string;
  platform: string;
  timestamp: string;
  result: "Success" | "Failed";
}

// ── Mock data (TODO: replace with real API calls) ─────────────────────────────
const MOCK_STATS = [
  { label: "My Posts",      value: "47",   hint: "all time" },
  { label: "Drafts",        value: "8",    hint: "unsaved work" },
  { label: "Scheduled",     value: "12",   hint: "upcoming" },
  { label: "Engagement Rate",value: "4.7%", hint: "this month" },
];

const MOCK_CONTENT: ContentRow[] = [
  { id: "c1", title: "Summer Campaign Launch",  platform: "Instagram", status: "Scheduled",  scheduledTime: "Aug 2, 10:00 AM" },
  { id: "c2", title: "Product Feature Thread",  platform: "X",         status: "Published",  scheduledTime: "Jul 30, 2:00 PM" },
  { id: "c3", title: "Weekly Tip — SEO Basics", platform: "LinkedIn",  status: "Draft",      scheduledTime: "—" },
  { id: "c4", title: "Flash Sale Announcement", platform: "Facebook",  status: "Failed",     scheduledTime: "Jul 28, 9:00 AM" },
  { id: "c5", title: "Behind the Scenes Reel",  platform: "Instagram", status: "Scheduled",  scheduledTime: "Aug 5, 8:00 AM" },
];

const MOCK_DRAFTS: Draft[] = [
  { id: "d1", title: "Q3 Product Recap",        lastEdited: "2h ago",   platform: "LinkedIn" },
  { id: "d2", title: "Customer Success Story",  lastEdited: "Yesterday",platform: "Instagram" },
  { id: "d3", title: "Thought Leadership Post", lastEdited: "3 days ago",platform: "X" },
];

const MOCK_RECURRING: RecurringPost[] = [
  { id: "r1", title: "Monday Motivation",  frequency: "Weekly — Mon 9 AM",  nextRun: "Aug 4",  platform: "Instagram", active: true },
  { id: "r2", title: "Weekly Newsletter",  frequency: "Weekly — Fri 11 AM", nextRun: "Aug 1",  platform: "LinkedIn",  active: true },
  { id: "r3", title: "Monthly Roundup",    frequency: "Monthly — 1st",      nextRun: "Sep 1",  platform: "Facebook",  active: false },
];

interface MediaItem {
  id: string;
  name: string;
  type: "Image" | "Video";
  size: string;
  url?: string;
  created_at?: string;
}

const MOCK_MEDIA: MediaItem[] = [
  { id: "m1", name: "hero-banner.jpg",  type: "Image", size: "1.2 MB" },
  { id: "m2", name: "product-demo.mp4", type: "Video", size: "34 MB"  },
  { id: "m3", name: "logo-dark.png",    type: "Image", size: "48 KB"  },
  { id: "m4", name: "team-photo.jpg",   type: "Image", size: "2.1 MB" },
  { id: "m5", name: "ad-creative.png",  type: "Image", size: "870 KB" },
  { id: "m6", name: "intro-reel.mp4",   type: "Video", size: "78 MB"  },
];

const MOCK_HISTORY: HistoryEntry[] = [
  { id: "h1", title: "Product Feature Thread",     platform: "X",         timestamp: "Jul 30, 2:01 PM",  result: "Success" },
  { id: "h2", title: "Flash Sale Announcement",    platform: "Facebook",  timestamp: "Jul 28, 9:00 AM",  result: "Failed"  },
  { id: "h3", title: "Case Study: Scaling Teams",  platform: "LinkedIn",  timestamp: "Jul 27, 11:05 AM", result: "Success" },
  { id: "h4", title: "Weekend Giveaway",           platform: "Instagram", timestamp: "Jul 26, 8:00 AM",  result: "Success" },
];

// ── Analytics mock chart (simple bar chart using divs) ────────────────────────
const ANALYTICS_DATA = [
  { week: "Wk 27", reach: 3200, engagement: 148 },
  { week: "Wk 28", reach: 4100, engagement: 210 },
  { week: "Wk 29", reach: 3700, engagement: 190 },
  { week: "Wk 30", reach: 5200, engagement: 264 },
];
const maxReach = Math.max(...ANALYTICS_DATA.map((d) => d.reach));

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<PostStatus, { bg: string; color: string }> = {
  Draft:     { bg: "rgba(107,114,128,0.14)", color: "var(--ink-muted)" },
  Scheduled: { bg: "rgba(52,152,219,0.14)",  color: "#2477A8" },
  Published: { bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  Failed:    { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
};

function StatusBadge({ status }: { status: PostStatus }) {
  const s = STATUS_COLORS[status];
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={s}>
      {status}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface rounded-2xl p-6 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--ink-muted)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Page component ─────────────────────────────────────────────────────────────
export default function CreatorPage() {
  const navigate = useNavigate();
  const [roleDesc, setRoleDesc] = useState<string>("Individual users who create, manage, and publish content.");
  const [statsLoading, setStatsLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Draft & Recurring state (so we can mutate them)
  const [drafts, setDrafts] = useState<Draft[]>(MOCK_DRAFTS);
  const [recurringPosts, setRecurringPosts] = useState<RecurringPost[]>(MOCK_RECURRING);

  // Media Library state
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem("creator_media_library");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return MOCK_MEDIA as MediaItem[];
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    localStorage.setItem("creator_media_library", JSON.stringify(mediaList));
  }, [mediaList]);

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setUploadingMedia(true);
    showToast("⏳ Uploading media file(s) to server...");

    try {
      const uploadPromises = files.map((file) => uploadFileApi(file));
      const results = await Promise.all(uploadPromises);

      const newMediaItems: MediaItem[] = results.map((res, index) => {
        const originalFile = files[index];
        const sizeStr =
          originalFile.size > 1024 * 1024
            ? `${(originalFile.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(originalFile.size / 1024)} KB`;
        const isVideo =
          originalFile.type.startsWith("video/") ||
          res.filename.endsWith(".mp4") ||
          res.filename.endsWith(".mov") ||
          res.filename.endsWith(".webm");

        return {
          id: `m_${Date.now()}_${index}`,
          name: res.filename || originalFile.name,
          type: isVideo ? "Video" : "Image",
          size: sizeStr,
          url: res.url,
          created_at: new Date().toISOString(),
        };
      });

      setMediaList((prev) => [...newMediaItems, ...prev]);
      showToast(`✅ Uploaded ${newMediaItems.length} media file(s) successfully!`);
    } catch (err: any) {
      showToast(`⚠️ Media upload failed: ${err.message || err}`);
    } finally {
      setUploadingMedia(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDeleteMedia = (id: string) => {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
    if (selectedMediaItem?.id === id) setSelectedMediaItem(null);
    showToast("Media file deleted.");
  };

  const handleCopyMediaUrl = (url?: string) => {
    if (!url) {
      showToast("No direct URL available for mock item.");
      return;
    }
    navigator.clipboard.writeText(url);
    showToast("📋 Media URL copied to clipboard!");
  };

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contentRows, setContentRows] = useState<ContentRow[]>(MOCK_CONTENT);
  const [bulkRescheduleDate, setBulkRescheduleDate] = useState("");
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmBulkReschedule, setConfirmBulkReschedule] = useState(false);

  // Stats Modal state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedPostStats, setSelectedPostStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const handleOpenStats = (contentId: string, postTitle: string) => {
    setStatsModalOpen(true);
    setLoadingStats(true);
    setSelectedPostStats({ title: postTitle });

    // Fetch the metrics for this content item
    apiFetch<any[]>("/api/analytics/posts")
      .then((posts) => {
        // Find stats for this content item (matching content_id)
        const match = posts.find((p) => p.content_id === contentId);
        if (match) {
          setSelectedPostStats(match);
        } else {
          // If no backend record exists (e.g. mock content), we can generate mock stats based on title
          setSelectedPostStats({
            title: postTitle,
            platform: "Instagram", // Default
            published_at: new Date().toISOString(),
            metrics: {
              impressions: 1250,
              likes: 85,
              comments: 12,
              shares: 4,
              engagement_rate: 0.08
            }
          });
        }
      })
      .catch(() => {
        // Fallback for API failure or development
        setSelectedPostStats({
          title: postTitle,
          platform: "Instagram",
          published_at: new Date().toISOString(),
          metrics: {
            impressions: 1250,
            likes: 85,
            comments: 12,
            shares: 4,
            engagement_rate: 0.08
          }
        });
      })
      .finally(() => {
        setLoadingStats(false);
      });
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  /** Convert an ISO timestamp to a human-readable relative string like "2h ago", "Yesterday" */
  const relativeTime = (isoStr: string): string => {
    if (!isoStr) return "";
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const fetchContents = () => {
    apiFetch<{ total: number; items: any[] }>("/api/content")
      .then((data) => {
        if (data && data.items && data.items.length > 0) {
          // ─ Populate My Content table
          const formatted: ContentRow[] = data.items.map((item) => ({
            id: item.id,
            title: item.title,
            platform: item.platform || "Unassigned",
            status: (item.display_status || "Draft") as PostStatus,
            scheduledTime: item.scheduledTime || "—",
          }));
          setContentRows(formatted);

          // ─ Populate Draft Management section with real saved drafts
          const apiDrafts: Draft[] = data.items
            .filter((item) => {
              const s = (item.display_status || item.status || "").toLowerCase();
              return s === "draft";
            })
            .map((item) => ({
              id: item.id,
              title: item.title,
              platform:
                item.platform && item.platform !== "Unassigned"
                  ? item.platform
                  : "Draft",
              lastEdited: relativeTime(item.updated_at || item.created_at),
            }));

          if (apiDrafts.length > 0) {
            setDrafts(apiDrafts);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchContents();
    apiFetch<{ description: string }>("/api/roles/Content%20Creator")
      .then((d) => setRoleDesc(d.description))
      .catch(() => {});
  }, []);

  const isUUID = (str?: string) => !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const handleDeleteSingle = async (id: string) => {
    try {
      if (isUUID(id)) {
        await apiFetch(`/api/content/${id}`, { method: "DELETE" });
      }
      setContentRows((prev) => prev.filter((r) => r.id !== id));
      setDrafts((prev) => prev.filter((r) => r.id !== id));
      showToast("Post deleted successfully.");
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleDuplicateSingle = async (id: string) => {
    try {
      if (isUUID(id)) {
        const dup = await apiFetch<any>(`/api/content/${id}/duplicate`, { method: "POST" });
        showToast(`Duplicated into new draft: ${dup.title}`);
        fetchContents();
      } else {
        showToast("Duplicated mock post into draft editor.");
        navigate(`/dashboard/creator/duplicate/${id}`);
      }
    } catch (err: any) {
      showToast(`Duplicate failed: ${err.message}`);
    }
  };

  // Simulate ≥500ms skeleton for stat cards
  useEffect(() => {
    const t = setTimeout(() => setStatsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const allSelected = selectedIds.length === contentRows.length && contentRows.length > 0;
  const toggleAll = () => setSelectedIds(allSelected ? [] : contentRows.map(r => r.id));
  const toggleRow = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Bulk delete — optimistic
  const handleBulkDelete = () => {
    const prev = contentRows;
    setContentRows(r => r.filter(row => !selectedIds.includes(row.id)));
    setSelectedIds([]);
    showToast(`Deleted ${selectedIds.length} post(s).`);
    // Rollback simulation if needed (real rollback on API failure)
    void prev; // placeholder — real impl: catch API error → setContentRows(prev)
  };

  // Bulk reschedule — optimistic
  const handleBulkReschedule = () => {
    if (!bulkRescheduleDate) return;
    setContentRows(r => r.map(row => selectedIds.includes(row.id) ? { ...row, scheduledTime: new Date(bulkRescheduleDate).toLocaleString() } : row));
    showToast(`Rescheduled ${selectedIds.length} post(s) to ${new Date(bulkRescheduleDate).toLocaleDateString()}.`);
    setSelectedIds([]);
    setBulkRescheduleDate("");
  };

  // ── Draft handlers ─────────────────────────────────────────────────────────
  const handleContinueEditing = (draftId: string) => {
    // Navigate to PostEditor with the content ID to load & edit the draft
    navigate(`/dashboard/creator/${draftId}/edit`);
  };

  // ── Recurring post handlers ────────────────────────────────────────────────
  const handleToggleRecurring = (postId: string) => {
    setRecurringPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        const nowActive = !p.active;
        showToast(`"${p.title}" ${nowActive ? "resumed" : "paused"}.`);
        return { ...p, active: nowActive };
      })
    );
  };

  const handleEditRecurring = (postId: string) => {
    navigate(`/dashboard/creator/${postId}/edit`);
  };

  return (
    <RoleGate allowedRole="creator">
      <DashboardShell
        active="My Dashboard"
        navItems={CREATOR_NAV}
        roleLabel="Content Creator"
        pageTitle="My Dashboard"
      >
        {/* ── Onboarding Checklist ────────────────────────────────────────── */}
        <div className="mb-6">
          <OnboardingChecklist showToast={showToast} />
        </div>

        {/* Role description banner */}
        <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: "rgba(69,222,196,0.07)", border: "1px solid rgba(69,222,196,0.18)", color: "var(--ink-muted)" }}>
          {roleDesc}
        </div>

        {/* ── Stat cards (skeleton while loading) ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading
            ? [1,2,3,4].map(i => <StatCardSkeleton key={i} />)
            : MOCK_STATS.map((s) => (
              <div key={s.label} className="surface rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--ink-muted)" }}>{s.label}</p>
                <p className="text-3xl font-bold" style={{ color: "var(--teal-dim)" }}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{s.hint}</p>
              </div>
            ))}
        </div>

        {/* ── My Content table ───────────────────────────────────────────────── */}
        <SectionCard title="My Content">
          <div className="flex items-center justify-between mb-4">
            <span />
            <button
              id="creator-new-post-btn"
              className="btn-primary-teal text-xs py-2 px-4"
              onClick={() => navigate("/dashboard/creator/new")}
            >
              + New Post
            </button>
          </div>

          {/* Bulk action floating bar */}
          {selectedIds.length > 0 && (
            <div
              className="flex items-center gap-3 flex-wrap mb-3 px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(69,222,196,0.1)", border: "1px solid rgba(69,222,196,0.25)" }}
              role="toolbar"
              aria-label="Bulk actions"
            >
              <span className="text-xs font-bold" style={{ color: "var(--teal-dim)" }}>{selectedIds.length} selected</span>
              <button
                onClick={() => setConfirmBulkDelete(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                aria-label={`Bulk delete ${selectedIds.length} posts`}
              >Delete {selectedIds.length} post(s)</button>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={bulkRescheduleDate}
                  onChange={e => setBulkRescheduleDate(e.target.value)}
                  className="input-field py-1 text-xs"
                  style={{ width: 180 }}
                  aria-label="Bulk reschedule date and time"
                />
                <button
                  onClick={() => bulkRescheduleDate ? setConfirmBulkReschedule(true) : showToast("Pick a date first.")}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg btn-primary-teal"
                  aria-label="Apply bulk reschedule"
                >Reschedule</button>
              </div>
              <button onClick={() => setSelectedIds([])} className="ml-auto text-xs" style={{ color: "var(--ink-muted)" }} aria-label="Clear selection">✕ Clear</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="pb-3 px-2" style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all posts"
                    />
                  </th>
                  {["Title", "Platform", "Status", "Scheduled", "Actions"].map((h) => (
                    <th key={h} className="pb-3 px-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {contentRows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<PostsEmptyIcon />}
                        title="No posts yet"
                        description="Create your first post to get started with scheduling."
                        actionLabel="Create your first post"
                        onAction={() => navigate("/dashboard/creator/new")}
                      />
                    </td>
                  </tr>
                ) : contentRows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Select post: ${row.title}`}
                      />
                    </td>
                    <td className="py-3.5 px-2 font-medium">{row.title}</td>
                    <td className="py-3.5 px-2 text-xs" style={{ color: "var(--ink-muted)" }}>{row.platform}</td>
                    <td className="py-3.5 px-2"><StatusBadge status={row.status} /></td>
                    <td className="py-3.5 px-2 text-xs" style={{ color: "var(--ink-muted)" }}>{row.scheduledTime}</td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-2">
                        {row.status === "Published" ? (
                          <button
                            onClick={() => handleOpenStats(row.id, row.title)}
                            className="text-xs font-medium px-2 py-1 rounded transition-colors"
                            style={{ color: "var(--teal-dim)", background: "rgba(69,222,196,0.08)" }}
                          >
                            Stats
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/dashboard/creator/${row.id}/edit`)}
                            className="text-xs font-medium px-2 py-1 rounded transition-colors"
                            style={{ color: "var(--teal-dim)", background: "rgba(69,222,196,0.08)" }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicateSingle(row.id)}
                          className="text-xs font-medium px-2 py-1 rounded transition-colors"
                          style={{ color: "var(--ink-muted)", background: "rgba(107,114,128,0.08)" }}
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(row.id)}
                          className="text-xs font-medium px-2 py-1 rounded transition-colors"
                          style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* ── Draft Management ─────────────────────────────────────────────── */}
          {/* TODO: replace with GET /api/content?status=draft&owner=me */}
          <SectionCard title="Draft Management">
            <div className="space-y-3">
              {drafts.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--ink-muted)" }}>No drafts yet.</p>
              ) : drafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(107,114,128,0.05)", border: "1px solid var(--line)" }}>
                  <div>
                    <p className="text-sm font-semibold">{draft.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{draft.platform} · Edited {draft.lastEdited}</p>
                  </div>
                  <button
                    onClick={() => handleContinueEditing(draft.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded"
                    style={{ color: "var(--teal-dim)", background: "rgba(69,222,196,0.10)", border: "1px solid rgba(69,222,196,0.20)" }}
                    aria-label={`Continue editing ${draft.title}`}
                  >
                    Continue editing
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Recurring Posts ───────────────────────────────────────────────── */}
          {/* TODO: replace with GET /api/content/recurring?owner=me */}
          <SectionCard title="Recurring Posts">
            <div className="space-y-3">
              {recurringPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(107,114,128,0.05)", border: "1px solid var(--line)" }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{post.title}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded`} style={{ background: post.active ? "rgba(16,185,129,0.12)" : "rgba(107,114,128,0.12)", color: post.active ? "#10b981" : "var(--ink-muted)" }}>
                        {post.active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{post.frequency} · Next: {post.nextRun}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleRecurring(post.id)}
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{ color: "var(--ink-muted)", background: "rgba(107,114,128,0.08)" }}
                      aria-label={`${post.active ? "Pause" : "Resume"} ${post.title}`}
                    >
                      {post.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => handleEditRecurring(post.id)}
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{ color: "var(--teal-dim)", background: "rgba(69,222,196,0.08)" }}
                      aria-label={`Edit ${post.title}`}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ── Media Library ─────────────────────────────────────────────────── */}
        <div className="mt-6">
          <SectionCard title="Media Library">
            {/* Hidden native file input for media uploads */}
            <input
              type="file"
              ref={mediaFileInputRef}
              accept="image/*,video/*"
              multiple
              onChange={handleMediaFileUpload}
              className="hidden"
            />

            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
                {mediaList.length} asset{mediaList.length === 1 ? "" : "s"} stored
              </span>
              <button
                onClick={() => mediaFileInputRef.current?.click()}
                disabled={uploadingMedia}
                className="btn-outline-soft text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold"
              >
                {uploadingMedia ? "⏳ Uploading..." : "↑ Upload Asset"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {mediaList.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMediaItem(m)}
                  className="rounded-xl p-3 text-center group cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(107,114,128,0.06)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    className="w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center text-xl overflow-hidden relative"
                    style={{ background: "rgba(69,222,196,0.10)" }}
                  >
                    {m.url ? (
                      m.type === "Video" ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <span>{m.type === "Video" ? "🎬" : "🖼️"}</span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold truncate" title={m.name}>
                    {m.name}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                    {m.size}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Media Asset Detail / Preview Modal */}
        {selectedMediaItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
              className="surface rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4"
              style={{ border: "1px solid var(--line)" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold truncate pr-4">{selectedMediaItem.name}</h3>
                <button
                  onClick={() => setSelectedMediaItem(null)}
                  className="text-xs font-bold px-2 py-1 rounded"
                  style={{ color: "var(--ink-muted)" }}
                >
                  ✕
                </button>
              </div>

              {/* Preview Box */}
              <div className="w-full h-48 rounded-xl overflow-hidden bg-black/20 flex items-center justify-center border" style={{ borderColor: "var(--line)" }}>
                {selectedMediaItem.url ? (
                  selectedMediaItem.type === "Video" ? (
                    <video src={selectedMediaItem.url} controls className="max-h-full max-w-full object-contain" />
                  ) : (
                    <img src={selectedMediaItem.url} alt={selectedMediaItem.name} className="max-h-full max-w-full object-contain" />
                  )
                ) : (
                  <div className="text-center p-4">
                    <span className="text-4xl block mb-2">{selectedMediaItem.type === "Video" ? "🎬" : "🖼️"}</span>
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Sample static media preview</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="text-xs space-y-1 p-3 rounded-xl" style={{ background: "rgba(107,114,128,0.06)" }}>
                <p><strong>Type:</strong> {selectedMediaItem.type}</p>
                <p><strong>Size:</strong> {selectedMediaItem.size}</p>
                {selectedMediaItem.url && (
                  <p className="truncate font-mono text-[10px]" style={{ color: "var(--teal-dim)" }}>
                    <strong>URL:</strong> {selectedMediaItem.url}
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
                <div className="flex items-center gap-2">
                  {selectedMediaItem.url && (
                    <button
                      onClick={() => handleCopyMediaUrl(selectedMediaItem.url)}
                      className="btn-outline-soft text-xs py-1.5 px-3"
                    >
                      📋 Copy Link
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedMediaItem(null);
                      navigate("/dashboard/creator/new");
                    }}
                    className="btn-primary-teal text-xs py-1.5 px-3"
                  >
                    ✍️ Use in Post
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteMedia(selectedMediaItem.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* ── Personal Analytics ────────────────────────────────────────────── */}
          {/* TODO: replace with GET /api/analytics/me?period=4w */}
          <SectionCard title="Personal Analytics — Reach vs Engagement">
            <div className="space-y-3">
              {ANALYTICS_DATA.map((d) => (
                <div key={d.week}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: "var(--ink-muted)" }}>{d.week}</span>
                    <span style={{ color: "var(--ink-muted)" }}>{d.reach.toLocaleString()} reach · {d.engagement} engagements</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(107,114,128,0.10)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(d.reach / maxReach) * 100}%`, background: "var(--teal)" }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Publishing History ────────────────────────────────────────────── */}
          {/* TODO: replace with GET /api/publishing-log?owner=me */}
          <SectionCard title="Publishing History">
            <div className="space-y-3">
              {MOCK_HISTORY.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{entry.result === "Success" ? "✅" : "❌"}</span>
                    <div>
                      <p className="font-medium text-sm">{entry.title}</p>
                      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{entry.platform} · {entry.timestamp}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: entry.result === "Success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: entry.result === "Success" ? "#10b981" : "#ef4444" }}>
                    {entry.result}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </DashboardShell>

      {/* Bulk delete confirm */}
      <ConfirmModal
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.length} post(s)?`}
        message="This will permanently remove all selected posts. This action cannot be undone."
        confirmText="Delete all"
        isDestructive
      />

      {/* Bulk reschedule confirm */}
      <ConfirmModal
        isOpen={confirmBulkReschedule}
        onClose={() => setConfirmBulkReschedule(false)}
        onConfirm={handleBulkReschedule}
        title={`Reschedule ${selectedIds.length} post(s)?`}
        message={`All selected posts will be rescheduled to ${bulkRescheduleDate ? new Date(bulkRescheduleDate).toLocaleString() : "the selected time"}.`}
        confirmText="Reschedule all"
      />

      {/* Post Stats Modal */}
      {statsModalOpen && selectedPostStats && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
          role="dialog"
          aria-modal="true"
          onClick={() => setStatsModalOpen(false)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl surface shadow-2xl animate-in scale-in duration-200"
            style={{ background: "var(--bg-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4 pb-2" style={{ borderBottom: "1px solid var(--line)" }}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-dim">Post Performance Metrics</span>
                <h2 className="text-base font-bold truncate max-w-[280px]" style={{ color: "var(--ink)" }}>
                  {selectedPostStats.title}
                </h2>
              </div>
              <button
                onClick={() => setStatsModalOpen(false)}
                className="text-muted-light dark:text-muted-dark hover:text-[var(--ink)] text-lg"
              >
                ✕
              </button>
            </div>

            {loadingStats ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-dim border-t-transparent" />
                <p className="text-xs text-muted-light dark:text-muted-dark">Loading latest analytics...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-light dark:text-muted-dark">
                  <span>Platform: <strong className="text-teal-dim">{selectedPostStats.platform || "Instagram"}</strong></span>
                  {selectedPostStats.published_at && (
                    <span>Published: <strong>{new Date(selectedPostStats.published_at).toLocaleString()}</strong></span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Impressions</p>
                    <p className="text-lg font-extrabold mt-0.5 text-[var(--ink)]">
                      {selectedPostStats.metrics?.impressions?.toLocaleString() ?? 0}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Reach</p>
                    <p className="text-lg font-extrabold mt-0.5 text-[var(--ink)]">
                      {selectedPostStats.metrics?.reach?.toLocaleString() ?? 0}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Likes</p>
                    <p className="text-lg font-extrabold mt-0.5 text-emerald-500">
                      {selectedPostStats.metrics?.likes?.toLocaleString() ?? 0}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Comments</p>
                    <p className="text-lg font-extrabold mt-0.5 text-teal-dim">
                      {selectedPostStats.metrics?.comments?.toLocaleString() ?? 0}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Engagement Rate</span>
                    <span className="text-base font-extrabold text-teal-dim">
                      {typeof selectedPostStats.metrics?.engagement_rate === "number"
                        ? `${(selectedPostStats.metrics.engagement_rate * 100).toFixed(1)}%`
                        : selectedPostStats.metrics?.engagement_rate ?? "0.0%"}
                    </span>
                  </div>
                  <div className="w-full bg-canvas-light dark:bg-canvas-dark h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-teal h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          (typeof selectedPostStats.metrics?.engagement_rate === "number"
                            ? selectedPostStats.metrics.engagement_rate
                            : parseFloat(selectedPostStats.metrics?.engagement_rate || "0")) * 100 * 5,
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>

                {selectedPostStats.body && (
                  <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", color: "var(--ink-muted)" }}>
                    <p className="font-semibold text-[10px] uppercase tracking-wider mb-1">Content Snippet</p>
                    <p className="italic">"{selectedPostStats.body}"</p>
                  </div>
                )}

                <div className="flex justify-end pt-2" style={{ borderTop: "1px solid var(--line)" }}>
                  <button
                    onClick={() => setStatsModalOpen(false)}
                    className="btn-outline-soft px-4 py-2 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all pointer-events-none"
        style={{ background: "var(--ink)", color: "var(--bg-canvas)", opacity: toast ? 1 : 0, transform: toast ? "translateY(0)" : "translateY(8px)" }}
      >
        {toast}
      </div>
    </RoleGate>
  );
}
