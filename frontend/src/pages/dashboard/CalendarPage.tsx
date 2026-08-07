/**
 * CalendarPage.tsx — Content calendar with native HTML5 drag-and-drop.
 * Route: /dashboard/calendar
 *
 * Drag tradeoff: Native HTML5 DnD is used (no library). It works well
 * for desktop but has limited touch support. If touch DnD is needed,
 * consider @dnd-kit/core (lightweight) in a future pass.
 *
 * TODO: Replace mock data with GET /api/posts?view=calendar&month=YYYY-MM
 *       and PATCH /api/posts/:id/reschedule on drop.
 */
import { useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import { type CalendarPost, MOCK_CALENDAR_POSTS } from "../../lib/mockData";

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C", facebook: "#1877F2", linkedin: "#0A66C2",
  twitter: "var(--ink)", youtube: "#FF0000", pinterest: "#BD081C",
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: "📸", facebook: "👍", linkedin: "💼",
  twitter: "𝕏", youtube: "▶", pinterest: "📌",
};

const STATUS_DOT: Record<CalendarPost["status"], string> = {
  scheduled: "#3498db", published: "#10b981", draft: "var(--ink-muted)", failed: "#ef4444",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface PostDetailPopover {
  post: CalendarPost;
  anchorRect: DOMRect;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [posts, setPosts] = useState<CalendarPost[]>(structuredClone(MOCK_CALENDAR_POSTS));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [popover, setPopover] = useState<PostDetailPopover | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const postsByDate: Record<string, CalendarPost[]> = {};
  posts.forEach((p) => {
    if (!postsByDate[p.scheduledDate]) postsByDate[p.scheduledDate] = [];
    postsByDate[p.scheduledDate].push(p);
  });

  // DnD handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(date);
  };

  const handleDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    if (!draggingId) return;
    const post = posts.find(p => p.id === draggingId);
    if (!post || post.scheduledDate === date) { setDraggingId(null); setDragOverDate(null); return; }
    setPosts(prev => prev.map(p => p.id === draggingId ? { ...p, scheduledDate: date } : p));
    const day = parseInt(date.split("-")[2], 10);
    showToast(`Rescheduled "${post.caption.slice(0, 40)}…" to ${MONTH_NAMES[month]} ${day}`);
    setDraggingId(null);
    setDragOverDate(null);
  };

  const handlePostClick = (e: React.MouseEvent, post: CalendarPost) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ post, anchorRect: rect });
  };

  const deletePost = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    setPopover(null);
    showToast("Post removed from calendar.");
  };

  return (
    <DashboardShell active="Calendar" pageTitle="Content Calendar">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="btn-outline-soft py-1.5 px-3 text-sm" aria-label="Previous month">←</button>
            <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextMonth} className="btn-outline-soft py-1.5 px-3 text-sm" aria-label="Next month">→</button>
          </div>
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }} className="btn-outline-soft py-1.5 px-3 text-xs">
            Today
          </button>
        </div>

        {/* Hint */}
        <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
          📌 Drag posts between days to reschedule · Click a post for details
        </p>

        {/* Grid */}
        <div className="surface rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)", borderBottom: "1px solid var(--line)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {/* Empty leading cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b min-h-[100px]" style={{ borderColor: "var(--line)", background: "rgba(107,114,128,0.02)" }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
              const day = dayIdx + 1;
              const iso = formatISO(year, month, day);
              const dayPosts = postsByDate[iso] ?? [];
              const isToday = iso === formatISO(now.getFullYear(), now.getMonth(), now.getDate());
              const isDragOver = dragOverDate === iso;

              return (
                <div
                  key={iso}
                  className="border-r border-b min-h-[100px] p-1.5 transition-colors"
                  style={{
                    borderColor: "var(--line)",
                    background: isDragOver ? "rgba(69,222,196,0.1)" : "transparent",
                  }}
                  onDragOver={(e) => handleDragOver(e, iso)}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={(e) => handleDrop(e, iso)}
                  onClick={() => setPopover(null)}
                >
                  <span
                    className="text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full mb-1"
                    style={{
                      background: isToday ? "var(--teal)" : "transparent",
                      color: isToday ? "#06231D" : "var(--ink)",
                    }}
                  >
                    {day}
                  </span>

                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => (
                      <button
                        key={post.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, post.id)}
                        onClick={(e) => handlePostClick(e, post)}
                        className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-left text-[10px] font-medium transition-opacity"
                        style={{
                          background: `${PLATFORM_COLORS[post.platform]}18`,
                          border: `1px solid ${PLATFORM_COLORS[post.platform]}30`,
                          color: "var(--ink)",
                          opacity: draggingId === post.id ? 0.4 : 1,
                          cursor: "grab",
                        }}
                        aria-label={`${post.platform} post: ${post.caption.slice(0, 40)}`}
                      >
                        <span style={{ color: PLATFORM_COLORS[post.platform] }} aria-hidden="true">
                          {PLATFORM_EMOJI[post.platform]}
                        </span>
                        <span className="truncate flex-1">{post.caption.slice(0, 25)}</span>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT[post.status] }} aria-hidden="true" />
                      </button>
                    ))}
                    {dayPosts.length > 3 && (
                      <p className="text-[10px] text-center" style={{ color: "var(--ink-muted)" }}>
                        +{dayPosts.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "var(--ink-muted)" }}>
          {Object.entries(STATUS_DOT).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* Post detail popover */}
      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Post details"
            aria-modal="true"
            className="fixed z-50 surface rounded-xl shadow-2xl p-4 w-72"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--line)",
              top: Math.min(popover.anchorRect.bottom + 8, window.innerHeight - 220),
              left: Math.min(popover.anchorRect.left, window.innerWidth - 300),
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: PLATFORM_COLORS[popover.post.platform], fontSize: 18 }} aria-hidden="true">
                {PLATFORM_EMOJI[popover.post.platform]}
              </span>
              <span className="text-xs font-bold capitalize" style={{ color: "var(--ink)" }}>
                {popover.post.platform}
              </span>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${STATUS_DOT[popover.post.status]}20`, color: STATUS_DOT[popover.post.status] }}>
                {popover.post.status}
              </span>
            </div>
            <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--ink)" }}>
              {popover.post.caption}
            </p>
            <p className="text-[11px] mb-4" style={{ color: "var(--ink-muted)" }}>
              📅 {popover.post.scheduledDate}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { showToast("Reschedule: drag the card to a new day."); setPopover(null); }}
                className="btn-outline-soft flex-1 text-xs py-1.5"
              >
                Reschedule
              </button>
              <button
                onClick={() => deletePost(popover.post.id)}
                className="flex-1 text-xs py-1.5 rounded-lg font-semibold"
                style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.18)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      <div
        className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all pointer-events-none"
        style={{ background: "var(--ink)", color: "var(--bg-canvas)", opacity: toast ? 1 : 0, transform: toast ? "translateY(0)" : "translateY(8px)" }}
      >
        {toast}
      </div>
    </DashboardShell>
  );
}
