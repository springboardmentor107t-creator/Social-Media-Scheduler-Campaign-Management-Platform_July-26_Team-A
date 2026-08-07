/**
 * BestTimeToPost.tsx — Scheduling suggestion chip.
 *
 * Props:
 *   platform   — Platform key (matches BEST_TIMES keys in mockData.ts)
 *   onUseTime  — Callback with the suggested time value string (e.g. "18:00")
 *
 * Displays a small suggestion chip near a scheduling time-picker.
 * Labeled "based on general engagement patterns" — not ML/personalized data.
 *
 * TODO: Replace BEST_TIMES with GET /api/analytics/best-times?platform=X
 *       when personalized analytics are available.
 */

import { BEST_TIMES } from "../lib/mockData";

interface BestTimeToPostProps {
  platform: string;
  onUseTime?: (timeValue: string) => void;
}

export default function BestTimeToPost({ platform, onUseTime }: BestTimeToPostProps) {
  const entry = BEST_TIMES[platform.toLowerCase()];
  if (!entry) return null;

  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded-xl"
      style={{
        background: "rgba(69,222,196,0.07)",
        border: "1px solid rgba(69,222,196,0.2)",
      }}
      role="note"
      aria-label={`Best time suggestion for ${platform}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Clock icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--teal)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: "var(--teal-dim)" }}>
            Best time:
          </span>
          <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>
            {entry.window}
          </span>
        </div>

        {onUseTime && (
          <button
            onClick={() => onUseTime(entry.timeValue)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{
              background: "var(--teal)",
              color: "#06231D",
              border: "none",
              cursor: "pointer",
            }}
            aria-label={`Use suggested time: ${entry.window}`}
          >
            Use this time
          </button>
        )}
      </div>

      <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
        {entry.rationale} — <em>Based on general engagement patterns, not personalized data.</em>
      </p>
    </div>
  );
}
