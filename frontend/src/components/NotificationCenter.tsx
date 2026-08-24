/**
 * NotificationCenter.tsx — Bell icon + dropdown notification panel.
 *
 * Polls the real backend API every 15 seconds for live notifications.
 * Falls back to localStorage mock data when the API is unreachable.
 * Campaign creation broadcasts appear in real-time for ALL users.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { type Notification, type NotifType, INITIAL_NOTIFICATIONS } from "../lib/mockData";
import {
  ApiNotification,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";

const POLL_INTERVAL_MS = 15_000; // Poll every 15 seconds

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NOTIF_ICONS: Record<string, { emoji: string; label: string }> = {
  scheduled_reminder:   { emoji: "⏰", label: "Scheduled reminder" },
  publish_success:      { emoji: "✅", label: "Published" },
  publish_failure:      { emoji: "❌", label: "Failed" },
  campaign_alert:       { emoji: "📣", label: "Campaign alert" },
  team_role_change:     { emoji: "🔑", label: "Role change" },
  team_invite_accepted: { emoji: "👋", label: "Invite accepted" },
  team_invite_sent:     { emoji: "✉️", label: "Invite sent" },
};

function getIcon(type: string) {
  return NOTIF_ICONS[type] || { emoji: "🔔", label: "Notification" };
}

/** Merge API notifications + local mock fallback, deduped by ID. */
function mergeNotifications(
  apiNotifs: ApiNotification[],
  mockNotifs: Notification[]
): Notification[] {
  const seen = new Set<string>();
  const merged: Notification[] = [];

  // API notifications take priority
  for (const n of apiNotifs) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      merged.push({
        id: n.id,
        type: (n.type as NotifType) || "campaign_alert",
        message: n.message,
        createdAt: n.created_at,
        read: n.read,
      });
    }
  }

  // Then append mock data that wasn't overridden
  for (const n of mockNotifs) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      merged.push(n);
    }
  }

  // Sort newest first
  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return merged;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    structuredClone(INITIAL_NOTIFICATIONS)
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Poll backend for live notifications ─────────────────────────────────
  const pollNotifications = useCallback(async () => {
    const apiNotifs = await fetchNotifications();
    if (apiNotifs.length > 0) {
      setNotifications((prev) => mergeNotifications(apiNotifs, prev));
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    pollNotifications();

    // Poll every 15 seconds
    const interval = setInterval(pollNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollNotifications]);

  // ── Close on outside click ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // ── Close on Escape ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // ── Mark all read ───────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead();
  }, []);

  // ── Mark single read ────────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await markNotificationRead(id);
  }, []);

  // ── Force refresh when panel opens ──────────────────────────────────────
  useEffect(() => {
    if (isOpen) pollNotifications();
  }, [isOpen, pollNotifications]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{ background: isOpen ? "var(--line)" : "transparent", color: "var(--ink-muted)", border: "none", cursor: "pointer" }}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 flex items-center justify-center rounded-full text-[9px] font-bold animate-pulse"
            style={{ minWidth: "14px", height: "14px", background: "var(--teal)", color: "#06231D", padding: "0 3px" }}
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-11 z-50 surface rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: "min(380px, calc(100vw - 24px))", background: "var(--bg-surface)", border: "1px solid var(--line)" }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--ink)" }}>
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(69,222,196,0.15)", color: "var(--teal-dim)" }}>
                  {unreadCount} new
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold" style={{ color: "var(--teal-dim)", background: "none", border: "none", cursor: "pointer" }} aria-label="Mark all as read">
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "380px" }}>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = getIcon(n.type);
                const isCampaignAlert = n.type === "campaign_alert" && !n.read;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      background: n.read ? "transparent" : isCampaignAlert ? "rgba(69,222,196,0.12)" : "rgba(69,222,196,0.05)",
                      borderBottom: "1px solid var(--line)",
                      cursor: "pointer",
                      border: "none",
                      borderLeft: isCampaignAlert ? "3px solid var(--teal)" : "3px solid transparent",
                    }}
                    aria-label={`${meta.label}: ${n.message}. ${n.read ? "Read" : "Unread"}`}
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-base" style={{ background: isCampaignAlert ? "rgba(69,222,196,0.15)" : "rgba(107,114,128,0.08)" }} aria-hidden="true">
                      {meta.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug" style={{ color: "var(--ink)", fontWeight: n.read ? 400 : 600 }}>
                        {n.message}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>{relativeTime(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: "var(--teal)" }} aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 text-center" style={{ borderTop: "1px solid var(--line)" }}>
            <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
              Live notifications · Auto-refreshes every 15s
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
