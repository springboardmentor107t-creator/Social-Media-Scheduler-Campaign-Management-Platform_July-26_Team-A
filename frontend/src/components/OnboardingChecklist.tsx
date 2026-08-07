/**
 * OnboardingChecklist.tsx — Interactive, dismissible onboarding widget.
 *
 * localStorage keys:
 *   "socialpilot-onboarding-dismissed"  — "true" when permanently hidden
 *   "socialpilot-onboarding-checked"    — JSON array of completed item IDs
 *
 * The widget hides when:
 *   a) The user clicks "Don't show this again" (permanent dismiss)
 *
 * Items auto-complete based on localStorage state (mock — no real backend check).
 * TODO: Replace item completion checks with GET /api/onboarding/status
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LS_DISMISSED_KEY = "socialpilot-onboarding-dismissed";
const LS_CHECKED_KEY   = "socialpilot-onboarding-checked";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  route?: string;
  actionLabel: string;
}

const ITEMS: ChecklistItem[] = [
  {
    id: "connect-accounts",
    label: "Connect your social accounts",
    description: "Link Instagram, LinkedIn, X and more to start scheduling.",
    route: "/dashboard/connect",
    actionLabel: "Connect now",
  },
  {
    id: "create-post",
    label: "Create your first post",
    description: "Draft and schedule a post to any connected platform.",
    actionLabel: "Create post",
  },
  {
    id: "invite-teammate",
    label: "Invite a teammate",
    description: "Collaborate with your team — roles control what they can do.",
    route: "/dashboard/team",
    actionLabel: "Invite now",
  },
  {
    id: "explore-analytics",
    label: "Explore your analytics",
    description: "Track reach and engagement across all your platforms.",
    route: "/dashboard/creator",
    actionLabel: "View analytics",
  },
];

function loadChecked(): string[] {
  try {
    const raw = localStorage.getItem(LS_CHECKED_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return [];
}

export default function OnboardingChecklist({
  showToast,
}: {
  showToast?: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(LS_DISMISSED_KEY) === "true"
  );
  const [checked, setChecked] = useState<string[]>(() => loadChecked());

  useEffect(() => {
    localStorage.setItem(LS_CHECKED_KEY, JSON.stringify(checked));
  }, [checked]);

  const toggleItem = (id: string) => {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAction = (item: ChecklistItem) => {
    if (!checked.includes(item.id)) toggleItem(item.id);
    if (item.route) {
      navigate(item.route);
    } else {
      showToast?.("Post creator coming soon — stay tuned!");
    }
  };

  const dismissForever = () => {
    localStorage.setItem(LS_DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  const completedCount = ITEMS.filter((i) => checked.includes(i.id)).length;
  const progress = Math.round((completedCount / ITEMS.length) * 100);
  const allDone = completedCount === ITEMS.length;

  return (
    <div
      className="surface rounded-2xl p-6 shadow-sm"
      role="region"
      aria-label="Onboarding checklist"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--ink)" }}>
            {allDone ? "🎉 You're all set!" : "Getting started"}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
            {completedCount}/{ITEMS.length} steps complete
          </p>
        </div>
        <button
          onClick={dismissForever}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors shrink-0"
          style={{ color: "var(--ink-muted)", background: "rgba(107,114,128,0.08)", border: "none", cursor: "pointer" }}
          aria-label="Dismiss onboarding checklist permanently"
        >
          Don't show again
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2 rounded-full mb-5 overflow-hidden"
        style={{ background: "rgba(107,114,128,0.12)" }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${progress}% complete`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "var(--teal)" }}
        />
      </div>

      {/* Items */}
      <div className="space-y-3">
        {ITEMS.map((item) => {
          const done = checked.includes(item.id);
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl transition-colors"
              style={{
                background: done ? "rgba(69,222,196,0.06)" : "rgba(107,114,128,0.04)",
                border: `1px solid ${done ? "rgba(69,222,196,0.18)" : "var(--line)"}`,
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleItem(item.id)}
                className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all mt-0.5"
                style={{
                  borderColor: done ? "var(--teal)" : "var(--ink-muted)",
                  background: done ? "var(--teal)" : "transparent",
                  cursor: "pointer",
                }}
                aria-label={`${done ? "Unmark" : "Mark"} "${item.label}" as complete`}
                aria-checked={done}
                role="checkbox"
              >
                {done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#06231D" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--ink)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}
                >
                  {item.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                  {item.description}
                </p>
              </div>

              {!done && (
                <button
                  onClick={() => handleAction(item)}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--teal)", color: "#06231D", border: "none", cursor: "pointer" }}
                  aria-label={item.actionLabel}
                >
                  {item.actionLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
