/**
 * CommandPalette.tsx — Global Cmd/Ctrl+K command palette.
 *
 * Mounted once in AppRoutes.tsx as a sibling of <Routes> so it's available
 * on every page without remounting.
 *
 * Keyboard behaviour:
 *   Cmd/Ctrl+K  — open
 *   Escape       — close
 *   ArrowUp/Down — move selection
 *   Enter        — execute selected item
 *
 * Groups:
 *   Navigate — Dashboard, Profile, Connect Accounts, Team, Settings
 *   Actions  — Create a post, Connect a platform, Invite teammate
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ─── Command definitions ──────────────────────────────────────────────────────

interface Command {
  id: string;
  label: string;
  group: "Navigate" | "Actions";
  icon: React.ReactNode;
  action: (nav: ReturnType<typeof useNavigate>, showToast: (m: string) => void) => void;
}

const NavIcon = ({ path }: { path: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
);

const ALL_COMMANDS: Command[] = [
  // Navigate
  {
    id: "nav-dashboard",
    label: "Dashboard",
    group: "Navigate",
    icon: <NavIcon path="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    action: (nav) => nav("/dashboard"),
  },
  {
    id: "nav-profile",
    label: "Profile",
    group: "Navigate",
    icon: <NavIcon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    action: (nav) => nav("/dashboard/profile"),
  },
  {
    id: "nav-connect",
    label: "Connect Accounts",
    group: "Navigate",
    icon: <NavIcon path="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
    action: (nav) => nav("/dashboard/connect"),
  },
  {
    id: "nav-team",
    label: "Team",
    group: "Navigate",
    icon: <NavIcon path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    action: (nav) => nav("/dashboard/team"),
  },
  {
    id: "nav-settings",
    label: "Settings",
    group: "Navigate",
    icon: <NavIcon path="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
    action: (nav) => nav("/dashboard/settings"),
  },
  {
    id: "nav-calendar",
    label: "Calendar",
    group: "Navigate",
    icon: <NavIcon path="M8 2v4M16 2v4M3 10h18M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />,
    action: (nav) => nav("/dashboard/calendar"),
  },
  // Actions
  {
    id: "act-new-post",
    label: "Create a post",
    group: "Actions",
    icon: <NavIcon path="M12 5v14M5 12h14" />,
    action: (_nav, showToast) => showToast("Post creator coming soon — stay tuned!"),
  },
  {
    id: "act-connect-platform",
    label: "Connect a platform",
    group: "Actions",
    icon: <NavIcon path="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
    action: (nav) => nav("/dashboard/connect"),
  },
  {
    id: "act-invite",
    label: "Invite teammate",
    group: "Actions",
    icon: <NavIcon path="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />,
    action: (nav) => nav("/dashboard/team"),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [toast, setToast] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  // Filter commands by substring match
  const filtered = ALL_COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  // Group filtered results
  const groups = ["Navigate", "Actions"] as const;
  const grouped = groups
    .map((g) => ({ group: g, items: filtered.filter((c) => c.group === g) }))
    .filter((g) => g.items.length > 0);

  // Flat ordered list for keyboard navigation
  const flatList = grouped.flatMap((g) => g.items);

  const executeCommand = useCallback(
    (cmd: Command) => {
      close();
      setTimeout(() => cmd.action(navigate, showToast), 80);
    },
    [close, navigate, showToast]
  );

  // Global keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open: Cmd+K (Mac) / Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) close();
        else open();
        return;
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatList[selectedIndex]) executeCommand(flatList[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close, flatList, selectedIndex, executeCommand]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) {
    return (
      /* Toast for "coming soon" messages when palette is closed */
      <div
        className="fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl text-sm font-medium transition-all pointer-events-none"
        style={{
          background: "var(--ink)",
          color: "var(--bg-canvas)",
          opacity: toast ? 1 : 0,
          transform: toast ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {toast}
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed inset-0 z-[901] flex items-start justify-center pt-[15vh] px-4"
      >
        <div
          className="surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: "var(--bg-surface)", maxHeight: "70vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--ink)" }}
              aria-label="Search commands"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd
              className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
              style={{ background: "var(--line)", color: "var(--ink-muted)" }}
            >
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="overflow-y-auto py-2"
            style={{ maxHeight: "calc(70vh - 56px)" }}
          >
            {flatList.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: "var(--ink-muted)" }}>
                No results for &ldquo;{query}&rdquo;
              </p>
            ) : (
              (() => {
                let globalIdx = 0;
                return grouped.map(({ group, items }) => (
                  <div key={group}>
                    <div
                      className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      {group}
                    </div>
                    {items.map((cmd) => {
                      const idx = globalIdx++;
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          data-idx={idx}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
                          style={{
                            background: isSelected ? "var(--teal)" : "transparent",
                            color: isSelected ? "#06231D" : "var(--ink)",
                            fontWeight: isSelected ? 600 : 400,
                          }}
                          aria-selected={isSelected}
                        >
                          <span
                            style={{ opacity: isSelected ? 1 : 0.65 }}
                            className="shrink-0"
                          >
                            {cmd.icon}
                          </span>
                          {cmd.label}
                          <span
                            className="ml-auto text-[10px] font-medium"
                            style={{ color: isSelected ? "#06231D" : "var(--ink-muted)", opacity: 0.7 }}
                          >
                            {cmd.group === "Actions" ? "Action" : "Page"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ));
              })()
            )}
          </div>

          {/* Footer hint */}
          <div
            className="flex items-center justify-between px-4 py-2 text-[11px]"
            style={{
              borderTop: "1px solid var(--line)",
              color: "var(--ink-muted)",
            }}
          >
            <span className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "var(--line)" }}>↑↓</kbd> navigate ·
              <kbd className="px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "var(--line)" }}>↵</kbd> select
            </span>
            <span>Ctrl+K to toggle</span>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div
        className="fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl text-sm font-medium transition-all pointer-events-none"
        style={{
          background: "var(--ink)",
          color: "var(--bg-canvas)",
          opacity: toast ? 1 : 0,
          transform: toast ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {toast}
      </div>
    </>
  );
}
