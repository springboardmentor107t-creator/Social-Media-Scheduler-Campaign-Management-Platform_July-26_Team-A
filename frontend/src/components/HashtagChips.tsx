/**
 * HashtagChips.tsx — Removable hashtag chip row for AI-generated hashtags.
 *
 * Each chip has two actions:
 *   ＋ Append the hashtag (with #) to the current body text.
 *   ✕ Remove it from the suggestion list.
 *
 * The "AI-generated" label is shown next to the section header when content
 * was just auto-filled, and clears on user edit (controlled by parent via
 * the `aiGenerated` flag).
 */

interface HashtagChipsProps {
  hashtags: string[];
  onAppend: (tag: string) => void;
  onRemove: (tag: string) => void;
}

export default function HashtagChips({
  hashtags,
  onAppend,
  onRemove,
}: HashtagChipsProps) {
  if (hashtags.length === 0) return null;

  return (
    <div className="mt-3">
      <p
        className="text-[11px] font-bold uppercase tracking-wider mb-2"
        style={{ color: "var(--ink-muted)" }}
      >
        AI Suggested Hashtags — click ＋ to add to body
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested hashtags">
        {hashtags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-[12px] font-semibold pl-2.5 pr-1 py-1 rounded-full"
            style={{
              background: "rgba(69,222,196,0.08)",
              border: "1px solid rgba(69,222,196,0.22)",
              color: "var(--teal-dim)",
            }}
          >
            #{tag}
            {/* Append to body */}
            <button
              type="button"
              onClick={() => onAppend(tag)}
              title={`Append #${tag} to body`}
              aria-label={`Append hashtag ${tag} to post body`}
              className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
              style={{ color: "var(--teal-dim)" }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            {/* Remove chip */}
            <button
              type="button"
              onClick={() => onRemove(tag)}
              title={`Remove #${tag}`}
              aria-label={`Remove hashtag suggestion ${tag}`}
              className="w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:bg-red-100"
              style={{ color: "var(--ink-muted)" }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
