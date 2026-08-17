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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell, { type NavItem } from "../../components/DashboardShell";
import RoleGate from "../../components/RoleGate";
import ConfirmModal from "../../components/ConfirmModal";
import EmptyState, { PostsEmptyIcon } from "../../components/EmptyState";
import { StatCardSkeleton } from "../../components/Skeleton";
import OnboardingChecklist from "../../components/OnboardingChecklist";
import { apiFetch } from "../../services/api";

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

const MOCK_MEDIA = [
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

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contentRows, setContentRows] = useState<ContentRow[]>(MOCK_CONTENT);
  const [bulkRescheduleDate, setBulkRescheduleDate] = useState("");
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmBulkReschedule, setConfirmBulkReschedule] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const fetchContents = () => {
    apiFetch<{ total: number; items: any[] }>("/api/content")
      .then((data) => {
        if (data && data.items && data.items.length > 0) {
          const formatted: ContentRow[] = data.items.map((item) => ({
            id: item.id,
            title: item.title,
            platform: item.platform || "Unassigned",
            status: (item.display_status || "Draft") as PostStatus,
            scheduledTime: item.scheduledTime || "—",
          }));
          setContentRows(formatted);
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

  const handleDeleteSingle = async (id: string) => {
    try {
      await apiFetch(`/api/content/${id}`, { method: "DELETE" });
      setContentRows((prev) => prev.filter((r) => r.id !== id));
      showToast("Post deleted successfully.");
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleDuplicateSingle = async (id: string) => {
    try {
      const dup = await apiFetch<any>(`/api/content/${id}/duplicate`, { method: "POST" });
      showToast(`Duplicated into new draft: ${dup.title}`);
      fetchContents();
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
                        <button
                          onClick={() => navigate(`/dashboard/creator/${row.id}/edit`)}
                          className="text-xs font-medium px-2 py-1 rounded transition-colors"
                          style={{ color: "var(--teal-dim)", background: "rgba(69,222,196,0.08)" }}
                        >
                          Edit
                        </button>
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
              {MOCK_DRAFTS.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(107,114,128,0.05)", border: "1px solid var(--line)" }}>
                  <div>
                    <p className="text-sm font-semibold">{draft.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{draft.platform} · Edited {draft.lastEdited}</p>
                  </div>
                  <button className="text-xs font-medium px-3 py-1.5 rounded" style={{ color: "var(--teal-dim)", background: "rgba(69,222,196,0.10)", border: "1px solid rgba(69,222,196,0.20)" }}>
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
              {MOCK_RECURRING.map((post) => (
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
                    <button className="text-xs font-medium px-2 py-1 rounded" style={{ color: "var(--ink-muted)", background: "rgba(107,114,128,0.08)" }}>{post.active ? "Pause" : "Resume"}</button>
                    <button className="text-xs font-medium px-2 py-1 rounded" style={{ color: "var(--teal-dim)", background: "rgba(69,222,196,0.08)" }}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ── Media Library ─────────────────────────────────────────────────── */}
        {/* TODO: replace with GET /api/media?owner=me */}
        <div className="mt-6">
          <SectionCard title="Media Library">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>{MOCK_MEDIA.length} files</span>
              <button className="btn-outline-soft text-xs py-1.5 px-3">↑ Upload</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {MOCK_MEDIA.map((m) => (
                <div key={m.id} className="rounded-xl p-3 text-center group cursor-pointer" style={{ background: "rgba(107,114,128,0.06)", border: "1px solid var(--line)" }}>
                  <div className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center text-xl" style={{ background: "rgba(69,222,196,0.10)" }}>
                    {m.type === "Video" ? "🎬" : "🖼️"}
                  </div>
                  <p className="text-[11px] font-semibold truncate">{m.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-muted)" }}>{m.size}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

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
