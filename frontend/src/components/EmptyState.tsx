/**
 * EmptyState.tsx — Reusable empty-state component.
 *
 * Props:
 *   icon        — ReactNode (inline SVG or emoji, themed with --teal / --ink-muted)
 *   title       — Heading text
 *   description — Supporting copy
 *   actionLabel — CTA button text (optional)
 *   onAction    — CTA handler (optional)
 */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Default teal-themed SVG illustration — simple "empty box" motif */
const DefaultIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="8" y="20" width="48" height="36" rx="6" stroke="var(--teal)" strokeWidth="2.5" strokeDasharray="5 3" />
    <path d="M8 28h48" stroke="var(--teal)" strokeWidth="2" opacity="0.5" />
    <circle cx="32" cy="42" r="8" fill="var(--teal)" fillOpacity="0.12" stroke="var(--teal)" strokeWidth="2" />
    <path d="M32 38v8M28 42h8" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" />
    <rect x="18" y="8" width="28" height="6" rx="3" fill="var(--ink-muted)" fillOpacity="0.18" />
  </svg>
);

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-14 px-6"
      role="status"
      aria-label={title}
    >
      <div className="mb-5 opacity-90">{icon ?? <DefaultIcon />}</div>
      <h3
        className="text-base font-semibold mb-2"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed max-w-xs"
        style={{ color: "var(--ink-muted)" }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary-teal mt-6 text-sm px-5 py-2.5"
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Preset icons for common empty states ────────────────────────────────────

export const PostsEmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect x="10" y="14" width="44" height="36" rx="7" stroke="var(--teal)" strokeWidth="2.5" />
    <path d="M18 24h28M18 32h20M18 40h12" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <circle cx="49" cy="49" r="9" fill="var(--teal)" fillOpacity="0.15" stroke="var(--teal)" strokeWidth="2" />
    <path d="M49 45v8M45 49h8" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PlatformEmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="32" cy="32" r="22" stroke="var(--teal)" strokeWidth="2.5" strokeDasharray="6 4" />
    <path d="M22 32c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10Z" stroke="var(--ink-muted)" strokeWidth="2" opacity="0.5" />
    <path d="M32 26v6l4 2" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TeamEmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="9" stroke="var(--teal)" strokeWidth="2.5" />
    <circle cx="42" cy="24" r="9" stroke="var(--ink-muted)" strokeWidth="2" opacity="0.5" />
    <path d="M8 52c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M42 36a16 16 0 0 1 14 16" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
  </svg>
);
