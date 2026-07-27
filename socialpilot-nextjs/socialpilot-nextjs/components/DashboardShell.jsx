"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Connect Accounts", href: "/dashboard/connect" },
  { label: "Team", href: "/dashboard/team" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardShell({ active = "Dashboard", children }) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside
        className="hidden md:flex flex-col justify-between p-5"
        style={{ background: "var(--bg-canvas)", borderRight: "1px solid var(--line)" }}
      >
        <div>
          <div className="flex items-center gap-2 px-2 mb-8">
            <span className="w-6 h-6 rounded-full" style={{ background: "var(--teal)" }} />
            <span className="font-semibold text-[15px]">SocialPilot</span>
          </div>
          <nav className="space-y-1">
            {NAV.map((item) => {
              const isActive = item.label === active;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={
                    isActive
                      ? { background: "var(--teal)", color: "#06231D" }
                      : { color: "var(--ink-muted)" }
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-sm font-medium"
          style={{ color: "var(--ink-muted)", borderTop: "1px solid var(--line)" }}
        >
          Log out
        </Link>
      </aside>

      <main className="p-6 md:p-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
              Milestone 1 · Core Setup
            </p>
            <h1 className="text-2xl font-semibold mt-1">{active}</h1>
          </div>
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
