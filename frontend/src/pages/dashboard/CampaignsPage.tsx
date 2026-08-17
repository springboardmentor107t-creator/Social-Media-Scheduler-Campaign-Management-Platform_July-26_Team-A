import { useState, useEffect } from "react";
import DashboardShell from "../../components/DashboardShell";
import {
  Campaign,
  CampaignTrackingData,
  CampaignScheduledPost,
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  fetchCampaignTracking,
  schedulePostForCampaign,
  fetchCampaignScheduledPosts
} from "../../services/campaignService";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    status: "active",
    budget: "$5,000",
    target_audience: "Tech Enthusiasts & Marketers",
    platforms: ["twitter", "linkedin"]
  });

  // Tracking Drawer state
  const [trackingCampaign, setTrackingCampaign] = useState<CampaignTrackingData | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<CampaignScheduledPost[]>([]);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  // Schedule Post Modal state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedCampaignForSchedule, setSelectedCampaignForSchedule] = useState<Campaign | null>(null);
  const [newPost, setNewPost] = useState({
    title: "",
    body: "",
    scheduled_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    platform: "twitter"
  });

  const loadData = async () => {
    setLoading(true);
    const data = await fetchCampaigns(statusFilter === "all" ? undefined : statusFilter);
    setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name) return;
    await createCampaign(newCampaign);
    setIsCreateOpen(false);
    setNewCampaign({
      name: "",
      description: "",
      status: "active",
      budget: "$5,000",
      target_audience: "Tech Enthusiasts & Marketers",
      platforms: ["twitter", "linkedin"]
    });
    loadData();
  };

  const handleOpenTracking = async (camp: Campaign) => {
    const tracking = await fetchCampaignTracking(camp.id);
    const posts = await fetchCampaignScheduledPosts(camp.id);
    setTrackingCampaign(tracking);
    setScheduledPosts(posts);
    setIsTrackingOpen(true);
  };

  const handleOpenSchedule = (camp: Campaign) => {
    setSelectedCampaignForSchedule(camp);
    setIsScheduleOpen(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignForSchedule || !newPost.title) return;
    await schedulePostForCampaign(selectedCampaignForSchedule.id, {
      title: newPost.title,
      body: newPost.body,
      scheduled_time: new Date(newPost.scheduled_time).toISOString(),
      platform: newPost.platform
    });
    setIsScheduleOpen(false);
    setNewPost({
      title: "",
      body: "",
      scheduled_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      platform: "twitter"
    });
    if (trackingCampaign && trackingCampaign.campaign_id === selectedCampaignForSchedule.id) {
      handleOpenTracking(selectedCampaignForSchedule);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (campId: string, newStatus: string) => {
    await updateCampaign(campId, { status: newStatus as any });
    loadData();
  };

  const getStatusBadge = (camp: Campaign) => {
    const s = (camp.status || "").toLowerCase();
    return (
      <select
        value={s}
        onChange={(e) => handleStatusChange(camp.id, e.target.value)}
        className={`px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer outline-none transition-colors ${
          s === "active"
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
            : s === "scheduled"
            ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
            : s === "completed"
            ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
            : s === "paused"
            ? "bg-purple-500/10 text-purple-500 border-purple-500/30"
            : "bg-gray-500/10 text-gray-400 border-gray-500/30"
        }`}
      >
        <option value="active" className="bg-card-light dark:bg-card-dark text-emerald-500 font-semibold">Active</option>
        <option value="scheduled" className="bg-card-light dark:bg-card-dark text-amber-500 font-semibold">Scheduled</option>
        <option value="completed" className="bg-card-light dark:bg-card-dark text-blue-500 font-semibold">Completed</option>
        <option value="paused" className="bg-card-light dark:bg-card-dark text-purple-500 font-semibold">Paused</option>
        <option value="draft" className="bg-card-light dark:bg-card-dark text-gray-400 font-semibold">Draft</option>
      </select>
    );
  };

  return (
    <DashboardShell active="Campaigns" roleLabel="Campaign Control Center">
      <div className="space-y-6">
        {/* Top Summary Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Campaigns</p>
            <h3 className="text-2xl font-bold mt-1.5">{campaigns.length}</h3>
            <p className="text-xs text-teal-dim mt-1 font-medium"> Across 5 social channels</p>
          </div>
          <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Active Campaigns</p>
            <h3 className="text-2xl font-bold mt-1.5 text-emerald-500">
              {campaigns.filter(c => c.status === "active").length}
            </h3>
            <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">Currently running</p>
          </div>
          <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Budget Allocated</p>
            <h3 className="text-2xl font-bold mt-1.5">$37,500</h3>
            <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">$26,250 spent (70%)</p>
          </div>
          <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Avg Return on Ad Spend</p>
            <h3 className="text-2xl font-bold mt-1.5 text-teal-dim">3.2x ROI</h3>
            <p className="text-xs text-emerald-500 mt-1 font-medium"> +18% vs last quarter</p>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field max-w-xs text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm max-w-[160px]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary-teal text-sm font-semibold flex items-center justify-center gap-2 py-2.5 px-4"
          >
            <span>+</span> Create New Campaign
          </button>
        </div>

        {/* Campaign List Table */}
        <div className="rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-light dark:text-muted-dark">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base font-semibold">No campaigns found</p>
              <p className="text-sm text-muted-light dark:text-muted-dark mt-1">Create your first campaign or try a different filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-canvas-light/50 dark:bg-canvas-dark/50 border-b border-line-light dark:border-line-dark text-xs uppercase font-semibold text-muted-light dark:text-muted-dark">
                  <tr>
                    <th className="p-4">Campaign Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Target Audience</th>
                    <th className="p-4">Platforms</th>
                    <th className="p-4">Budget / Spent</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-light dark:divide-line-dark">
                  {filteredCampaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-canvas-light/30 dark:hover:bg-canvas-dark/30 transition-colors">
                      <td className="p-4 font-medium">
                        <div className="font-semibold text-ink-light dark:text-ink-dark">{camp.name}</div>
                        {camp.description && <div className="text-xs text-muted-light dark:text-muted-dark truncate max-w-xs">{camp.description}</div>}
                      </td>
                      <td className="p-4">{getStatusBadge(camp)}</td>
                      <td className="p-4 text-xs text-muted-light dark:text-muted-dark">{camp.target_audience || "General Audience"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(camp.platforms || ["social"]).map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded text-[11px] font-medium bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark uppercase">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        <div className="font-semibold">{camp.budget || "$5,000"}</div>
                        <div className="text-muted-light dark:text-muted-dark">{camp.spent || "$0"} spent</div>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenTracking(camp)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-dim/10 text-teal-dim hover:bg-teal-dim/20 transition-colors"
                        >
                          Track Progress
                        </button>
                        <button
                          onClick={() => handleOpenSchedule(camp)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark hover:border-teal-dim transition-colors"
                        >
                          + Schedule Post
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Create Campaign Modal ─────────────────────────────────────────── */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-line-light dark:border-line-dark pb-3">
                <h3 className="text-lg font-bold">Create Campaign</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted-light dark:text-muted-dark text-xl font-bold">×</button>
              </div>
              <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="field-label">Campaign Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Growth Drive"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="field-label">Description & Objectives</label>
                  <textarea
                    rows={2}
                    placeholder="Targeting enterprise leads with webinar signups."
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Budget</label>
                    <input
                      type="text"
                      placeholder="$5,000"
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="field-label">Status</label>
                    <select
                      value={newCampaign.status}
                      onChange={(e) => setNewCampaign({ ...newCampaign, status: e.target.value })}
                      className="input-field"
                    >
                      <option value="active">Active</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="field-label">Target Audience</label>
                  <input
                    type="text"
                    placeholder="e.g. Founders, Marketers, Product Managers"
                    value={newCampaign.target_audience}
                    onChange={(e) => setNewCampaign({ ...newCampaign, target_audience: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-line-light dark:border-line-dark">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-outline-soft">Cancel</button>
                  <button type="submit" className="btn-primary-teal">Create Campaign</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Campaign Schedule Post Modal ───────────────────────────────────── */}
        {isScheduleOpen && selectedCampaignForSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-line-light dark:border-line-dark pb-3">
                <div>
                  <h3 className="text-lg font-bold">Schedule Campaign Post</h3>
                  <p className="text-xs text-teal-dim">{selectedCampaignForSchedule.name}</p>
                </div>
                <button onClick={() => setIsScheduleOpen(false)} className="text-muted-light dark:text-muted-dark text-xl font-bold">×</button>
              </div>
              <form onSubmit={handleScheduleSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="field-label">Post Title / Headline</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Product V2 Feature Teaser"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="field-label">Post Content / Caption</label>
                  <textarea
                    rows={3}
                    placeholder="Write campaign post body..."
                    value={newPost.body}
                    onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Platform</label>
                    <select
                      value={newPost.platform}
                      onChange={(e) => setNewPost({ ...newPost, platform: e.target.value })}
                      className="input-field"
                    >
                      <option value="twitter">Twitter / X</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={newPost.scheduled_time}
                      onChange={(e) => setNewPost({ ...newPost, scheduled_time: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-line-light dark:border-line-dark">
                  <button type="button" onClick={() => setIsScheduleOpen(false)} className="btn-outline-soft">Cancel</button>
                  <button type="submit" className="btn-primary-teal">Schedule Post</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Campaign Tracking Drawer ───────────────────────────────────────── */}
        {isTrackingOpen && trackingCampaign && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-card-light dark:bg-card-dark border-l border-line-light dark:border-line-dark h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-line-light dark:border-line-dark pb-4">
                <div>
                  <span className="text-xs font-semibold text-teal-dim uppercase tracking-wider">Live Campaign Tracking</span>
                  <h2 className="text-xl font-bold mt-0.5">{trackingCampaign.name}</h2>
                </div>
                <button onClick={() => setIsTrackingOpen(false)} className="text-muted-light dark:text-muted-dark text-2xl font-bold">×</button>
              </div>

              {/* Progress & Budget Utilization */}
              <div className="p-4 rounded-xl bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Campaign Completion Rate</span>
                  <span className="text-teal-dim font-bold">{trackingCampaign.progress_percentage}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
                  <div className="h-full bg-teal transition-all duration-500" style={{ width: `${trackingCampaign.progress_percentage}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-light dark:text-muted-dark pt-1">
                  <span>Budget: <strong className="text-ink-light dark:text-ink-dark">{trackingCampaign.budget}</strong></span>
                  <span>Spent: <strong className="text-ink-light dark:text-ink-dark">{trackingCampaign.spent}</strong></span>
                </div>
              </div>

              {/* Key Tracking Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark">
                  <p className="text-[11px] text-muted-light dark:text-muted-dark font-medium">Impressions</p>
                  <p className="text-lg font-bold mt-0.5">{trackingCampaign.metrics.impressions.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark">
                  <p className="text-[11px] text-muted-light dark:text-muted-dark font-medium">Clicks</p>
                  <p className="text-lg font-bold mt-0.5 text-teal-dim">{trackingCampaign.metrics.clicks.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark">
                  <p className="text-[11px] text-muted-light dark:text-muted-dark font-medium">Conversions</p>
                  <p className="text-lg font-bold mt-0.5 text-emerald-500">{trackingCampaign.metrics.conversions.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark">
                  <p className="text-[11px] text-muted-light dark:text-muted-dark font-medium">Eng. Rate</p>
                  <p className="text-lg font-bold mt-0.5">{trackingCampaign.metrics.engagement_rate}</p>
                </div>
              </div>

              {/* Delivery Status Counts */}
              <div className="p-4 rounded-xl bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">Post Delivery Status</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                    {trackingCampaign.metrics.published_posts} Published
                  </div>
                  <div className="p-2 rounded bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                    {trackingCampaign.metrics.pending_posts} Pending
                  </div>
                  <div className="p-2 rounded bg-rose-500/10 text-rose-500 font-semibold border border-rose-500/20">
                    {trackingCampaign.metrics.failed_posts} Failed
                  </div>
                </div>
              </div>

              {/* Scheduled Posts Linked to Campaign */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">Campaign Scheduled Posts ({scheduledPosts.length})</h4>
                  <button
                    onClick={() => {
                      const c = campaigns.find(item => item.id === trackingCampaign.campaign_id);
                      if (c) handleOpenSchedule(c);
                    }}
                    className="text-xs font-semibold text-teal-dim hover:underline"
                  >
                    + Schedule New Post
                  </button>
                </div>
                <div className="space-y-2">
                  {scheduledPosts.map((sp) => (
                    <div key={sp.id} className="p-3.5 rounded-xl bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-sm">{sp.content_title}</div>
                        {sp.content_body && <p className="text-muted-light dark:text-muted-dark mt-0.5 line-clamp-1">{sp.content_body}</p>}
                        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-light dark:text-muted-dark">
                          <span className="uppercase font-bold text-teal-dim">{sp.platform}</span>
                          <span>•</span>
                          <span>{new Date(sp.scheduled_time).toLocaleString()}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 capitalize shrink-0">
                        {sp.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-line-light dark:border-line-dark text-right">
                <button onClick={() => setIsTrackingOpen(false)} className="btn-outline-soft text-xs">Close Tracking</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
