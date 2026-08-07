/**
 * Skeleton.tsx — Shimmering placeholder block for loading states.
 *
 * Props:
 *   width      — CSS width string (e.g. "100%", "120px") — default "100%"
 *   height     — CSS height string (e.g. "16px", "3rem") — default "16px"
 *   rounded    — Border-radius preset: "sm" | "md" | "lg" | "full" — default "md"
 *   className  — Extra Tailwind / utility classes
 *
 * The shimmer animation is defined in index.css via @keyframes skeleton-shimmer
 * and uses --bg-surface + --line variables so it works in both light/dark mode.
 */

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: "sm" | "md" | "lg" | "full";
  className?: string;
}

const RADIUS = {
  sm:   "4px",
  md:   "8px",
  lg:   "12px",
  full: "9999px",
};

export default function Skeleton({
  width = "100%",
  height = "16px",
  rounded = "md",
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: RADIUS[rounded],
      }}
      aria-hidden="true"
    />
  );
}

// ── Convenience composites ────────────────────────────────────────────────────

/** A stat card skeleton matching the 4-up grid on dashboard pages */
export function StatCardSkeleton() {
  return (
    <div className="surface rounded-xl p-5 flex flex-col gap-3">
      <Skeleton width="60%" height="12px" rounded="full" />
      <Skeleton width="45%" height="32px" rounded="md" />
      <Skeleton width="70%" height="10px" rounded="full" />
    </div>
  );
}

/** A table row skeleton (configurable column count) */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  const widths = ["40%", "55%", "25%", "30%", "20%", "15%"];
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton width={widths[i] ?? "30%"} height="14px" rounded="full" />
        </td>
      ))}
    </tr>
  );
}

/** Notification item skeleton */
export function NotifSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton width="32px" height="32px" rounded="full" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton width="85%" height="12px" rounded="full" />
        <Skeleton width="50%" height="10px" rounded="full" />
      </div>
    </div>
  );
}
