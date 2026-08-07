/**
 * PlatformPreview.tsx — Per-platform post preview with live character counter.
 * Standalone display component. Integrate into post editor when it's built.
 * TODO: Wire into /dashboard/creator/new once the post editor exists.
 */
import { useState } from "react";

interface PlatformPreviewProps {
  text: string;
  imageUrl?: string;
  username?: string;
}

const PLATFORMS = ["instagram", "facebook", "linkedin", "twitter", "youtube", "pinterest"] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
  twitter: "X (Twitter)", youtube: "YouTube", pinterest: "Pinterest",
};

const CHAR_LIMITS: Record<Platform, number> = {
  instagram: 2200, facebook: 63206, linkedin: 3000,
  twitter: 280, youtube: 5000, pinterest: 500,
};

const PREVIEW_LIMITS: Record<Platform, number> = {
  instagram: 125, facebook: 477, linkedin: 210,
  twitter: 280, youtube: 200, pinterest: 500,
};

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "#E1306C", facebook: "#1877F2", linkedin: "#0A66C2",
  twitter: "var(--ink)", youtube: "#FF0000", pinterest: "#BD081C",
};

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.884v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.001 24 18.628 24 24 18.628 24 12 24 5.373 18.627 0 12 0z"/>
    </svg>
  ),
};

function CharCounter({ len, limit, previewLimit }: { len: number; limit: number; previewLimit: number }) {
  const overLimit = len > limit;
  const overPreview = len > previewLimit && previewLimit < limit;
  return (
    <div className="flex items-center gap-2 text-xs">
      {overPreview && !overLimit && (
        <span style={{ color: "#f59e0b" }}>✂ Truncated in feed after {previewLimit} chars</span>
      )}
      <span style={{ color: overLimit ? "#ef4444" : len > limit * 0.85 ? "#f59e0b" : "var(--ink-muted)", fontWeight: overLimit ? 700 : 400 }}>
        {len}/{limit}
      </span>
    </div>
  );
}

function InstagramPreview({ text, imageUrl, username }: PlatformPreviewProps & { username: string }) {
  const preview = text.length > PREVIEW_LIMITS.instagram ? text.slice(0, PREVIEW_LIMITS.instagram) + "… more" : text;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)", maxWidth: 380 }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="w-7 h-7 rounded-full" style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }} />
        <span className="text-xs font-semibold">{username}</span>
        <span className="ml-auto text-xs" style={{ color: "var(--ink-muted)" }}>•••</span>
      </div>
      <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center" style={{ background: "var(--line)" }}>
        {imageUrl ? <img src={imageUrl} alt="Post" className="w-full h-full object-cover" /> : (
          <span style={{ color: "var(--ink-muted)", fontSize: 32 }}>🖼</span>
        )}
      </div>
      <div className="px-3 py-2">
        <div className="flex gap-3 mb-2 text-lg">❤️ 💬 📤</div>
        <p className="text-xs leading-snug"><span className="font-semibold">{username}</span> {preview}</p>
      </div>
    </div>
  );
}

function FacebookPreview({ text, imageUrl, username }: PlatformPreviewProps & { username: string }) {
  const preview = text.length > PREVIEW_LIMITS.facebook ? text.slice(0, PREVIEW_LIMITS.facebook) + "… See more" : text;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)", maxWidth: 380 }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#1877F2" }}>
          <span className="text-white text-xs font-bold">{username[0].toUpperCase()}</span>
        </div>
        <div>
          <p className="text-xs font-semibold">{username}</p>
          <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Just now · 🌐</p>
        </div>
      </div>
      <p className="px-3 pb-2 text-xs leading-relaxed">{preview}</p>
      {imageUrl && <img src={imageUrl} alt="Post" className="w-full" />}
      <div className="px-3 py-2 flex gap-4 text-xs" style={{ borderTop: "1px solid var(--line)", color: "var(--ink-muted)" }}>
        <span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span>
      </div>
    </div>
  );
}

function LinkedInPreview({ text, imageUrl, username }: PlatformPreviewProps & { username: string }) {
  const preview = text.length > PREVIEW_LIMITS.linkedin ? text.slice(0, PREVIEW_LIMITS.linkedin) + "… see more" : text;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)", maxWidth: 380 }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#0A66C2" }}>
          <span className="text-white text-sm font-bold">{username[0].toUpperCase()}</span>
        </div>
        <div>
          <p className="text-xs font-semibold">{username}</p>
          <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Just now · 🌐</p>
        </div>
      </div>
      <p className="px-3 pb-3 text-xs leading-relaxed">{preview}</p>
      {imageUrl && <img src={imageUrl} alt="Post" className="w-full" />}
      <div className="px-3 py-2 flex gap-4 text-xs" style={{ borderTop: "1px solid var(--line)", color: "var(--ink-muted)" }}>
        <span>👍 Like</span><span>💬 Comment</span><span>🔁 Repost</span><span>✉ Send</span>
      </div>
    </div>
  );
}

