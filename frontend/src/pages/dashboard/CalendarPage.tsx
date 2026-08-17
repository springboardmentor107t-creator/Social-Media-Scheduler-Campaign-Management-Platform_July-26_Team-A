import { useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import { type CalendarPost, MOCK_CALENDAR_POSTS } from "../../lib/mockData";
import { getFrontendRole } from "../../utils/roleUtils";

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
const PLATFORMS = ["instagram", "facebook", "linkedin", "twitter", "youtube", "pinterest"] as const;
const STATUSES  = ["draft", "scheduled", "published", "failed"] as const;

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfWeek(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function fmtISO(year: number, month: number, day: number) {
  return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

const WEEKDAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type ModalMode = "create" | "edit" | "view";

interface PostForm { caption: string; platform: typeof PLATFORMS[number]; status: typeof STATUSES[number]; }

const BLANK_FORM: PostForm = { caption: "", platform: "linkedin", status: "draft" };

export default function CalendarPage() {
  const now        = new Date();
  const role       = getFrontendRole(); // "admin" | "marketing" | "business" | "creator"
  const canEdit    = role === "admin" || role === "marketing" || role === "business";
  const isCreator  = role === "creator";

  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [posts, setPosts] = useState<CalendarPost[]>(structuredClone(MOCK_CALENDAR_POSTS));

  // Drag-and-drop
  const [draggingId,  setDraggingId]  = useState<string|null>(null);
  const [dragOverDate,setDragOverDate]= useState<string|null>(null);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  // Modal state
  const [modalMode,      setModalMode]      = useState<ModalMode|null>(null);
  const [modalDate,      setModalDate]      = useState("");
  const [selectedPost,   setSelectedPost]   = useState<CalendarPost|null>(null);
  const [form,           setForm]           = useState<PostForm>(BLANK_FORM);

  // Creator opinions  { "2026-08-12": "text" }
  const [opinions,       setOpinions]       = useState<Record<string,string>>({});
  const [opinionDraft,   setOpinionDraft]   = useState<Record<string,string>>({});
  const [opinionMode,    setOpinionMode]    = useState<string|null>(null); // ISO date currently editing

  // Confirm delete
  const [confirmDelete, setConfirmDelete]   = useState<CalendarPost|null>(null);

  /* ── month navigation ─────────────────────────────────────── */
  const prevMonth = () => { if (month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfWeek(year, month);

  const postsByDate: Record<string, CalendarPost[]> = {};
  posts.forEach(p => { (postsByDate[p.scheduledDate]??=[]).push(p); });

  /* ── drag handlers ────────────────────────────────────────── */
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canEdit) return;
    setDraggingId(id); e.dataTransfer.effectAllowed="move";
  };
  const handleDragOver  = (e: React.DragEvent, date: string) => { e.preventDefault(); setDragOverDate(date); };
  const handleDrop      = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    if (!draggingId||!canEdit) return;
    const post = posts.find(p=>p.id===draggingId);
    if (!post||post.scheduledDate===date){setDraggingId(null);setDragOverDate(null);return;}
    setPosts(prev=>prev.map(p=>p.id===draggingId?{...p,scheduledDate:date}:p));
    showToast(`Moved "${post.caption.slice(0,35)}…" to ${MONTH_NAMES[month]} ${parseInt(date.split("-")[2],10)}`);
    setDraggingId(null); setDragOverDate(null);
  };

  /* ── CRUD helpers ─────────────────────────────────────────── */
  const openCreate = (iso: string) => {
    if (!canEdit) return;
    setModalDate(iso); setForm(BLANK_FORM); setSelectedPost(null); setModalMode("create");
  };
  const openEdit = (post: CalendarPost) => {
    if (!canEdit) return;
    setSelectedPost(post);
    setForm({ caption:post.caption, platform:post.platform, status:post.status });
    setModalDate(post.scheduledDate);
    setModalMode("edit");
  };
  const openView = (post: CalendarPost) => {
    setSelectedPost(post); setModalMode("view");
  };

  const saveCreate = () => {
    if (!form.caption.trim()) return;
    const newPost: CalendarPost = {
      id: `usr-${Date.now()}`, caption:form.caption.trim(),
      platform:form.platform, status:form.status, scheduledDate:modalDate
    };
    setPosts(prev=>[...prev,newPost]);
    showToast("Post created successfully.");
    setModalMode(null);
  };
  const saveEdit = () => {
    if (!selectedPost||!form.caption.trim()) return;
    setPosts(prev=>prev.map(p=>p.id===selectedPost.id
      ? {...p, caption:form.caption, platform:form.platform, status:form.status, scheduledDate:modalDate}
      : p));
    showToast("Post updated successfully.");
    setModalMode(null);
  };
  const confirmDoDelete = () => {
    if (!confirmDelete) return;
    setPosts(prev=>prev.filter(p=>p.id!==confirmDelete.id));
    showToast("Post deleted.");
    setConfirmDelete(null); setModalMode(null);
  };

  /* ── opinion helpers ──────────────────────────────────────── */
  const submitOpinion = (iso: string) => {
    const txt = (opinionDraft[iso]??"").trim();
    if (!txt) return;
    setOpinions(prev=>({...prev,[iso]:txt}));
    setOpinionDraft(prev=>({...prev,[iso]:""}));
    setOpinionMode(null);
    showToast("Opinion posted!");
  };

  /* ── render ───────────────────────────────────────────────── */
  return (
    <DashboardShell active="Calendar" pageTitle="Content Calendar">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Role banner */}
        <div className={`text-xs px-4 py-2 rounded-xl font-medium ${canEdit
          ? "bg-teal-dim/10 text-teal-dim border border-teal-dim/20"
          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"}`}>
          {canEdit
            ? `✏️  You have full calendar access — create, edit, update & delete posts on each day.`
            : `👁️  You are viewing as Content Creator — click any day to share your opinion/feedback.`}
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="btn-outline-soft py-1.5 px-3 text-sm" aria-label="Previous month">←</button>
            <h2 className="text-lg font-bold">{MONTH_NAMES[month]} {year}</h2>
            <button onClick={nextMonth} className="btn-outline-soft py-1.5 px-3 text-sm" aria-label="Next month">→</button>
          </div>
          <button onClick={()=>{setYear(now.getFullYear());setMonth(now.getMonth());}} className="btn-outline-soft py-1.5 px-3 text-xs">
            Today
          </button>
        </div>

        <p className="text-xs" style={{color:"var(--ink-muted)"}}>
          {canEdit ? "📌 Drag to reschedule · Click post to view/edit · ＋ to create · 🗑 to delete" : "📌 Click a post to view details · Use the opinion box on each day to share feedback"}
        </p>

        {/* Calendar grid */}
        <div className="surface rounded-2xl overflow-hidden shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map(d=>(
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider"
                style={{color:"var(--ink-muted)",borderBottom:"1px solid var(--line)"}}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({length:firstDay}).map((_,i)=>(
              <div key={`empty-${i}`} className="border-r border-b min-h-[110px]"
                style={{borderColor:"var(--line)",background:"rgba(107,114,128,0.02)"}} />
            ))}

            {Array.from({length:daysInMonth}).map((_,dayIdx)=>{
              const day   = dayIdx+1;
              const iso   = fmtISO(year,month,day);
              const dayPosts = postsByDate[iso]??[];
              const isToday  = iso===fmtISO(now.getFullYear(),now.getMonth(),now.getDate());
              const isDragOver = dragOverDate===iso;
              const hasOpinion = !!opinions[iso];

              return (
                <div
                  key={iso}
                  className="border-r border-b min-h-[110px] p-1.5 flex flex-col transition-colors"
                  style={{borderColor:"var(--line)", background: isDragOver?"rgba(69,222,196,0.1)":"transparent"}}
                  onDragOver={e=>handleDragOver(e,iso)}
                  onDragLeave={()=>setDragOverDate(null)}
                  onDrop={e=>handleDrop(e,iso)}
                >
                  {/* Day number + action buttons */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full"
                      style={{background:isToday?"var(--teal)":"transparent",color:isToday?"#06231D":"var(--ink)"}}>
                      {day}
                    </span>
                    {canEdit && (
                      <button
                        onClick={()=>openCreate(iso)}
                        title="Create post on this day"
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{background:"rgba(69,222,196,0.15)",color:"var(--teal-dim)"}}>
                        +
                      </button>
                    )}
                    {isCreator && (
                      <button
                        onClick={()=>setOpinionMode(opinionMode===iso?null:iso)}
                        title="Share your opinion"
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:opacity-80 transition-opacity"
                        style={{background: hasOpinion?"rgba(245,158,11,0.15)":"rgba(107,114,128,0.10)", color: hasOpinion?"#f59e0b":"var(--ink-muted)"}}>
                        💬
                      </button>
                    )}
                  </div>

                  {/* Posts */}
                  <div className="space-y-0.5 flex-1">
                    {dayPosts.slice(0,3).map(post=>(
                      <div key={post.id} className="group relative">
                        <button
                          draggable={canEdit}
                          onDragStart={e=>handleDragStart(e,post.id)}
                          onClick={()=>canEdit ? openEdit(post) : openView(post)}
                          className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-left text-[10px] font-medium transition-opacity"
                          style={{
                            background:`${PLATFORM_COLORS[post.platform]}18`,
                            border:`1px solid ${PLATFORM_COLORS[post.platform]}30`,
                            color:"var(--ink)",
                            opacity: draggingId===post.id ? 0.4 : 1,
                            cursor: canEdit?"grab":"pointer",
                          }}>
                          <span style={{color:PLATFORM_COLORS[post.platform]}}>{PLATFORM_EMOJI[post.platform]}</span>
                          <span className="truncate flex-1">{post.caption.slice(0,22)}</span>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:STATUS_DOT[post.status]}} />
                        </button>
                        {/* Quick delete for privileged roles */}
                        {canEdit && (
                          <button
                            onClick={e=>{e.stopPropagation();setConfirmDelete(post);}}
                            title="Delete post"
                            className="absolute -right-1 -top-1 w-4 h-4 rounded-full text-[9px] font-bold items-center justify-center hidden group-hover:flex"
                            style={{background:"#ef4444",color:"#fff"}}>
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {dayPosts.length>3 && (
                      <p className="text-[10px] text-center" style={{color:"var(--ink-muted)"}}>+{dayPosts.length-3} more</p>
                    )}
                  </div>

                  {/* Creator opinion display */}
                  {hasOpinion && (
                    <div className="mt-1 px-1.5 py-1 rounded text-[9px] leading-snug"
                      style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.20)",color:"#f59e0b"}}>
                      💬 {opinions[iso]!.slice(0,40)}{opinions[iso]!.length>40?"…":""}
                    </div>
                  )}

                  {/* Opinion input box (creator only) */}
                  {isCreator && opinionMode===iso && (
                    <div className="mt-1 space-y-1" onClick={e=>e.stopPropagation()}>
                      <textarea
                        rows={2}
                        placeholder="Share your opinion…"
                        value={opinionDraft[iso]??""}
                        onChange={e=>setOpinionDraft(prev=>({...prev,[iso]:e.target.value}))}
                        className="w-full text-[10px] rounded p-1 resize-none outline-none"
                        style={{background:"rgba(107,114,128,0.08)",border:"1px solid var(--line)",color:"var(--ink)"}}
                      />
                      <div className="flex gap-1">
                        <button onClick={()=>submitOpinion(iso)}
                          className="flex-1 text-[10px] py-0.5 rounded font-semibold"
                          style={{background:"rgba(69,222,196,0.15)",color:"var(--teal-dim)"}}>
                          Post
                        </button>
                        <button onClick={()=>setOpinionMode(null)}
                          className="text-[10px] py-0.5 px-2 rounded"
                          style={{background:"rgba(107,114,128,0.10)",color:"var(--ink-muted)"}}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[11px]" style={{color:"var(--ink-muted)"}}>
          {Object.entries(STATUS_DOT).map(([status,color])=>(
            <span key={status} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{background:color}} />
              {status.charAt(0).toUpperCase()+status.slice(1)}
            </span>
          ))}
          {isCreator && <span className="flex items-center gap-1">💬 Your opinion</span>}
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ─────────────────────────────────────── */}
      {(modalMode==="create"||modalMode==="edit") && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            style={{background:"var(--bg-surface)",border:"1px solid var(--line)"}}>

            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{borderColor:"var(--line)"}}>
              <div>
                <h3 className="text-base font-bold">
                  {modalMode==="create"?"Create Post":"Edit Post"}
                </h3>
                <p className="text-xs mt-0.5" style={{color:"var(--ink-muted)"}}>
                  📅 {modalDate}
                </p>
              </div>
              <button onClick={()=>setModalMode(null)} className="text-xl font-bold" style={{color:"var(--ink-muted)"}}>×</button>
            </div>

            {/* Date override (edit only) */}
            {modalMode==="edit" && (
              <div>
                <label className="field-label">Reschedule Date</label>
                <input type="date" value={modalDate} onChange={e=>setModalDate(e.target.value)} className="input-field text-sm" />
              </div>
            )}

            <div>
              <label className="field-label">Caption / Post Body</label>
              <textarea rows={3} placeholder="Write your post content…"
                value={form.caption}
                onChange={e=>setForm(f=>({...f,caption:e.target.value}))}
                className="input-field text-sm resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Platform</label>
                <select value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value as any}))} className="input-field text-sm">
                  {PLATFORMS.map(p=>(
                    <option key={p} value={p}>{PLATFORM_EMOJI[p]} {p.charAt(0).toUpperCase()+p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as any}))} className="input-field text-sm">
                  {STATUSES.map(s=>(
                    <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t" style={{borderColor:"var(--line)"}}>
              <button onClick={()=>setModalMode(null)} className="btn-outline-soft flex-1 text-sm">Cancel</button>
              {modalMode==="edit" && (
                <button onClick={()=>setConfirmDelete(selectedPost!)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{background:"rgba(239,68,68,0.08)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.18)"}}>
                  Delete
                </button>
              )}
              <button
                onClick={modalMode==="create"?saveCreate:saveEdit}
                className="btn-primary-teal flex-1 text-sm">
                {modalMode==="create"?"Create Post":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW-ONLY MODAL (creator) ──────────────────────────────── */}
      {modalMode==="view" && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3"
            style={{background:"var(--bg-surface)",border:"1px solid var(--line)"}}>
            <div className="flex items-center gap-2">
              <span style={{color:PLATFORM_COLORS[selectedPost.platform],fontSize:20}}>
                {PLATFORM_EMOJI[selectedPost.platform]}
              </span>
              <span className="font-bold capitalize">{selectedPost.platform}</span>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{background:`${STATUS_DOT[selectedPost.status]}20`,color:STATUS_DOT[selectedPost.status]}}>
                {selectedPost.status}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{color:"var(--ink)"}}>{selectedPost.caption}</p>
            <p className="text-xs" style={{color:"var(--ink-muted)"}}>📅 {selectedPost.scheduledDate}</p>

            {/* Opinion inline on view */}
            <div className="pt-2 border-t space-y-2" style={{borderColor:"var(--line)"}}>
              <p className="text-xs font-semibold" style={{color:"var(--ink-muted)"}}>💬 Your Opinion</p>
              {opinions[selectedPost.scheduledDate] && (
                <p className="text-xs p-2 rounded" style={{background:"rgba(245,158,11,0.08)",color:"#f59e0b"}}>
                  {opinions[selectedPost.scheduledDate]}
                </p>
              )}
              <textarea rows={2} placeholder="Share your thoughts on this post…"
                value={opinionDraft[selectedPost.scheduledDate]??""}
                onChange={e=>setOpinionDraft(prev=>({...prev,[selectedPost.scheduledDate]:e.target.value}))}
                className="input-field text-xs resize-none" />
              <button onClick={()=>{submitOpinion(selectedPost.scheduledDate);setModalMode(null);}}
                className="btn-primary-teal w-full text-xs">
                Submit Opinion
              </button>
            </div>

            <button onClick={()=>setModalMode(null)} className="btn-outline-soft w-full text-xs">Close</button>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ─────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            style={{background:"var(--bg-surface)",border:"1px solid var(--line)"}}>
            <h3 className="text-base font-bold">Delete Post?</h3>
            <p className="text-sm" style={{color:"var(--ink-muted)"}}>
              "{confirmDelete.caption.slice(0,60)}…" will be permanently removed from the calendar.
            </p>
            <div className="flex gap-2">
              <button onClick={()=>setConfirmDelete(null)} className="btn-outline-soft flex-1 text-sm">Cancel</button>
              <button onClick={confirmDoDelete}
                className="flex-1 text-sm font-semibold py-2 rounded-xl"
                style={{background:"#ef4444",color:"#fff"}}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all pointer-events-none"
        style={{background:"var(--ink)",color:"var(--bg-canvas)",opacity:toast?1:0,transform:toast?"translateY(0)":"translateY(8px)"}}>
        {toast}
      </div>
    </DashboardShell>
  );
}
