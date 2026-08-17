/**
 * DashboardShell.tsx
 *
 * Shared layout wrapper for all dashboard pages.
 *
 * Props:
 *  - active       : label of the currently active nav item (highlights it)
 *  - navItems     : optional custom nav array for role-specific sidebar items.
 *                   If omitted, falls back to the default NAV (shared pages).
 *  - roleLabel    : optional eyebrow text above the page title (e.g. "Content Creator")
 *  - pageTitle    : optional explicit <h1> override (defaults to `active`)
 *  - children     : page content
 */
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import NotificationCenter from "./NotificationCenter";
import { clearSession } from "../services/api";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

// Default nav — used by non-role-specific pages (Profile, Team, Connect, Settings)
const DEFAULT_NAV: NavItem[] = [
  { label: "Dashboard",        href: "/dashboard" },
  { label: "Campaigns",        href: "/dashboard/campaigns" },
  { label: "Analytics",        href: "/dashboard/analytics" },
  { label: "Profile",          href: "/dashboard/profile" },
  { label: "Connect Accounts", href: "/dashboard/connect" },
  { label: "Team",             href: "/dashboard/team" },
  { label: "Calendar",         href: "/dashboard/calendar" },
  { label: "Preview",          href: "/dashboard/preview" },
  { label: "Settings",         href: "/dashboard/settings" },
];

interface DashboardShellProps {
  active?: string;
  navItems?: NavItem[];
  roleLabel?: string;
  pageTitle?: string;
  children: React.ReactNode;
}

export default function DashboardShell({
  active = "Dashboard",
  navItems,
  roleLabel,
  pageTitle,
  children,
}: DashboardShellProps) {
  const navigate = useNavigate();
  const nav = navItems ?? DEFAULT_NAV;
  const title = pageTitle ?? active;

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr] bg-canvas-light dark:bg-canvas-dark text-ink-light dark:text-ink-dark font-sans">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col justify-between p-5 bg-canvas-light dark:bg-canvas-dark"
        style={{ borderRight: "1px solid var(--line)" }}
      >
        <div>
          <div className="flex items-center gap-2 px-2 mb-8">
            <span className="w-6 h-6 rounded-full bg-teal" />
            <span className="font-semibold text-[15px]">SocialPilot</span>
          </div>
          <nav className="space-y-1" aria-label="Main navigation">
            {nav.map((item) => {
              const isActive = item.label === active;
              return (
                <Link
                  key={item.href + item.label}
                  to={item.href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={
                    isActive
                      ? { background: "var(--teal)", color: "#06231D" }
                      : { color: "var(--ink-muted)" }
                  }
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon && (
                    <span className="opacity-70 shrink-0">{item.icon}</span>
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Log out */}
        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-2 text-sm font-medium text-left w-full"
          style={{ color: "var(--ink-muted)", borderTop: "1px solid var(--line)" }}
        >
          Log out
        </button>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="p-6 md:p-10">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div>
            {roleLabel && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-light dark:text-muted-dark">
                {roleLabel}
              </p>
            )}
            <h1 className="text-2xl font-semibold mt-1">{title}</h1>
          </div>

          {/* Topbar right: notifications + ⌘K hint + theme toggle */}
          <div className="flex items-center gap-2">
            <NotificationCenter />

            {/* ⌘K hint badge */}
            <button
              onClick={() => {
                const e = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
                window.dispatchEvent(e);
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: "rgba(107,114,128,0.08)",
                color: "var(--ink-muted)",
                border: "1px solid var(--line)",
                cursor: "pointer",
              }}
              aria-label="Open command palette (Ctrl+K)"
              title="Command Palette (Ctrl+K)"
            >
              <span>⌘K</span>
            </button>

            <ThemeToggle />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
