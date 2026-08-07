/**
 * PreviewPage.tsx — Standalone demo for PlatformPreview + BestTimeToPost.
 * Route: /dashboard/preview
 * TODO: Integrate PlatformPreview and BestTimeToPost directly into the
 *       post-editor page once /dashboard/creator/new is built.
 */
import { useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import PlatformPreview from "../../components/PlatformPreview";
import BestTimeToPost from "../../components/BestTimeToPost";

const PLATFORMS = ["instagram", "facebook", "linkedin", "twitter", "youtube", "pinterest"];

export default function PreviewPage() {
  const [text, setText] = useState(
    "Excited to announce our new feature drop 🚀 — schedule smarter, post better. Check out what's new at the link in bio!"
  );
  const [platform, setPlatform] = useState("instagram");
  const [scheduleTime, setScheduleTime] = useState("");
  const [username, setUsername] = useState("your_brand");

  return (
    <DashboardShell active="Preview" pageTitle="Post Preview">
      <div className="max-w-5xl mx-auto space-y-6">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Preview how your post will look across each platform before scheduling.
          <em className="ml-1">This page will be embedded in the post editor once it's built.</em>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Editor inputs */}
          <div className="space-y-4">
            <div className="surface rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                Draft your post
              </h2>

              <div>
                <label className="field-label" htmlFor="preview-username">Username / handle</label>
                <input
                  id="preview-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  placeholder="your_brand"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="preview-caption">Caption / text</label>
                <textarea
                  id="preview-caption"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  className="input-field resize-none"
                  placeholder="Write your post text here…"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="preview-platform">Target platform</label>
                <select
                  id="preview-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="input-field capitalize"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p} className="capitalize">{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Best time suggestion */}
            <div className="surface rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                Schedule
              </h2>
              <div>
                <label className="field-label" htmlFor="preview-time">Scheduled time</label>
                <input
                  id="preview-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="input-field"
                />
              </div>
              <BestTimeToPost
                platform={platform}
                onUseTime={(t) => setScheduleTime(t)}
              />
            </div>
          </div>

          {/* Right: Preview */}
          <div className="surface rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--ink-muted)" }}>
              Platform preview
            </h2>
            <PlatformPreview text={text} username={username} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
