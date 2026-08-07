/**
 * AdminPage.tsx — Administrator Dashboard
 * Route: /dashboard/admin
 *
 * Sections with real API backing:
 *   - Role description header (GET /api/roles/Administrator)
 *
 * Sections using MOCK DATA (TODO: wire to real endpoints):
 *   - Stat cards (total users, active sessions, system uptime, pending issues)
 *   - Platform health panel (API status, DB status, job queue)
 *   - Security & access control (recent role changes, failed logins)
 *   - Activity/audit log
 *   - Publishing queue monitor (system-wide)
 *   - Platform-wide reports
 *   - API/integration configuration (read-only status — NO secrets exposed)
 *
 * NOTE: API keys are intentionally NOT rendered — only masked status badges.
 */
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardShell, { type NavItem } from "../../components/DashboardShell";
import RoleGate from "../../components/RoleGate";
import { StatCardSkeleton } from "../../components/Skeleton";
import { apiFetch } from "../../services/api";
import { getAuditLog, type AuditEntry as MockAuditEntry, type AuditActionType } from "../../lib/mockData";

// ── Nav items ─────────────────────────────────────────────────────────────────
const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard",       href: "/dashboard/admin" },
  { label: "User Management", href: "/dashboard/team" },
  { label: "Platform Health", href: "/dashboard/admin" },
  { label: "Security",        href: "/dashboard/admin" },
  { label: "Audit Log",       href: "/dashboard/admin" },
  { label: "Publishing Queue",href: "/dashboard/admin" },
  { label: "Reports",         href: "/dashboard/admin" },
  { label: "API Config",      href: "/dashboard/admin" },
  { label: "Settings",        href: "/dashboard/settings" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type HealthStatus = "Operational" | "Degraded" | "Down";
type PublishStatus = "Scheduled" | "In-Flight" | "Failed" | "Published";

interface HealthCheck {
  id: string;
  service: string;
  status: HealthStatus;
  latency?: string;
}

interface SecurityEvent {
  id: string;
  type: "role_change" | "failed_login" | "account_deactivated";
  description: string;
  actor: string;
  timestamp: string;
}

interface LegacyAuditEntry {
  id: string;
  event: string;
  actor: string;
  target: string;
  timestamp: string;
}

interface PublishQueueItem {
  id: string;
  title: string;
  owner: string;
  platform: string;
  status: PublishStatus;
  scheduledFor: string;
}

interface PlatformApiConfig {
  platform: string;
  icon: string;
  configured: boolean;
  lastVerified: string;
}

// ── Mock data (TODO: replace with real API calls) ─────────────────────────────
const MOCK_STATS = [
  { label: "Total Users",          value: "142",   hint: "12 added this month" },
  { label: "Active Sessions",      value: "38",    hint: "right now" },
  { label: "System Uptime",        value: "99.8%", hint: "last 30 days" },
  { label: "Pending Support Issues",value: "5",    hint: "3 open, 2 in-progress" },
];

// TODO: replace with GET /api/admin/health (no real monitoring endpoint yet)
const MOCK_HEALTH: HealthCheck[] = [
  { id: "h1", service: "REST API",            status: "Operational", latency: "42ms" },
  { id: "h2", service: "PostgreSQL DB",        status: "Operational", latency: "8ms" },
  { id: "h3", service: "MongoDB",             status: "Operational", latency: "12ms" },
  { id: "h4", service: "Background Job Queue",status: "Operational", latency: "—" },
  { id: "h5", service: "Email Service",       status: "Degraded",    latency: "350ms" },
  { id: "h6", service: "CDN / Media Storage", status: "Operational", latency: "18ms" },
];

// TODO: replace with GET /api/admin/audit-log?type=security&limit=8
const MOCK_SECURITY: SecurityEvent[] = [
  { id: "s1", type: "role_change",         description: "james_park → Manager to Admin",   actor: "admin@company.com", timestamp: "Today, 10:42 AM" },
  { id: "s2", type: "failed_login",        description: "5 failed attempts (locked)",       actor: "unknown@hack.io",   timestamp: "Today, 9:17 AM" },
  { id: "s3", type: "account_deactivated", description: "bob_jones deactivated",            actor: "admin@company.com", timestamp: "Jul 30, 4:55 PM" },
  { id: "s4", type: "role_change",         description: "sara_okafor → User to Manager",    actor: "admin@company.com", timestamp: "Jul 30, 2:30 PM" },
  { id: "s5", type: "failed_login",        description: "3 failed attempts",                actor: "test@example.net",  timestamp: "Jul 29, 11:08 PM" },
];

// TODO: replace with GET /api/admin/audit-log?limit=8
// NOTE: MOCK_AUDIT kept here for reference but replaced by getAuditLog() from mockData
const _LEGACY_AUDIT: LegacyAuditEntry[] = [
  { id: "a1", event: "User role changed",     actor: "admin@co.com", target: "james_park",  timestamp: "Today, 10:42 AM" },
  { id: "a2", event: "New user registered",   actor: "system",       target: "new_user_42", timestamp: "Today, 10:15 AM" },
  { id: "a3", event: "Campaign approved",     actor: "manager@co.com",target: "campaign-88",timestamp: "Today, 9:55 AM" },
  { id: "a4", event: "Post published",        actor: "creator1",     target: "post-204",    timestamp: "Today, 9:30 AM" },
  { id: "a5", event: "Account deactivated",   actor: "admin@co.com", target: "bob_jones",   timestamp: "Jul 30, 4:55 PM" },
  { id: "a6", event: "API key rotated",       actor: "admin@co.com", target: "Instagram API",timestamp: "Jul 30, 2:10 PM" },
];
void _LEGACY_AUDIT; // replaced by getAuditLog() from lib/mockData.ts

// TODO: replace with GET /api/admin/publishing-queue?all_users=true
const MOCK_PUBLISH_QUEUE: PublishQueueItem[] = [
  { id: "pq1", title: "Summer Sale Post",      owner: "mia_chen",   platform: "Instagram", status: "Scheduled",  scheduledFor: "Aug 2, 10 AM" },
  { id: "pq2", title: "Partnership Reveal",    owner: "james_park", platform: "LinkedIn",  status: "In-Flight",  scheduledFor: "Posting now…" },
  { id: "pq3", title: "Brand Story Video",     owner: "sara_okafor",platform: "YouTube",   status: "Published",  scheduledFor: "Jul 30, 2 PM" },
  { id: "pq4", title: "Flash Deal Thread",     owner: "creator_5",  platform: "X",         status: "Failed",     scheduledFor: "Jul 29, 8 AM" },
  { id: "pq5", title: "Monthly Recap Post",    owner: "creator_2",  platform: "Facebook",  status: "Scheduled",  scheduledFor: "Aug 1, 12 PM" },
];

// Read-only API config — keys are NEVER exposed, only presence status
// TODO: replace with GET /api/admin/integrations/status (read-only)
const MOCK_API_CONFIG: PlatformApiConfig[] = [
  { platform: "Instagram/Facebook", icon: "📸", configured: true,  lastVerified: "Jul 31, 8:00 AM" },
  { platform: "LinkedIn",           icon: "💼", configured: true,  lastVerified: "Jul 31, 8:00 AM" },
  { platform: "X (Twitter)",        icon: "𝕏",  configured: true,  lastVerified: "Jul 31, 8:00 AM" },
  { platform: "YouTube",            icon: "▶️", configured: true,  lastVerified: "Jul 30, 11:00 PM" },
  { platform: "Pinterest",          icon: "📌", configured: false, lastVerified: "Not configured" },
  { platform: "TikTok",             icon: "🎵", configured: false, lastVerified: "Not configured" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const HEALTH_COLORS: Record<HealthStatus, { bg: string; color: string; dot: string }> = {
  Operational: { bg: "rgba(16,185,129,0.12)",  color: "#10b981",          dot: "#10b981" },
  Degraded:    { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b",          dot: "#f59e0b" },
  Down:        { bg: "rgba(239,68,68,0.12)",   color: "#ef4444",          dot: "#ef4444" },
};

const PUBLISH_COLORS: Record<PublishStatus, { bg: string; color: string }> = {
  Scheduled:  { bg: "rgba(52,152,219,0.14)",  color: "#2477A8" },
  "In-Flight":{ bg: "rgba(99,102,241,0.14)",  color: "#6366f1" },
  Published:  { bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  Failed:     { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
};

const SECURITY_ICONS: Record<SecurityEvent["type"], string> = {
  role_change:         "🔑",
  failed_login:        "⚠️",
  account_deactivated: "🔒",
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
export default function AdminPage() {
  const [roleDesc, setRoleDesc] = useState<string>("Platform administrators responsible for system management, security, and monitoring.");
  const [statsLoading, setStatsLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<MockAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditTypeFilter, setAuditTypeFilter] = useState<AuditActionType | "all">("all");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");

  useEffect(() => {
    // TODO: GET /api/roles/Administrator
    apiFetch<{ description: string }>("/api/roles/Administrator")
      .then((d) => setRoleDesc(d.description))
      .catch(() => {});
  }, []);

  // Simulate ≥500ms skeleton for stat cards
  useEffect(() => {
    const t = setTimeout(() => setStatsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // TODO: Replace with GET /api/admin/audit-log — mock endpoint does not exist yet
  useEffect(() => {
    getAuditLog().then(data => { setAuditLog(data); setAuditLoading(false); });
  }, []);

  const ACTION_TYPE_LABELS: Record<AuditActionType, string> = {
    role_changed: "Role Changed", member_removed: "Member Removed",
    account_deactivated: "Deactivated", account_activated: "Activated",
    post_deleted: "Post Deleted", campaign_approved: "Campaign Approved",
    api_key_rotated: "API Key Rotated", invite_sent: "Invite Sent",
    login_failed: "Login Failed",
  };

  const ACTION_TYPE_COLORS: Record<AuditActionType, string> = {
    role_changed: "#6366f1", member_removed: "#ef4444", account_deactivated: "#ef4444",
    account_activated: "#10b981", post_deleted: "#f59e0b", campaign_approved: "#10b981",
    api_key_rotated: "#3b82f6", invite_sent: "var(--teal-dim)", login_failed: "#ef4444",
  };

  const filteredAudit = useMemo(() => {
    return auditLog.filter(entry => {
      if (auditTypeFilter !== "all" && entry.actionType !== auditTypeFilter) return false;
      if (auditDateFrom && new Date(entry.timestamp) < new Date(auditDateFrom)) return false;
      if (auditDateTo && new Date(entry.timestamp) > new Date(auditDateTo + "T23:59:59")) return false;
      return true;
    });
  }, [auditLog, auditTypeFilter, auditDateFrom, auditDateTo]);

  function relTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <RoleGate allowedRole="admin">
      <DashboardShell
        active="Dashboard"
        navItems={ADMIN_NAV}
        roleLabel="Administrator"
        pageTitle="Admin Dashboard"
      >
        {/* Role description banner */}
        <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", color: "var(--ink-muted)" }}>
          {roleDesc}
        </div>

        {/* ── Stat cards (skeleton while loading) ─────────────────────── */}
        {/* TODO: GET /api/admin/stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading
            ? [1,2,3,4].map(i => <StatCardSkeleton key={i} />)
            : MOCK_STATS.map((s) => (
              <div key={s.label} className="surface rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--ink-muted)" }}>{s.label}</p>
                <p className="text-3xl font-bold" style={{ color: "#ef4444" }}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{s.hint}</p>
              </div>
            ))}
        </div>

        {/* ── User Management shortcut ──────────────────────────────────────── */}
        {/* Reuses the existing TeamPage (GET /users, PATCH /users/{id}/role) */}
        <div className="surface rounded-2xl p-6 shadow-sm flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)" }}>User Management</h2>
            <p className="text-2xl font-bold">142 <span className="text-base font-normal" style={{ color: "var(--ink-muted)" }}>registered users</span></p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Manage roles via GET /users · PATCH /users/{"{id}"}/role</p>
          </div>
          <Link to="/dashboard/team" className="btn-primary-teal text-sm py-2.5 px-5 shrink-0">
            Manage Users →
          </Link>
        </div>

        {/* ── Platform Health ───────────────────────────────────────────────── */}
        {/* TODO: replace stub with GET /api/admin/health when monitoring is built */}
        <SectionCard title="Platform Health">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MOCK_HEALTH.map((h) => {
              const s = HEALTH_COLORS[h.status];
              return (
                <div key={h.id} className="p-4 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.color}33` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
                    <span className="text-xs font-bold" style={{ color: s.color }}>{h.status}</span>
                  </div>
                  <p className="text-sm font-semibold">{h.service}</p>
                  {h.latency && <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>Latency: {h.latency}</p>}
                </div>
              );
            })}
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* ── Security & Access Control ──────────────────────────────────────── */}
          {/* TODO: GET /api/admin/security-events?limit=5 */}
          <SectionCard title="Security & Access Control">
            <div className="space-y-3">
              {MOCK_SECURITY.map((evt) => (
                <div key={evt.id} className="flex items-start gap-3 text-sm">
                  <span className="text-lg shrink-0 mt-0.5">{SECURITY_ICONS[evt.type]}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{evt.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{evt.actor} · {evt.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Audit Log ───────────────────────────────────────────── */}
          {/* TODO: GET /api/admin/audit-log — replace mock when endpoint exists */}
          <SectionCard
            title="Audit Log"
            action={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                🚧 Mock data — needs GET /api/admin/audit-log
              </span>
            }
          >
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={auditTypeFilter}
                onChange={e => setAuditTypeFilter(e.target.value as AuditActionType | "all")}
                className="input-field py-1.5 text-xs"
                style={{ width: 180 }}
                aria-label="Filter by action type"
              >
                <option value="all">All action types</option>
                {(Object.keys({
                  role_changed: 1, member_removed: 1, account_deactivated: 1, account_activated: 1,
                  post_deleted: 1, campaign_approved: 1, api_key_rotated: 1, invite_sent: 1, login_failed: 1,
                }) as AuditActionType[]).map(t => (
                  <option key={t} value={t}>{ACTION_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input type="date" value={auditDateFrom} onChange={e => setAuditDateFrom(e.target.value)} className="input-field py-1.5 text-xs" style={{ width: 140 }} aria-label="From date" />
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>to</span>
                <input type="date" value={auditDateTo} onChange={e => setAuditDateTo(e.target.value)} className="input-field py-1.5 text-xs" style={{ width: 140 }} aria-label="To date" />
              </div>
              {(auditTypeFilter !== "all" || auditDateFrom || auditDateTo) && (
                <button onClick={() => { setAuditTypeFilter("all"); setAuditDateFrom(""); setAuditDateTo(""); }} className="text-xs" style={{ color: "var(--teal-dim)" }}>Clear filters</button>
              )}
            </div>

            {auditLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 rounded skeleton" />)}</div>
            ) : filteredAudit.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--ink-muted)" }}>No entries match your filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid var(--line)" }}>
                      {["Time", "Actor", "Action", "Target", "Before", "After"].map(h => (
                        <th key={h} className="pb-2 px-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {filteredAudit.map(entry => (
                      <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-2 whitespace-nowrap" style={{ color: "var(--ink-muted)" }}>{relTime(entry.timestamp)}</td>
                        <td className="py-2.5 px-2 font-medium" style={{ color: "var(--ink)" }}>{entry.actor}</td>
                        <td className="py-2.5 px-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: `${ACTION_TYPE_COLORS[entry.actionType]}18`, color: ACTION_TYPE_COLORS[entry.actionType] }}
                          >
                            {ACTION_TYPE_LABELS[entry.actionType]}
                          </span>
                        </td>
                        <td className="py-2.5 px-2" style={{ color: "var(--ink)" }}>{entry.target}</td>
                        <td className="py-2.5 px-2" style={{ color: "var(--ink-muted)" }}>{entry.before ?? "—"}</td>
                        <td className="py-2.5 px-2" style={{ color: entry.after ? "var(--teal-dim)" : "var(--ink-muted)" }}>{entry.after ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

        </div>

        {/* ── Publishing Queue Monitor ──────────────────────────────────────── */}
        {/* TODO: GET /api/admin/publishing-queue?all_users=true */}
        <div className="mt-6">
          <SectionCard title="Publishing Queue Monitor — System-Wide">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Post Title", "Owner", "Platform", "Status", "Scheduled For"].map((h) => (
                      <th key={h} className="pb-3 px-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {MOCK_PUBLISH_QUEUE.map((item) => {
                    const s = PUBLISH_COLORS[item.status];
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-2 font-medium">{item.title}</td>
                        <td className="py-3.5 px-2 text-xs" style={{ color: "var(--ink-muted)" }}>{item.owner}</td>
                        <td className="py-3.5 px-2 text-xs" style={{ color: "var(--ink-muted)" }}>{item.platform}</td>
                        <td className="py-3.5 px-2"><span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={s}>{item.status}</span></td>
                        <td className="py-3.5 px-2 text-xs" style={{ color: "var(--ink-muted)" }}>{item.scheduledFor}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* ── Platform-wide Reports ─────────────────────────────────────────── */}
        {/* TODO: GET /api/admin/reports */}
        <div className="mt-6">
          <SectionCard title="Platform-Wide Reports">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: "All-Team Performance",   period: "July 2026",    stat: "142 users · 38 active" },
                { name: "Publishing Success Rate", period: "Last 30 days", stat: "94.2% success rate" },
                { name: "Engagement Overview",     period: "Q3 2026",      stat: "1.2M total impressions" },
              ].map((r) => (
                <div key={r.name} className="p-4 rounded-xl" style={{ background: "rgba(107,114,128,0.04)", border: "1px solid var(--line)" }}>
                  <p className="font-semibold text-sm">{r.name}</p>
                  <p className="text-xs mt-0.5 mb-2" style={{ color: "var(--ink-muted)" }}>{r.period} · {r.stat}</p>
                  <div className="flex gap-2">
                    <button className="text-xs font-medium px-2.5 py-1 rounded" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.20)" }}>PDF</button>
                    <button className="text-xs font-medium px-2.5 py-1 rounded" style={{ background: "rgba(16,185,129,0.10)", color: "#10b981", border: "1px solid rgba(16,185,129,0.20)" }}>Excel</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ── API / Integration Configuration ───────────────────────────────── */}
        {/* READ-ONLY STATUS VIEW — API keys are NEVER exposed here */}
        {/* TODO: GET /api/admin/integrations/status */}
        <div className="mt-6">
          <SectionCard
            title="API / Integration Configuration"
            action={<span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}>🔒 Keys managed server-side only</span>}
          >
            <p className="text-xs mb-4" style={{ color: "var(--ink-muted)" }}>
              Status-only view. API credentials are stored securely server-side and are never transmitted to the frontend.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MOCK_API_CONFIG.map((cfg) => (
                <div key={cfg.platform} className="p-4 rounded-xl" style={{ background: "rgba(107,114,128,0.05)", border: "1px solid var(--line)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{cfg.icon}</span>
                    <span className="text-sm font-semibold">{cfg.platform}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={cfg.configured ? { background: "rgba(16,185,129,0.12)", color: "#10b981" } : { background: "rgba(107,114,128,0.12)", color: "var(--ink-muted)" }}>
                    {cfg.configured ? "✓ Configured" : "Not configured"}
                  </span>
                  <p className="text-[10px] mt-2" style={{ color: "var(--ink-muted)" }}>Verified: {cfg.lastVerified}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </DashboardShell>
    </RoleGate>
  );
}
