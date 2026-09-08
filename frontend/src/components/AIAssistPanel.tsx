/**
 * AIAssistPanel.tsx — AI-Assisted Content Suggestion Panel
 *
 * Collapsed by default (accordion pattern).
 * Calls POST /api/content/ai-suggest (server-side only — API key never touches the frontend).
 *
 * Props:
 *   selectedAccountIds  — IDs of currently selected social accounts (used to derive platforms).
 *   connectedAccounts   — Full account list, to map IDs → providers.
 *   onSuggestion        — Callback fired when AI returns results; parent fills Title/Body.
 *   showToast           — Toast helper from parent.
 *
 * Design decisions:
 *   - Collapsed by default so it doesn't interrupt the normal create-post flow.
 *   - Generate disabled if no platforms selected (tooltip explains why).
 *   - "AI-generated" label next to Title/Body clears on first manual edit (managed externally).
 *   - Hashtag chips are shown below Body; user can click "+" to append them.
 *   - Regenerate = same call, same inputs.
 */
import { useState, useRef } from "react";
import { apiFetch } from "../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SocialAccountOption {
  id: string;
  provider: string;
  account_name: string;
  is_active: boolean;
}

interface AISuggestion {
  title: string;
  body?: string;
  variants?: Record<string, string>;
  hashtags: string[];
  call_to_action?: string;
}

export interface AIAssistResult {
  title: string;
  variants: Record<string, string>; // platform → body text; single platform has one entry
  hashtags: string[];
  /** CTA phrase with [LINK] placeholder — never a fabricated URL */
  callToAction?: string;
}

interface AIAssistPanelProps {
  selectedAccountIds: string[];
  connectedAccounts: SocialAccountOption[];
  onSuggestion: (result: AIAssistResult) => void;
  showToast: (msg: string) => void;
}

// ── Tone options ──────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "promotional", label: "Promotional" },
  { value: "excited", label: "Excited 🎉" },
];

// ── Sparkle icon (inline SVG, no deps) ───────────────────────────────────────

function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.5 5H18l-4 3 1.5 5L12 13l-3.5 3 1.5-5-4-3h4.5z" />
    </svg>
  );
}

// ── ChevronDown icon ──────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AIAssistPanel({
  selectedAccountIds,
  connectedAccounts,
  onSuggestion,
  showToast,
}: AIAssistPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const topicRef = useRef<HTMLInputElement>(null);

  // Derive selected platform names from account IDs
  const selectedPlatforms = connectedAccounts
    .filter((a) => selectedAccountIds.includes(a.id))
    .map((a) => a.provider.toLowerCase());
  const noPlatforms = selectedPlatforms.length === 0;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      showToast("⚠️ Please enter a topic before generating.");
      topicRef.current?.focus();
      return;
    }
    if (noPlatforms) return; // button is disabled; guard anyway

    setGenerating(true);
    try {
      const result = await apiFetch<AISuggestion>("/api/content/ai-suggest", {
        method: "POST",
        body: JSON.stringify({
          topic: topic.trim(),
          platforms: selectedPlatforms,
          tone,
        }),
      });

      // Normalise into variants map regardless of single/multi-platform response
      const variants: Record<string, string> = {};
      if (result.variants) {
        Object.assign(variants, result.variants);
      } else if (result.body !== undefined) {
        // Single platform → map under that platform's name
        const platform = selectedPlatforms[0] ?? "general";
        variants[platform] = result.body;
      }

      onSuggestion({
        title: result.title,
        variants,
        hashtags: result.hashtags ?? [],
        callToAction: result.call_to_action || undefined,
      });

      setHasGenerated(true);
      showToast("✨ Content generated! Edit freely — it's your starting point.");
    } catch (err: any) {
      // Surface specific backend error messages (rate-limit, timeout, etc.)
      const msg = err?.message || "AI generation failed. Please try again.";
      showToast(`⚠️ ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="surface rounded-2xl shadow-sm overflow-hidden"
      style={{
        border: expanded
          ? "1px solid rgba(69,222,196,0.35)"
          : "1px solid var(--line)",
        transition: "border-color 0.2s ease",
      }}
    >
      {/* ── Accordion Header ─────────────────────────────────────────────── */}
      <button
        id="ai-assist-toggle"
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
        aria-expanded={expanded}
        aria-controls="ai-assist-content"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: "rgba(69,222,196,0.14)", color: "var(--teal-dim)" }}
          >
            <SparkleIcon size={15} />
          </span>
          <div className="text-left">
            <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
              AI Assist
            </p>
            <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
              {hasGenerated
                ? "Content generated — expand to regenerate"
                : "Generate a title, body & hashtags from a topic"}
            </p>
          </div>
          {hasGenerated && (
            <span
              className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(69,222,196,0.14)", color: "var(--teal-dim)" }}
            >
              ✓ Generated
            </span>
          )}
        </div>
        <span style={{ color: "var(--ink-muted)" }}>
          <ChevronIcon open={expanded} />
        </span>
      </button>

      {/* ── Accordion Content ─────────────────────────────────────────────── */}
      {expanded && (
        <div
          id="ai-assist-content"
          className="px-5 pb-5 space-y-4"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          {/* No platform warning banner */}
          {noPlatforms && (
            <div
              className="mt-4 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "#b45309",
              }}
              role="alert"
            >
              <span>⚠️</span>
              Select at least one publishing account above before generating — suggestions
              are platform-aware and character-limit adjusted.
            </div>
          )}

          {/* Topic input */}
          <div className="mt-4">
            <label
              htmlFor="ai-topic-input"
              className="field-label"
            >
              Topic <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              id="ai-topic-input"
              ref={topicRef}
              type="text"
              maxLength={500}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !noPlatforms && !generating) handleGenerate();
              }}
              placeholder="e.g. new summer collection launch, product discount, team milestone"
              className="input-field w-full text-sm"
              aria-describedby={noPlatforms ? "ai-no-platform-hint" : undefined}
            />
          </div>

          {/* Tone selector */}
          <div>
            <label htmlFor="ai-tone-select" className="field-label">
              Tone <span style={{ color: "var(--ink-muted)", fontWeight: 400 }}>(optional)</span>
            </label>
            <select
              id="ai-tone-select"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="input-field text-sm"
            >
              {TONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selected platforms display */}
          {!noPlatforms && (
            <div className="flex flex-wrap gap-1.5">
              {selectedPlatforms.map((p) => (
                <span
                  key={p}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                  style={{
                    background: "rgba(69,222,196,0.10)",
                    color: "var(--teal-dim)",
                    border: "1px solid rgba(69,222,196,0.2)",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          {/* Generate / Regenerate button */}
          <div className="flex items-center gap-3">
            <button
              id="ai-generate-btn"
              type="button"
              onClick={handleGenerate}
              disabled={generating || noPlatforms}
              title={noPlatforms ? "Select at least one platform first" : ""}
              className="btn-primary-teal text-xs py-2.5 px-5 flex items-center gap-2"
              style={{
                opacity: noPlatforms ? 0.45 : 1,
                cursor: noPlatforms ? "not-allowed" : "pointer",
              }}
              aria-disabled={noPlatforms}
            >
              {generating ? (
                <>
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
                    aria-hidden="true"
                  />
                  Generating…
                </>
              ) : (
                <>
                  <SparkleIcon size={14} />
                  {hasGenerated ? "Regenerate" : "Generate"}
                </>
              )}
            </button>

            {hasGenerated && !generating && (
              <span
                className="text-[11px]"
                style={{ color: "var(--ink-muted)" }}
              >
                Different result? Click Regenerate for a new take.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
