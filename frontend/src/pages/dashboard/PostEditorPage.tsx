/**
 * PostEditorPage.tsx — Create, Edit & Duplicate Post Flow
 * Route: /dashboard/creator/new
 *        /dashboard/creator/:id/edit
 *        /dashboard/creator/duplicate/:id
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import DashboardShell, { type NavItem } from "../../components/DashboardShell";
import RoleGate from "../../components/RoleGate";
import PlatformPreview from "../../components/PlatformPreview";
import BestTimeToPost from "../../components/BestTimeToPost";
import { apiFetch } from "../../services/api";

const CREATOR_NAV: NavItem[] = [
  { label: "My Dashboard", href: "/dashboard/creator" },
  { label: "My Content", href: "/dashboard/creator" },
  { label: "Connect Accounts", href: "/dashboard/connect" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Settings", href: "/dashboard/settings" },
];

type ContentType = "text" | "image" | "video" | "carousel";
type ScheduleMode = "draft" | "publish_now" | "schedule";
type RecurrenceRule = "daily" | "weekly" | "monthly";

interface SocialAccountOption {
  id: string;
  provider: string;
  account_name: string;
  is_active: boolean;
}

export default function PostEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const isEditMode = location.pathname.includes("/edit");
  const isDuplicateMode = location.pathname.includes("/duplicate");

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contentType, setContentType] = useState<ContentType>("text");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("schedule");
  const [scheduledTime, setScheduledTime] = useState<string>(() => {
    const defaultTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    defaultTime.setMinutes(0, 0, 0);
    return defaultTime.toISOString().slice(0, 16);
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>("weekly");

  // Status & Data State
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccountOption[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [validationError, setValidationError] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Fetch connected social accounts
  useEffect(() => {
    apiFetch<SocialAccountOption[]>("/api/social-accounts")
      .then((data) => {
        setConnectedAccounts(data);
        if (data.length > 0) {
          setSelectedAccountIds([data[0].id]);
        }
      })
      .catch(() => {
        // Fallback default mock account if empty
        setConnectedAccounts([
          { id: "mock-yt", provider: "youtube", account_name: "Memotoji (YouTube)", is_active: true }
        ]);
      });
  }, []);

  // Fetch post data for Edit or Duplicate mode
  useEffect(() => {
    if ((isEditMode || isDuplicateMode) && id) {
      setLoading(true);
      apiFetch<any>(`/api/content/${id}`)
        .then((data) => {
          setTitle(isDuplicateMode ? `Copy of ${data.title}` : data.title || "");
          setBody(data.body || "");
          setContentType(data.content_type || "text");
          setMediaUrls(data.media_urls || []);

          if (isEditMode) {
            // Check if read-only (scheduled or published)
            if (data.display_status === "Published" || data.display_status === "Scheduled" || data.status === "approved") {
              setIsReadOnly(true);
            }
          }
        })
        .catch((err) => {
          showToast(`Error loading content: ${err.message}`);
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, isDuplicateMode]);

  // Handle local file picker / drag-and-drop
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setMediaUrls((prev) => [...prev, ...newUrls]);
  };

  const removeMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((x) => x !== accountId) : [...prev, accountId]
    );
  };

  // Handle suggested best time click
  const handleUseSuggestedTime = (timeStr: string) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const [hours, minutes] = timeStr.split(":");
    today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    setScheduledTime(today.toISOString().slice(0, 16));
    showToast(`Scheduled time updated to best engagement window (${timeStr})`);
  };

  // Submit Handler
  const handleSubmit = async (overrideMode?: ScheduleMode) => {
    setValidationError("");
    const mode = overrideMode || scheduleMode;

    if (!title.trim()) {
      setValidationError("Title is required.");
      return;
    }
    if (!body.trim()) {
      setValidationError("Post caption/body is required.");
      return;
    }
    if (mode !== "draft" && selectedAccountIds.length === 0) {
      setValidationError("At least one social account must be selected to schedule or publish.");
      return;
    }

    setSubmitting(true);

    try {
      let contentId = id;
      const contentPayload = {
        title,
        body,
        content_type: contentType,
        media_urls: mediaUrls,
        status: mode === "draft" ? "draft" : "pending_approval",
      };

      // 1. Create or update content item
      if (isEditMode && contentId && !isReadOnly) {
        await apiFetch(`/api/content/${contentId}`, {
          method: "PATCH",
          body: JSON.stringify(contentPayload),
        });
      } else {
        const createdContent = await apiFetch<any>("/api/content", {
          method: "POST",
          body: JSON.stringify(contentPayload),
        });
        contentId = createdContent.id;
      }

      // 2. If Schedule or Publish now, create scheduled_posts rows
      if (mode !== "draft" && contentId) {
        const publishNow = mode === "publish_now";
        const isoTime = publishNow ? new Date().toISOString() : new Date(scheduledTime).toISOString();

        await apiFetch("/api/scheduled-posts", {
          method: "POST",
          body: JSON.stringify({
            content_id: contentId,
            social_account_ids: selectedAccountIds,
            scheduled_time: isoTime,
            is_recurring: publishNow ? false : isRecurring,
            recurrence_rule: isRecurring ? recurrenceRule : null,
            publish_now: publishNow,
          }),
        });
      }

      showToast(
        mode === "draft"
          ? "Draft saved successfully!"
          : mode === "publish_now"
          ? "Post published now!"
          : "Post scheduled successfully!"
      );

      setTimeout(() => {
        navigate("/dashboard/creator");
      }, 1000);
    } catch (err: any) {
      setValidationError(err.message || "Failed to submit post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const primaryProvider = connectedAccounts.find((a) => selectedAccountIds.includes(a.id))?.provider || "youtube";

  return (
    <RoleGate allowedRole="creator">
      <DashboardShell
        active="My Content"
        navItems={CREATOR_NAV}
        roleLabel="Content Creator"
        pageTitle={isEditMode ? "Edit Post" : isDuplicateMode ? "Duplicate Post" : "Create New Post"}
      >
        {/* Top Header Controls */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <button
              onClick={() => navigate("/dashboard/creator")}
              className="text-xs font-semibold flex items-center gap-1 mb-1"
              style={{ color: "var(--teal-dim)" }}
            >
              ← Back to My Content
            </button>
            <h1 className="text-xl font-bold">
              {isEditMode ? "Edit Content Post" : isDuplicateMode ? "Duplicate Content" : "Compose New Post"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit("draft")}
              disabled={submitting || isReadOnly}
              className="btn-outline-soft text-xs py-2 px-4"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={submitting || isReadOnly}
              className="btn-primary-teal text-xs py-2 px-5"
            >
              {submitting ? "Saving..." : scheduleMode === "publish_now" ? "Publish Now" : "Schedule Post"}
            </button>
          </div>
        </div>

        {/* Loading Spinner for Edit/Duplicate mode */}
        {loading ? (
          <div className="surface rounded-2xl p-12 text-center my-6">
            <div className="text-3xl animate-spin mb-3">⏳</div>
            <p className="text-sm font-semibold">Loading post details...</p>
          </div>
        ) : (
          <>
            {/* Read Only Warning Banner */}
            {isReadOnly && (
              <div className="mb-6 p-4 rounded-xl text-sm font-semibold" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
                🔒 <strong>Read Only Mode:</strong> This post has already been scheduled or published and its content is locked against edits.
              </div>
            )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mb-6 p-3.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
            ⚠️ {validationError}
          </div>
        )}

        {/* Main 2-Column Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <fieldset disabled={isReadOnly} className="space-y-6">
              {/* Post Title */}
              <div className="surface rounded-2xl p-5 shadow-sm">
                <label className="field-label block text-xs font-bold uppercase tracking-wider mb-2">
                  Post Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Summer Product Announcement launch"
                  className="input-field w-full text-sm font-medium"
                />
                <p className="text-[11px] text-right mt-1" style={{ color: "var(--ink-muted)" }}>
                  {title.length}/255
                </p>
              </div>

              {/* Caption / Body Text */}
              <div className="surface rounded-2xl p-5 shadow-sm">
                <label className="field-label block text-xs font-bold uppercase tracking-wider mb-2">
                  Post Body / Caption <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your main post copy here... hashtags, links, and text"
                  className="input-field w-full text-sm leading-relaxed"
                />
              </div>

              {/* Content Type Selector */}
              <div className="surface rounded-2xl p-5 shadow-sm">
                <label className="field-label block text-xs font-bold uppercase tracking-wider mb-3">
                  Content Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["text", "image", "video", "carousel"] as ContentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContentType(type)}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold capitalize border transition-all"
                      style={{
                        background: contentType === type ? "rgba(69,222,196,0.12)" : "rgba(107,114,128,0.06)",
                        borderColor: contentType === type ? "var(--teal)" : "var(--line)",
                        color: contentType === type ? "var(--teal-dim)" : "var(--ink-muted)",
                      }}
                    >
                      {type === "text" && "📝 Text"}
                      {type === "image" && "🖼️ Single Image"}
                      {type === "video" && "🎬 Video"}
                      {type === "carousel" && "🎠 Carousel"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media Upload Zone */}
              {contentType !== "text" && (
                <div className="surface rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="field-label block text-xs font-bold uppercase tracking-wider">
                      Media Assets
                    </label>
                    <span className="text-[11px] font-medium" style={{ color: "var(--teal-dim)" }}>
                      Preview Upload
                    </span>
                  </div>

                  {/* Dropzone */}
                  <label className="border-2 border-dashed rounded-xl p-6 text-center block cursor-pointer transition-colors hover:border-[var(--teal)]" style={{ borderColor: "var(--line)", background: "rgba(107,114,128,0.03)" }}>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple={contentType === "carousel"}
                      onChange={handleMediaUpload}
                      className="hidden"
                    />
                    <div className="text-3xl mb-2">📁</div>
                    <p className="text-xs font-semibold">Click to select or drag & drop media files</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>
                      Supports PNG, JPG, MP4 · Up to 50MB
                    </p>
                  </label>

                  {/* Local Storage Banner Notice */}
                  <div className="mt-3 p-2.5 rounded-lg text-[11px]" style={{ background: "rgba(69,222,196,0.06)", color: "var(--ink-muted)" }}>
                    ℹ️ <strong>Local Preview Mode:</strong> Media files are loaded into local object URLs for live UI previewing. Connect an S3/Cloudinary backend for production storage.
                  </div>

                  {/* Image Thumbnails */}
                  {mediaUrls.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      {mediaUrls.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border" style={{ borderColor: "var(--line)" }}>
                          <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            className="absolute top-1 right-1 bg-black/70 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Social Platform Account Selector */}
              <div className="surface rounded-2xl p-5 shadow-sm">
                <label className="field-label block text-xs font-bold uppercase tracking-wider mb-3">
                  Publishing Accounts
                </label>
                <div className="space-y-2">
                  {connectedAccounts.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      No connected social accounts found. Go to Connect Accounts to add YouTube or Facebook.
                    </p>
                  ) : (
                    connectedAccounts.map((acc) => {
                      const selected = selectedAccountIds.includes(acc.id);
                      return (
                        <div
                          key={acc.id}
                          onClick={() => toggleAccountSelection(acc.id)}
                          className="flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all"
                          style={{
                            background: selected ? "rgba(69,222,196,0.08)" : "rgba(107,114,128,0.04)",
                            borderColor: selected ? "var(--teal)" : "var(--line)",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {}}
                              aria-label={`Select ${acc.account_name}`}
                            />
                            <div>
                              <p className="text-xs font-bold">{acc.account_name}</p>
                              <p className="text-[10px] capitalize" style={{ color: "var(--ink-muted)" }}>
                                {acc.provider}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                            Active
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Scheduling Controls */}
              <div className="surface rounded-2xl p-5 shadow-sm space-y-4">
                <label className="field-label block text-xs font-bold uppercase tracking-wider mb-2">
                  Publishing Schedule
                </label>

                {/* Segmented Radio Controls */}
                <div className="grid grid-cols-3 gap-2 p-1 rounded-xl" style={{ background: "rgba(107,114,128,0.08)" }}>
                  {(
                    [
                      { id: "draft", label: "Save Draft" },
                      { id: "publish_now", label: "Publish Now" },
                      { id: "schedule", label: "Schedule Later" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setScheduleMode(m.id)}
                      className="py-2 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: scheduleMode === m.id ? "var(--teal)" : "transparent",
                        color: scheduleMode === m.id ? "#06231D" : "var(--ink-muted)",
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Schedule Later Date Picker & Best Time Suggestion */}
                {scheduleMode === "schedule" && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ink-muted)" }}>
                        Pick Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="input-field w-full text-xs py-2 px-3"
                      />
                    </div>

                    {/* Best Time Suggestion Chip Component */}
                    <BestTimeToPost platform={primaryProvider} onUseTime={handleUseSuggestedTime} />

                    {/* Recurring Schedule Toggle */}
                    <div className="pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold">Recurring Post Schedule</p>
                          <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                            Automatically repeat post creation at regular intervals
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          aria-label="Toggle recurring post"
                        />
                      </div>

                      {isRecurring && (
                        <div className="mt-3">
                          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink-muted)" }}>
                            Repeat Interval
                          </label>
                          <select
                            value={recurrenceRule}
                            onChange={(e) => setRecurrenceRule(e.target.value as RecurrenceRule)}
                            className="input-field w-full text-xs py-2 px-3"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </fieldset>
          </div>

          {/* Right Live Platform Preview Panel (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 surface rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--ink-muted)" }}>
                Live Platform Preview
              </h2>

              <PlatformPreview
                text={body || "Your post text will appear here..."}
                imageUrl={mediaUrls[0]}
                username={connectedAccounts.find((a) => selectedAccountIds.includes(a.id))?.account_name || "socialpilot_brand"}
              />
            </div>
          </div>
        </div>
        </>
        )}

        {/* Toast */}
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all pointer-events-none"
          style={{
            background: "var(--ink)",
            color: "var(--bg-canvas)",
            opacity: toast ? 1 : 0,
            transform: toast ? "translateY(0)" : "translateY(8px)",
          }}
        >
          {toast}
        </div>
      </DashboardShell>
    </RoleGate>
  );
}
