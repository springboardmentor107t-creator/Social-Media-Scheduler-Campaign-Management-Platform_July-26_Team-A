/**
 * MarketingPage.tsx — Marketing Team Dashboard
 * Route: /dashboard/marketing
 *
 * Sections with real API backing:
 *   - Role description header (GET /api/roles/Marketing Team)
 *
 * Sections using MOCK DATA (TODO: wire to real endpoints):
 *   - Stat cards
 *   - Campaign Calendar
 *   - Approval Queue
 *   - Campaign List table
 *   - Shared Drafts panel
 *   - Audience Engagement trends chart
 *   - Campaign Reports (export stubs)
 */
import { useEffect, useState } from "react";
import DashboardShell, { type NavItem } from "../../components/DashboardShell";
import RoleGate from "../../components/RoleGate";
import { apiFetch } from "../../services/api";

// ── Nav items ─────────────────────────────────────────────────────────────────
const MARKETING_NAV: NavItem[] = [
  { label: "Dashboard",         href: "/dashboard/marketing" },
  { label: "Campaigns",         href: "/dashboard/campaigns" },
  { label: "Approval Queue",    href: "/dashboard/marketing" },
  { label: "Shared Drafts",     href: "/dashboard/marketing" },
  { label: "Analytics",         href: "/dashboard/analytics" },
  { label: "Campaign Reports",  href: "/dashboard/analytics" },
  { label: "Team",              href: "/dashboard/team" },
  { label: "Profile",           href: "/dashboard/profile" },
  { label: "Settings",          href: "/dashboard/settings" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type ApprovalStatus = "Pending" | "Approved" | "Rejected";
type CampaignStatus = "Active" | "Draft" | "Completed" | "Paused";

interface ApprovalItem {
  id: string;
  title: string;
  submittedBy: string;
  platform: string;
  submittedAt: string;
  status: ApprovalStatus;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  budget: string;
  performance: string;
}

interface SharedDraft {
  id: string;
  title: string;
  author: string;
  platform: string;
  lastEdited: string;
}

// ── Mock data (TODO: replace with real API calls) ─────────────────────────────
const MOCK_STATS = [
  { label: "Active Campaigns",     value: "6",    hint: "across 4 platforms" },
  { label: "Posts Pending Approval",value: "14",   hint: "need review" },
  { label: "This Month's Reach",   value: "128K",  hint: "+18% vs last month" },
  { label: "Team Members",         value: "9",    hint: "2 roles" },
];

const MOCK_APPROVAL_QUEUE: ApprovalItem[] = [
  { id: "a1", title: "Back-to-School Sale Post",  submittedBy: "Mia Chen",    platform: "Instagram", submittedAt: "Today, 9:15 AM",  status: "Pending" },
  { id: "a2", title: "Thought Leadership Article",submittedBy: "James Park",  platform: "LinkedIn",  submittedAt: "Today, 8:42 AM",  status: "Pending" },
  { id: "a3", title: "Weekend Flash Deal",         submittedBy: "Sara Okafor", platform: "Facebook",  submittedAt: "Yesterday, 4 PM", status: "Pending" },
  { id: "a4", title: "Brand Story Video",          submittedBy: "Mia Chen",    platform: "YouTube",   submittedAt: "Jul 29, 11 AM",   status: "Approved" },
];

const MOCK_CAMPAIGNS: Campaign[] = [
  { id: "cp1", name: "Summer Mega Sale",       platform: "Multi",    startDate: "Aug 1",  endDate: "Aug 31", status: "Active",    budget: "$5,000", performance: "CTR 3.2%" },
  { id: "cp2", name: "Back-to-School 2026",    platform: "Instagram",startDate: "Jul 15", endDate: "Sep 1",  status: "Active",    budget: "$2,800", performance: "Reach 42K" },
  { id: "cp3", name: "Brand Awareness Q3",     platform: "LinkedIn", startDate: "Jul 1",  endDate: "Sep 30", status: "Active",    budget: "$3,500", performance: "Impressions 78K" },
  { id: "cp4", name: "Product Launch Teaser",  platform: "X",        startDate: "Aug 10", endDate: "Aug 15", status: "Draft",     budget: "$1,200", performance: "—" },
  { id: "cp5", name: "Q2 Seasonal Campaign",   platform: "Multi",    startDate: "Apr 1",  endDate: "Jun 30", status: "Completed", budget: "$4,000", performance: "ROI 2.4x" },
];

const MOCK_SHARED_DRAFTS: SharedDraft[] = [
  { id: "sd1", title: "August Newsletter Draft",  author: "Mia Chen",    platform: "Email",     lastEdited: "1h ago" },
  { id: "sd2", title: "Partnership Announce Post",author: "James Park",  platform: "LinkedIn",  lastEdited: "3h ago" },
  { id: "sd3", title: "Influencer Collab Brief",  author: "Sara Okafor", platform: "Instagram", lastEdited: "Yesterday" },
];

const ENGAGEMENT_DATA = [
  { label: "Week 27", value: 8200 },
  { label: "Week 28", value: 11400 },
  { label: "Week 29", value: 9800 },
  { label: "Week 30", value: 14200 },
];
const maxEng = Math.max(...ENGAGEMENT_DATA.map((d) => d.value));

// ── Calendar mock — simple week grid ──────────────────────────────────────────
const CALENDAR_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CALENDAR_EVENTS = [
  { day: 0, label: "Instagram Launch", color: "#e879f9" },
  { day: 1, label: "LinkedIn Post",    color: "#3b82f6" },
  { day: 3, label: "FB Flash Sale",    color: "#f59e0b" },
  { day: 4, label: "X Thread",         color: "#6366f1" },
  { day: 5, label: "YouTube Short",    color: "#ef4444" },
];

// ── Status helpers ────────────────────────────────────────────────────────────
const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, { bg: string; color: string }> = {
  Active:    { bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  Draft:     { bg: "rgba(107,114,128,0.14)", color: "var(--ink-muted)" },
  Completed: { bg: "rgba(52,152,219,0.14)",  color: "#2477A8" },
  Paused:    { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
};

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="surface rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Page component ─────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [roleDesc, setRoleDesc] = useState<string>("Team members collaborating on marketing campaigns and social media management.");
  const [approvals, setApprovals] = useState<ApprovalItem[]>(MOCK_APPROVAL_QUEUE);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    // TODO: GET /api/roles/Marketing%20Team
    apiFetch<{ description: string }>("/api/roles/Marketing%20Team")
      .then((d) => setRoleDesc(d.description))
      .catch(() => {});
  }, []);

  const handleApprove = (id: string) => {
    // TODO: POST /api/content/{id}/approve
    setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: "Approved" as const } : a));
  };

  const handleReject = (id: string) => {
    // TODO: POST /api/content/{id}/reject with { reason: rejectionNotes[id] }
    setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: "Rejected" as const } : a));
  };

  return (
    <RoleGate allowedRole="marketing">
      <DashboardShell
        active="Dashboard"
        navItems={MARKETING_NAV}
        roleLabel="Marketing Team"
        pageTitle="Marketing Dashboard"
      >
        {/* Role description banner */}
        <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", color: "var(--ink-muted)" }}>
          {roleDesc}
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────────────── */}
        {/* TODO: GET /api/marketing/stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {MOCK_STATS.map((s) => (
            <div key={s.label} className="surface rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--ink-muted)" }}>{s.label}</p>
              <p className="text-3xl font-bold" style={{ color: "#6366f1" }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{s.hint}</p>
            </div>
          ))}
        </div>

        {/* ── Campaign Calendar ─────────────────────────────────────────────── */}
        {/* TODO: GET /api/campaigns/calendar?view=week */}
        <SectionCard title="Campaign Calendar — This Week">
          <div className="grid grid-cols-7 gap-2">
            {CALENDAR_DAYS.map((day, idx) => {
              const events = CALENDAR_EVENTS.filter((e) => e.day === idx);
              return (
                <div key={day} className="rounded-lg p-2 min-h-[80px]" style={{ background: "rgba(107,114,128,0.05)", border: "1px solid var(--line)" }}>
                  <p className="text-[11px] font-bold mb-2" style={{ color: "var(--ink-muted)" }}>{day}</p>
                  {events.map((e) => (
                    <div key={e.label} className="rounded px-1.5 py-1 text-[10px] font-semibold mb-1 text-white truncate" style={{ background: e.color }}>
                      {e.label}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Approval Queue ────────────────────────────────────────────────── */}
        {/* TODO: GET /api/content?status=pending_approval */}
        <div className="mt-6">
          <SectionCard title="Approval Queue">
            <div className="space-y-4">
              {approvals.map((item) => (
                <div key={item.id} className="p-4 rounded-xl" style={{ background: "rgba(107,114,128,0.04)", border: "1px solid var(--line)" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                        Submitted by <strong>{item.submittedBy}</strong> · {item.platform} · {item.submittedAt}
                      </p>
                      {item.status === "Pending" && (
                        <input
                          type="text"
                          placeholder="Rejection reason (optional)…"
                          value={rejectionNotes[item.id] ?? ""}
                          onChange={(e) => setRejectionNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="input-field mt-2 text-xs py-1.5"
                          style={{ maxWidth: 340 }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "Pending" ? (
                        <>
                          <button onClick={() => handleApprove(item.id)} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>Approve</button>
                          <button onClick={() => handleReject(item.id)} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}>Reject</button>
                        </>
                      ) : (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: item.status === "Approved" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)", color: item.status === "Approved" ? "#10b981" : "#ef4444" }}>{item.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ── Campaign List ──────────────────────────────────────────────────── */}
        {/* TODO: GET /api/campaigns */}
        <div className="mt-6">
          <SectionCard title="Campaigns">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Campaign Name", "Platform", "Start → End", "Status", "Budget", "Performance"].map((h) => (
                      <th key={h} className="pb-3 px-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {MOCK_CAMPAIGNS.map((c) => {
                    const s = CAMPAIGN_STATUS_COLORS[c.status];
                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-2 font-medium">{c.name}</td>
                        <td className="py-3.5 px-2 text-xs" style={{ color: "var(--ink-muted)" }}>{c.platform}</td>
                        <td className="py-3.5 px-2 text-xs" style={{ color: "var(--ink-muted)" }}>{c.startDate} → {c.endDate}</td>
                        <td className="py-3.5 px-2"><span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={s}>{c.status}</span></td>
                        <td className="py-3.5 px-2 text-xs font-medium">{c.budget}</td>
                        <td className="py-3.5 px-2 text-xs" style={{ color: "var(--ink-muted)" }}>{c.performance}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* ── Shared Drafts ─────────────────────────────────────────────────── */}
          {/* TODO: GET /api/content?status=draft&visibility=team */}
          <SectionCard title="Shared Drafts">
            <div className="space-y-3">
              {MOCK_SHARED_DRAFTS.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(107,114,128,0.05)", border: "1px solid var(--line)" }}>
                  <div>
                    <p className="text-sm font-semibold">{d.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>by {d.author} · {d.platform} · {d.lastEdited}</p>
                  </div>
                  <button className="text-xs font-medium px-3 py-1.5 rounded" style={{ color: "var(--teal-dim)", background: "rgba(69,222,196,0.10)", border: "1px solid rgba(69,222,196,0.20)" }}>View</button>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Audience Engagement Trends ─────────────────────────────────────── */}
          {/* TODO: GET /api/analytics/campaigns?metric=engagement&period=4w */}
          <SectionCard title="Audience Engagement Trends">
            <div className="space-y-4">
              {ENGAGEMENT_DATA.map((d) => (
                <div key={d.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: "var(--ink-muted)" }}>{d.label}</span>
                    <span className="font-semibold">{d.value.toLocaleString()} engagements</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(99,102,241,0.08)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(d.value / maxEng) * 100}%`, background: "#6366f1" }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ── Campaign Reports ──────────────────────────────────────────────── */}
        {/* TODO: GET /api/campaigns/reports — export PDF/Excel */}
        <div className="mt-6">
          <SectionCard title="Campaign Reports">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 p-4 rounded-xl" style={{ background: "rgba(107,114,128,0.04)", border: "1px solid var(--line)" }}>
                <p className="font-semibold text-sm">Q3 Performance Summary</p>
                <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Jul 1 – Sep 30 · All Campaigns · 6 platforms</p>
                <div className="flex gap-2 mt-3">
                  <button className="text-xs font-medium px-3 py-1.5 rounded" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.20)" }}>
                    📄 Export PDF
                  </button>
                  <button className="text-xs font-medium px-3 py-1.5 rounded" style={{ background: "rgba(16,185,129,0.10)", color: "#10b981", border: "1px solid rgba(16,185,129,0.20)" }}>
                    📊 Export Excel
                  </button>
                </div>
                <p className="text-[10px] mt-2" style={{ color: "var(--ink-muted)" }}>TODO: wire to real report generation endpoint</p>
              </div>
              <div className="flex-1 p-4 rounded-xl" style={{ background: "rgba(107,114,128,0.04)", border: "1px solid var(--line)" }}>
                <p className="font-semibold text-sm">Monthly Engagement Report</p>
                <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>July 2026 · All campaigns</p>
                <div className="flex gap-2 mt-3">
                  <button className="text-xs font-medium px-3 py-1.5 rounded" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.20)" }}>
                    📄 Export PDF
                  </button>
                  <button className="text-xs font-medium px-3 py-1.5 rounded" style={{ background: "rgba(16,185,129,0.10)", color: "#10b981", border: "1px solid rgba(16,185,129,0.20)" }}>
                    📊 Export Excel
                  </button>
                </div>
                <p className="text-[10px] mt-2" style={{ color: "var(--ink-muted)" }}>TODO: wire to real report generation endpoint</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </DashboardShell>
    </RoleGate>
  );
}