function TwitterPreview({ text, username }: PlatformPreviewProps & { username: string }) {
  const overLimit = text.length > 280;
  return (
    <div className="rounded-xl p-3" style={{ border: "1px solid var(--line)", maxWidth: 380 }}>
      <div className="flex gap-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--ink)" }}>
          <span className="text-white text-sm font-bold">{username[0].toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1 text-xs">
            <span className="font-semibold">{username}</span>
            <span style={{ color: "var(--ink-muted)" }}>· Just now</span>
          </div>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: overLimit ? "#ef4444" : "var(--ink)" }}>
            {text || <span style={{ color: "var(--ink-muted)" }}>Start typing to preview…</span>}
          </p>
          <div className="flex gap-4 mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
            <span>💬</span><span>🔁</span><span>❤️</span><span>📤</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function YouTubePreview({ text, imageUrl, username }: PlatformPreviewProps & { username: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)", maxWidth: 380 }}>
      <div className="aspect-video flex items-center justify-center" style={{ background: "#111", position: "relative" }}>
        {imageUrl ? <img src={imageUrl} alt="Thumbnail" className="w-full h-full object-cover" /> : (
          <div className="flex items-center justify-center" style={{ position: "absolute", inset: 0 }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#FF0000" }}>
              <span style={{ color: "white", fontSize: 22 }}>▶</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-semibold leading-snug" style={{ color: "var(--ink)" }}>
          {text.slice(0, 100) || "Video title"}
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--ink-muted)" }}>{username} · 0 views</p>
      </div>
    </div>
  );
}

function PinterestPreview({ text, imageUrl, username }: PlatformPreviewProps & { username: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)", maxWidth: 240 }}>
      <div className="flex items-center justify-center" style={{ background: "var(--line)", minHeight: 200 }}>
        {imageUrl ? <img src={imageUrl} alt="Pin" className="w-full object-cover" /> : (
          <span style={{ color: "var(--ink-muted)", fontSize: 40 }}>📌</span>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-semibold">{text.slice(0, 100) || "Pin description"}</p>
        <p className="text-[10px] mt-1" style={{ color: "var(--ink-muted)" }}>{username}</p>
      </div>
    </div>
  );
}

export default function PlatformPreview({ text, imageUrl, username = "your_brand" }: PlatformPreviewProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>("instagram");
  const limit = CHAR_LIMITS[activePlatform];
  const previewLimit = PREVIEW_LIMITS[activePlatform];
  const len = text.length;

  const PreviewComponent = () => {
    const props = { text, imageUrl, username };
    if (activePlatform === "instagram") return <InstagramPreview {...props} />;
    if (activePlatform === "facebook") return <FacebookPreview {...props} />;
    if (activePlatform === "linkedin") return <LinkedInPreview {...props} />;
    if (activePlatform === "twitter") return <TwitterPreview {...props} />;
    if (activePlatform === "youtube") return <YouTubePreview {...props} />;
    return <PinterestPreview {...props} />;
  };

  return (
    <div>
      {/* Platform tabs */}
      <div className="flex flex-wrap gap-1 mb-4" role="tablist" aria-label="Platform preview tabs">
        {PLATFORMS.map((p) => {
          const isActive = p === activePlatform;
          return (
            <button
              key={p}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActivePlatform(p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: isActive ? PLATFORM_COLORS[p] : "rgba(107,114,128,0.08)",
                color: isActive ? "#fff" : "var(--ink-muted)",
                border: "none",
                cursor: "pointer",
              }}
              aria-label={PLATFORM_LABELS[p]}
            >
              <span style={{ color: isActive ? "#fff" : PLATFORM_COLORS[p] }}>{PLATFORM_ICONS[p]}</span>
              {PLATFORM_LABELS[p]}
            </button>
          );
        })}
      </div>

      {/* Character counter */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold" style={{ color: "var(--ink-muted)" }}>Preview</span>
        <CharCounter len={len} limit={limit} previewLimit={previewLimit} />
      </div>

      {/* Warning */}
      {len > limit && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.18)" }}>
          ⚠ Text exceeds {PLATFORM_LABELS[activePlatform]}'s {limit}-character limit
        </div>
      )}

      {/* Preview card */}
      <div role="tabpanel" aria-label={`${PLATFORM_LABELS[activePlatform]} preview`}>
        <PreviewComponent />
      </div>
    </div>
  );
}
