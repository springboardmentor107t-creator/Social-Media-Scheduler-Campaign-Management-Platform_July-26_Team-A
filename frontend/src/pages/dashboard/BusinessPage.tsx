/**
 * BusinessPage.tsx — Business User Dashboard
 * Route: /dashboard/business
 *
 * Sections with real API backing:
 *   - Role description header (GET /api/roles/Business User)
 *
 * Sections using MOCK DATA (TODO: wire to real endpoints):
 *   - Stat cards
 *   - Multi-brand/account overview grid
 *   - Team management shortcut
 *   - Business analytics (ROI, engagement, growth charts)
 *   - Final approval queue
 *   - Integrations panel
 *   - Brand consistency notes
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell, { type NavItem } from "../../components/DashboardShell";
import RoleGate from "../../components/RoleGate";
import { apiFetch } from "../../services/api";

// ── Nav items ─────────────────────────────────────────────────────────────────
const BUSINESS_NAV: NavItem[] = [
  { label: "Dashboard",        href: "/dashboard/business" },
  { label: "Campaigns",        href: "/dashboard/campaigns" },
  { label: "Analytics",        href: "/dashboard/analytics" },
  { label: "Final Approval",   href: "/dashboard/business" },
  { label: "Team",             href: "/dashboard/team" },
  { label: "Integrations",     href: "/dashboard/connect" },
  { label: "Profile",          href: "/dashboard/profile" },
  { label: "Settings",         href: "/dashboard/settings" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type PlatformStatus = "Connected" | "Disconnected" | "Expired";

interface SocialAccount {
  id: string;
  brand: string;
  platform: string;
  handle: string;
  status: PlatformStatus;
  followers: string;
}

interface FinalApprovalItem {
  id: string;
  title: string;
  submittedBy: string;
  platform: string;
  approvedByMarketing: boolean;
  submittedAt: string;
}

interface BrandFlag {
  id: string;
  message: string;
  count: number;
  severity: "high" | "medium" | "low";
}

// ── Mock data (TODO: replace with real API calls) ─────────────────────────────
const MOCK_STATS = [
  { label: "Connected Accounts",  value: "14",  hint: "across 3 brands" },
  { label: "Active Campaigns",    value: "9",   hint: "platform-wide" },
  { label: "Team Size",           value: "24",  hint: "5 roles" },
  { label: "ROI This Month",      value: "3.1x",hint: "+0.4x vs last month" },
];

const MOCK_ACCOUNTS: SocialAccount[] = [
  { id: "sa1", brand: "Acme Corp",    platform: "Instagram", handle: "@acmecorp",    status: "Connected",    followers: "12.4K" },
  { id: "sa2", brand: "Acme Corp",    platform: "LinkedIn",  handle: "Acme Corp",    status: "Connected",    followers: "8.1K" },
  { id: "sa3", brand: "Acme Corp",    platform: "X",         handle: "@acmecorp",    status: "Connected",    followers: "5.3K" },
  { id: "sa4", brand: "BrandX",       platform: "Instagram", handle: "@brandx",      status: "Connected",    followers: "31.7K" },
  { id: "sa5", brand: "BrandX",       platform: "YouTube",   handle: "BrandX Tube",  status: "Connected",    followers: "9.8K" },
  { id: "sa6", brand: "BrandX",       platform: "TikTok",    handle: "@brandxtok",   status: "Expired",      followers: "22K" },
  { id: "sa7", brand: "SubBrand Y",   platform: "Facebook",  handle: "SubBrand Y",   status: "Connected",    followers: "4.2K" },
  { id: "sa8", brand: "SubBrand Y",   platform: "Pinterest", handle: "subbrandy",    status: "Disconnected", followers: "1.1K" },
];

const MOCK_FINAL_APPROVAL: FinalApprovalItem[] = [
  { id: "fa1", title: "Q3 Campaign Launch Video",    submittedBy: "Marketing Team", platform: "YouTube",   approvedByMarketing: true,  submittedAt: "Today, 11:30 AM" },
  { id: "fa2", title: "Brand Partnership Reveal",    submittedBy: "Marketing Team", platform: "Instagram", approvedByMarketing: true,  submittedAt: "Today, 9:00 AM" },
  { id: "fa3", title: "Press Release Post",          submittedBy: "Marketing Team", platform: "LinkedIn",  approvedByMarketing: true,  submittedAt: "Yesterday, 5 PM" },
];

const MOCK_BRAND_FLAGS: BrandFlag[] = [
  { id: "bf1", message: "3 posts flagged for off-brand tone this week",   count: 3, severity: "high" },
  { id: "bf2", message: "1 post missing brand hashtag #AcmeLife",         count: 1, severity: "medium" },
  { id: "bf3", message: "2 posts used unapproved competitor mentions",    count: 2, severity: "high" },
  { id: "bf4", message: "5 posts exceeded recommended caption length",    count: 5, severity: "low" },
];

// ── Analytics mock data ────────────────────────────────────────────────────────
const ROI_DATA   = [{ label: "May", v: 2.1 }, { label: "Jun", v: 2.6 }, { label: "Jul", v: 3.1 }];
const ENG_DATA   = [{ label: "May", v: 62000 }, { label: "Jun", v: 81000 }, { label: "Jul", v: 97000 }];
const GROWTH_DATA= [{ label: "May", v: 4200 }, { label: "Jun", v: 5100 }, { label: "Jul", v: 6400 }];

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<PlatformStatus, { bg: string; color: string }> = {
  Connected:    { bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  Disconnected: { bg: "rgba(107,114,128,0.14)", color: "var(--ink-muted)" },
  Expired:      { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
};

const SEV_COLORS: Record<string, { bg: string; color: string }> = {
  high:   { bg: "rgba(239,68,68,0.10)",  color: "#ef4444" },
  medium: { bg: "rgba(245,158,11,0.10)", color: "#f59e0b" },
  low:    { bg: "rgba(107,114,128,0.10)",color: "var(--ink-muted)" },
};

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸", LinkedIn: "💼", X: "𝕏", YouTube: "▶️",
  Facebook: "👥", Pinterest: "📌", TikTok: "🎵",
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

function MiniChart({ data, max, color, format }: { data: { label: string; v: number }[]; max: number; color: string; format: (v: number) => string }) {
  return (
    <div className="flex items-end gap-3 h-16">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-md" style={{ height: `${(d.v / max) * 52}px`, background: color, opacity: 0.85 }} />
          <span className="text-[10px]" style={{ color: "var(--ink-muted)" }}>{d.label}</span>
          <span className="text-[10px] font-semibold">{format(d.v)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page component ─────────────────────────────────────────────────────────────
export default function BusinessPage() {
  const [roleDesc, setRoleDesc] = useState<string>("Organizations and businesses managing multiple brands, teams, and social media accounts.");
  const [finalApprovals, setFinalApprovals] = useState<FinalApprovalItem[]>(MOCK_FINAL_APPROVAL);

  useEffect(() => {
    // TODO: GET /api/roles/Business%20User
    apiFetch<{ description: string }>("/api/roles/Business%20User")
      .then((d) => setRoleDesc(d.description))
      .catch(() => {});
  }, []);

  const handleFinalApprove = (id: string) => {
    // TODO: POST /api/content/{id}/publish (final approval triggers publish)
    setFinalApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  const handleFinalReject = (id: string) => {
    // TODO: POST /api/content/{id}/reject
    setFinalApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  // Group accounts by brand
  const brands = Array.from(new Set(MOCK_ACCOUNTS.map((a) => a.brand)));

  return (
    <RoleGate allowedRole="business">
      <DashboardShell
        active="Dashboard"
        navItems={BUSINESS_NAV}
        roleLabel="Business User"
        pageTitle="Business Dashboard"
      >
        {/* Role description banner */}
        <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)", color: "var(--ink-muted)" }}>
          {roleDesc}
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────────────── */}
        {/* TODO: GET /api/business/stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {MOCK_STATS.map((s) => (
            <div key={s.label} className="surface rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--ink-muted)" }}>{s.label}</p>
              <p className="text-3xl font-bold" style={{ color: "#f59e0b" }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{s.hint}</p>
            </div>
          ))}
        </div>

        {/* ── Multi-brand account overview ──────────────────────────────────── */}
        {/* TODO: GET /api/social-accounts?all_brands=true */}
        <SectionCard title="Brand & Account Overview">
          <div className="space-y-6">
            {brands.map((brand) => {
              const accounts = MOCK_ACCOUNTS.filter((a) => a.brand === brand);
              return (
                <div key={brand}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--ink-muted)" }}>{brand}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {accounts.map((acc) => {
                      const s = STATUS_STYLES[acc.status];
                      return (
                        <div key={acc.id} className="p-3 rounded-xl" style={{ background: "rgba(107,114,128,0.05)", border: "1px solid var(--line)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{PLATFORM_ICONS[acc.platform] ?? "🌐"}</span>
                            <span className="text-xs font-semibold">{acc.platform}</span>
                          </div>
                          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{acc.handle}</p>
                          <p className="text-xs font-semibold mt-1">{acc.followers} followers</p>
                          <span className="mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={s}>{acc.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Team management shortcut ──────────────────────────────────────── */}
        <div className="mt-6">
          <div className="surface rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)" }}>Team Management</h2>
              <p className="text-2xl font-bold">24 <span className="text-base font-normal" style={{ color: "var(--ink-muted)" }}>team members</span></p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Content Creators · Marketing Team · Administrators</p>
            </div>
            <Link to="/dashboard/team" className="btn-outline-soft text-sm py-2.5 px-5 shrink-0">
              Manage Team →
            </Link>
          </div>
        </div>

        {/* ── Business Analytics ────────────────────────────────────────────── */}
        {/* TODO: GET /api/analytics/business?period=3m — ROI, engagement, growth */}
        <div className="mt-6">
          <SectionCard title="Business Analytics">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-muted)" }}>ROI (×)</p>
                <MiniChart data={ROI_DATA} max={4} color="#f59e0b" format={(v) => `${v}×`} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-muted)" }}>Total Engagements</p>
                <MiniChart data={ENG_DATA} max={120000} color="#6366f1" format={(v) => `${(v / 1000).toFixed(0)}K`} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-muted)" }}>Follower Growth</p>
                <MiniChart data={GROWTH_DATA} max={8000} color="#10b981" format={(v) => `+${(v / 1000).toFixed(1)}K`} />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Final Approval Queue ──────────────────────────────────────────── */}
        {/* TODO: GET /api/content?status=pending_final_approval */}
        <div className="mt-6">
          <SectionCard title="Final Approval Queue">
            {finalApprovals.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--ink-muted)" }}>All caught up — no content awaiting final approval. 🎉</p>
            ) : (
              <div className="space-y-3">
                {finalApprovals.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(107,114,128,0.04)", border: "1px solid var(--line)" }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{item.title}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                          ✓ Marketing Approved
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                        {item.platform} · by {item.submittedBy} · {item.submittedAt}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleFinalApprove(item.id)} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                        Approve & Publish
                      </button>
                      <button onClick={() => handleFinalReject(item.id)} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* ── Integrations Panel ────────────────────────────────────────────── */}
          {/* TODO: GET /api/integrations/status */}
          <SectionCard title="Integrations" action={<Link to="/dashboard/connect" className="text-xs font-medium" style={{ color: "var(--teal-dim)" }}>Manage →</Link>}>
            <div className="space-y-2">
              {["Instagram", "Facebook", "LinkedIn", "X", "YouTube", "Pinterest"].map((p) => {
                const connected = MOCK_ACCOUNTS.some((a) => a.platform === p && a.status === "Connected");
                return (
                  <div key={p} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span>{PLATFORM_ICONS[p] ?? "🌐"}</span>
                      <span className="text-sm font-medium">{p}</span>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={connected ? STATUS_STYLES.Connected : STATUS_STYLES.Disconnected}>
                      {connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* ── Brand Consistency Notes ────────────────────────────────────────── */}
          {/* MOCK: No real detection logic — flagged items simulated */}
          {/* TODO: replace with GET /api/brand-consistency/flags (not built yet) */}
          <SectionCard title="Brand Consistency">
            <div className="space-y-3">
              {MOCK_BRAND_FLAGS.map((flag) => {
                const s = SEV_COLORS[flag.severity];
                return (
                  <div key={flag.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
                    <span className="text-lg shrink-0">{flag.severity === "high" ? "🚨" : flag.severity === "medium" ? "⚠️" : "💡"}</span>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: s.color }}>{flag.message}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-muted)" }}>Auto-detected · mock data</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </DashboardShell>
    </RoleGate>
  );
}
