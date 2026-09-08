import { useState, useEffect, useCallback } from "react";
import DashboardShell from "../../components/DashboardShell";
import {
  EngagementData,
  AudienceData,
  CampaignReportSummary,
  RoiData,
  CampaignComparisonData,
  PostAnalyticsData,
  fetchEngagementAnalytics,
  fetchAudienceData,
  fetchCampaignReports,
  fetchRoiAnalytics,
  fetchCampaignComparison,
  fetchPostAnalytics
} from "../../services/analyticsService";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"engagement" | "audience" | "reports" | "roi" | "post-performance">("engagement");
  const [timeframe, setTimeframe] = useState("30d");
  const [chartType, setChartType] = useState<"line" | "donut" | "pentagon">("donut");

  // Data states
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [audience, setAudience] = useState<AudienceData | null>(null);
  const [reports, setReports] = useState<CampaignReportSummary | null>(null);
  const [roi, setRoi] = useState<RoiData | null>(null);
  const [comparison, setComparison] = useState<CampaignComparisonData | null>(null);
  const [posts, setPosts] = useState<PostAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [postSearchTerm, setPostSearchTerm] = useState("");
  const [selectedPost, setSelectedPost] = useState<PostAnalyticsData | null>(null);

  // Auto-sync LinkedIn data on mount to get real follower counts
  const syncLinkedIn = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const { apiFetch } = await import("../../services/api");
      const res = await apiFetch<{ status: string; accounts_synced: number; data: Array<{ profile_name: string; followers_synced: number }> }>(
        "/api/linkedin/sync-analytics",
        { method: "POST" }
      );
      if (res.accounts_synced > 0 && !silent) {
        const name = res.data[0]?.profile_name ?? "LinkedIn";
        const followers = res.data[0]?.followers_synced;
        setSyncMsg(followers > 0
          ? `✅ Synced ${name}: ${followers.toLocaleString()} followers`
          : `✅ Synced ${name} (follower count via Marketing API only)`);
        setTimeout(() => setSyncMsg(null), 5000);
        // Reload analytics with fresh data
        await loadAnalytics();
      }
    } catch {
      // Not connected — ignore silently
    } finally {
      if (!silent) setSyncing(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const [engData, audData, repData, roiData, compData, postsData] = await Promise.all([
      fetchEngagementAnalytics(timeframe),
      fetchAudienceData(timeframe),
      fetchCampaignReports(),
      fetchRoiAnalytics(),
      fetchCampaignComparison(),
      fetchPostAnalytics()
    ]);

    setEngagement(engData);
    setAudience(audData);
    setReports(repData);
    setRoi(roiData);
    setComparison(compData);
    setPosts(postsData);
    setLoading(false);
  }, [timeframe]);

  useEffect(() => {
    // Auto-sync LinkedIn silently on load, then load analytics
    syncLinkedIn(true).then(() => loadAnalytics());
  }, [timeframe]);

  // SVG Line Chart renderer helper
  const renderLineChart = (dataPoints: Array<{ date: string; value: number }>, color = "var(--teal)") => {
    if (!dataPoints || dataPoints.length === 0) return null;
    const maxVal = Math.max(...dataPoints.map(d => d.value), 1);
    const width = 600;
    const height = 180;
    const padding = 30;

    const points = dataPoints.map((dp, idx) => {
      const x = padding + (idx / (dataPoints.length - 1)) * (width - padding * 2);
      const y = height - padding - (dp.value / maxVal) * (height - padding * 2);
      return { x, y, dp };
    });

    const pathD = points.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 drop-shadow-sm">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--line)" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--line)" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--line)" />

          {/* Area fill */}
          <path d={areaD} fill={color} fillOpacity="0.12" />

          {/* Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r="4" fill={color} className="transition-transform group-hover:scale-150" />
              <title>{`${p.dp.date}: ${p.dp.value.toLocaleString()}`}</title>
            </g>
          ))}
        </svg>
        <div className="relative w-full h-6 mt-2 text-[11px] text-muted-light dark:text-muted-dark font-mono overflow-hidden">
          {points
            .filter((_, idx) => {
              const total = points.length;
              if (total <= 6) return true;
              const step = Math.ceil(total / 5);
              return idx === 0 || idx === total - 1 || idx % step === 0;
            })
            .map((p, idx) => {
              const pct = (p.x / width) * 100;
              let alignmentClass = "transform -translate-x-1/2";
              let inlineStyle: React.CSSProperties = { left: `${pct}%` };
              if (p.x === padding) {
                alignmentClass = "";
                inlineStyle = { left: `${(padding / width) * 100}%` };
              } else if (p.x === width - padding) {
                alignmentClass = "transform -translate-x-full";
                inlineStyle = { left: `${((width - padding) / width) * 100}%` };
              }
              return (
                <span
                  key={idx}
                  className={`absolute whitespace-nowrap ${alignmentClass}`}
                  style={inlineStyle}
                >
                  {p.dp.date}
                </span>
              );
            })}
        </div>
      </div>
    );
  };

  // SVG Donut Chart renderer helper
  const renderDonutChart = (items: Array<{ label: string; value: number; color: string }>) => {
    if (!items || items.length === 0) return null;
    const total = items.reduce((acc, item) => acc + item.value, 0);
    if (total === 0) return null;

    const radius = 70;
    const strokeWidth = 28;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
      <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4 animate-fade-in">
        {/* Donut SVG */}
        <div className="relative w-56 h-56 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90 drop-shadow-md">
            {items.map((item, idx) => {
              const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedAngle;
              accumulatedAngle += (item.value / total) * circumference;

              return (
                <circle
                  key={idx}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                >
                  <title>{`${item.label}: ${item.value.toLocaleString()} (${((item.value / total) * 100).toFixed(1)}%)`}</title>
                </circle>
              );
            })}
          </svg>
          {/* Inner Donut Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl font-black text-ink-light dark:text-ink-dark">
              {total.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
              Total Breakdown
            </span>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 gap-3 max-w-sm w-full">
          {items.map((item, idx) => {
            const pct = ((item.value / total) * 100).toFixed(1);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-line-light dark:border-line-dark bg-canvas-light/40 dark:bg-canvas-dark/40"
              >
                <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ background: item.color }} />
                <div className="truncate">
                  <p className="text-xs font-bold truncate">{item.label}</p>
                  <p className="text-[11px] font-mono text-muted-light dark:text-muted-dark">
                    {item.value.toLocaleString()} ({pct}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // SVG Pentagon (5-Vertex Radar) Chart renderer helper
  const renderPentagonChart = (metrics: Array<{ label: string; value: number; max: number }>) => {
    if (!metrics || metrics.length < 5) return null;
    const fiveMetrics = metrics.slice(0, 5);
    const cx = 160;
    const cy = 150;
    const R = 95;
    const numSides = 5;

    // Calculate vertex angles starting from top (-pi/2)
    const angles = Array.from({ length: numSides }, (_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / numSides);

    // Helper to get point coordinates
    const getPoint = (angle: number, radius: number) => ({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });

    // Concentric grid pentagons
    const gridLevels = [0.25, 0.5, 0.75, 1.0];

    // Polygon points for data
    const dataPoints = fiveMetrics.map((m, i) => {
      const ratio = Math.min(Math.max(m.value / (m.max || 1), 0.05), 1.0);
      return getPoint(angles[i], R * ratio);
    });
    const polygonD = dataPoints.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";

    const outerVertices = angles.map((a) => getPoint(a, R));

    return (
      <div className="flex flex-col lg:flex-row items-center justify-around gap-6 py-4 animate-fade-in">
        {/* Pentagon SVG Radar */}
        <div className="relative w-72 h-72 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 320 300" className="w-full h-full overflow-visible drop-shadow-sm">
            {/* Concentric Pentagon Grids */}
            {gridLevels.map((lvl, lIdx) => {
              const pts = angles.map((a) => getPoint(a, R * lvl));
              const gridD = pts.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";
              return (
                <path
                  key={lIdx}
                  d={gridD}
                  fill="none"
                  stroke="var(--line)"
                  strokeDasharray={lvl === 1.0 ? "none" : "3 3"}
                  strokeWidth={lvl === 1.0 ? "1.5" : "1"}
                />
              );
            })}

            {/* Radial Spokes from Center to Pentagon Vertices */}
            {outerVertices.map((v, i) => (
              <line key={i} x1={cx} y1={cy} x2={v.x} y2={v.y} stroke="var(--line)" strokeDasharray="3 3" />
            ))}

            {/* Data Radar Fill Polygon */}
            <path d={polygonD} fill="var(--teal)" fillOpacity="0.25" stroke="var(--teal)" strokeWidth="3" strokeLinejoin="round" />

            {/* Data Vertex Dots */}
            {dataPoints.map((p, i) => (
              <g key={i} className="group cursor-pointer">
                <circle cx={p.x} cy={p.y} r="6" fill="var(--teal)" className="transition-transform group-hover:scale-150" />
                <circle cx={p.x} cy={p.y} r="2" fill="#fff" />
                <title>{`${fiveMetrics[i].label}: ${fiveMetrics[i].value.toLocaleString()}`}</title>
              </g>
            ))}

            {/* Pentagon Labels placed radially outside */}
            {angles.map((a, i) => {
              const labelRadius = R + 26;
              const lp = getPoint(a, labelRadius);
              return (
                <text
                  key={i}
                  x={lp.x}
                  y={lp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[11px] font-bold fill-current text-ink-light dark:text-ink-dark"
                >
                  {fiveMetrics[i].label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Metric Cards List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md w-full">
          {fiveMetrics.map((m, idx) => {
            const pct = Math.round((m.value / (m.max || 1)) * 100);
            return (
              <div
                key={idx}
                className="p-3 rounded-xl border border-line-light dark:border-line-dark bg-canvas-light/40 dark:bg-canvas-dark/40 space-y-1"
              >
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-muted-light dark:text-muted-dark">{m.label}</span>
                  <span className="font-mono text-teal-dim font-bold">{m.value.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
                  <div className="h-full bg-teal transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const exportReport = (format: "csv" | "json") => {
    if (!reports) return;
    const content = format === "json"
      ? JSON.stringify(reports, null, 2)
      : "Campaign Name,Status,Budget,Spent,Impressions,Clicks,Conversions,ROI\n" +
        reports.campaign_reports.map(r => `"${r.name}",${r.status},${r.budget},${r.spent},${r.impressions},${r.clicks},${r.conversions},${r.roi}`).join("\n");

    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign_performance_report.${format}`;
    a.click();
  };

  return (
    <DashboardShell active="Analytics" roleLabel="Interactive Performance Engine">
      <div className="space-y-6">

        {/* ── DEMO DATA Disclosure Banner ──────────────────────────────────── */}
        {(!engagement || engagement.is_mock) ? (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold border"
            style={{
              background: "rgba(245,158,11,0.08)",
              borderColor: "rgba(245,158,11,0.3)",
              color: "#d97706",
            }}
          >
            <span className="text-base">📊</span>
            <span>
              <strong>Demo Data:</strong> Analytics shown are simulated.
              Connect LinkedIn on the{" "}
              <a href="/dashboard/connect" style={{ textDecoration: "underline" }}>Connect Accounts</a>{" "}
              page, then click <strong>"Sync LinkedIn"</strong> below to load your real data.
            </span>
          </div>
        ) : (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold border"
            style={{
              background: "rgba(16,185,129,0.08)",
              borderColor: "rgba(16,185,129,0.3)",
              color: "#059669",
            }}
          >
            <span className="text-base">✅</span>
            <span>
              <strong>Real-Time Analytics Connected:</strong> Metrics are synchronizing from your connected social accounts.
            </span>
            <button
              onClick={() => syncLinkedIn(false)}
              disabled={syncing}
              className="ml-auto px-3 py-1 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(16,185,129,0.2)", border: "1px solid #059669", color: "#059669", cursor: syncing ? "not-allowed" : "pointer" }}
            >
              {syncing ? "Syncing…" : "🔄 Sync LinkedIn"}
            </button>
          </div>
        )}

        {/* Auto-sync status display */}
        {syncMsg && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold border"
            style={{
              background: "rgba(10,102,194,0.08)",
              borderColor: "rgba(10,102,194,0.3)",
              color: "#0a66c2",
            }}
          >
            <span className="text-base">ℹ️</span>
            <span>{syncMsg}</span>
          </div>
        )}


        {/* Header Tabs & Timeframe Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-line-light dark:border-line-dark pb-4">
          <nav className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("engagement")}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all shrink-0 ${
                activeTab === "engagement"
                  ? "bg-teal text-ink-dark shadow-sm"
                  : "text-muted-light dark:text-muted-dark hover:bg-canvas-light dark:hover:bg-canvas-dark"
              }`}
            >
              Engagement Analytics
            </button>
            <button
              onClick={() => setActiveTab("audience")}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all shrink-0 ${
                activeTab === "audience"
                  ? "bg-teal text-ink-dark shadow-sm"
                  : "text-muted-light dark:text-muted-dark hover:bg-canvas-light dark:hover:bg-canvas-dark"
              }`}
            >
              Audience Growth
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all shrink-0 ${
                activeTab === "reports"
                  ? "bg-teal text-ink-dark shadow-sm"
                  : "text-muted-light dark:text-muted-dark hover:bg-canvas-light dark:hover:bg-canvas-dark"
              }`}
            >
              Campaign Reports
            </button>
            <button
              onClick={() => setActiveTab("roi")}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all shrink-0 ${
                activeTab === "roi"
                  ? "bg-teal text-ink-dark shadow-sm"
                  : "text-muted-light dark:text-muted-dark hover:bg-canvas-light dark:hover:bg-canvas-dark"
              }`}
            >
              ROI & Comparison
            </button>
            <button
              onClick={() => setActiveTab("post-performance")}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all shrink-0 ${
                activeTab === "post-performance"
                  ? "bg-teal text-ink-dark shadow-sm"
                  : "text-muted-light dark:text-muted-dark hover:bg-canvas-light dark:hover:bg-canvas-dark"
              }`}
            >
              Post Performance
            </button>
          </nav>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-medium text-muted-light dark:text-muted-dark">Timeframe:</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="input-field text-xs py-1.5 px-3 min-w-[130px]"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">1 Year</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-sm text-muted-light dark:text-muted-dark">Loading analytics engine...</div>
        ) : (
          <>
            {/* ── TAB 1: ENGAGEMENT ANALYTICS ─────────────────────────────────── */}
            {activeTab === "engagement" && engagement && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Engagement</p>
                    <h3 className="text-2xl font-bold mt-1.5">{engagement.summary.total_engagement.toLocaleString()}</h3>
                    <p className="text-xs text-emerald-500 mt-1 font-medium"> +14.2% vs previous period</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Avg Engagement Rate</p>
                    <h3 className="text-2xl font-bold mt-1.5 text-teal-dim">{engagement.summary.avg_engagement_rate}</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">Industry Benchmark: 3.5%</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Likes & Reactions</p>
                    <h3 className="text-2xl font-bold mt-1.5">{engagement.summary.total_likes.toLocaleString()}</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">{engagement.summary.total_comments.toLocaleString()} comments</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Shares & Link Clicks</p>
                    <h3 className="text-2xl font-bold mt-1.5">{engagement.summary.total_clicks.toLocaleString()}</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">{engagement.summary.total_shares.toLocaleString()} reshares</p>
                  </div>
                </div>

                {/* Engagement Interactive Chart with Graph Type Controls */}
                <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold">Engagement Analysis & Trend</h3>
                      <p className="text-xs text-muted-light dark:text-muted-dark">Interaction volume breakdown and performance metrics</p>
                    </div>
                    {/* Graph Type Switcher Controls */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark text-xs">
                      <button
                        onClick={() => setChartType("donut")}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                          chartType === "donut"
                            ? "bg-teal text-ink-dark shadow-xs"
                            : "text-muted-light dark:text-muted-dark hover:text-ink-light dark:hover:text-ink-dark"
                        }`}
                      >
                        🍩 Donut Graph
                      </button>
                      <button
                        onClick={() => setChartType("pentagon")}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                          chartType === "pentagon"
                            ? "bg-teal text-ink-dark shadow-xs"
                            : "text-muted-light dark:text-muted-dark hover:text-ink-light dark:hover:text-ink-dark"
                        }`}
                      >
                        🔷 Pentagon Graph
                      </button>
                      <button
                        onClick={() => setChartType("line")}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                          chartType === "line"
                            ? "bg-teal text-ink-dark shadow-xs"
                            : "text-muted-light dark:text-muted-dark hover:text-ink-light dark:hover:text-ink-dark"
                        }`}
                      >
                        📈 Line Trend
                      </button>
                    </div>
                  </div>

                  {/* Render Graph Based on Selected Chart Type */}
                  {chartType === "donut" && (
                    renderDonutChart(
                      engagement.platform_breakdown.map((p, idx) => ({
                        label: p.platform,
                        value: p.engagement,
                        color: ["#0a66c2", "#e4405f", "#1da1f2", "#1877f2", "#ff0000"][idx % 5],
                      }))
                    )
                  )}

                  {chartType === "pentagon" && (
                    renderPentagonChart([
                      { label: "Likes", value: engagement.summary.total_likes, max: Math.max(engagement.summary.total_likes * 1.5, 500) },
                      { label: "Comments", value: engagement.summary.total_comments, max: Math.max(engagement.summary.total_comments * 2.5, 100) },
                      { label: "Shares", value: engagement.summary.total_shares, max: Math.max(engagement.summary.total_shares * 2.5, 100) },
                      { label: "Link Clicks", value: engagement.summary.total_clicks, max: Math.max(engagement.summary.total_clicks * 1.5, 1500) },
                      { label: "Engagement", value: engagement.summary.total_engagement, max: Math.max(engagement.summary.total_engagement * 1.2, 1000) },
                    ])
                  )}

                  {chartType === "line" && (
                    renderLineChart(
                      engagement.timeline.map((t) => ({ date: t.date, value: t.likes + t.comments + t.shares })),
                      "var(--teal)"
                    )
                  )}
                </div>

                {/* 5-Vertex Pentagon Metric Radar Breakdown */}
                <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                  <div>
                    <h3 className="text-base font-bold">5-Axis Pentagon Performance Radar</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark">Multi-dimensional evaluation across 5 core engagement metrics</p>
                  </div>
                  {renderPentagonChart([
                    { label: "Likes", value: engagement.summary.total_likes, max: Math.max(engagement.summary.total_likes * 1.5, 500) },
                    { label: "Comments", value: engagement.summary.total_comments, max: Math.max(engagement.summary.total_comments * 2.5, 100) },
                    { label: "Shares", value: engagement.summary.total_shares, max: Math.max(engagement.summary.total_shares * 2.5, 100) },
                    { label: "Link Clicks", value: engagement.summary.total_clicks, max: Math.max(engagement.summary.total_clicks * 1.5, 1500) },
                    { label: "Engagement", value: engagement.summary.total_engagement, max: Math.max(engagement.summary.total_engagement * 1.2, 1000) },
                  ])}
                </div>

                {/* Platform Engagement Donut Breakdown */}
                <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                  <div>
                    <h3 className="text-base font-bold">Platform Engagement Donut Breakdown</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark">Visual proportion share per social channel</p>
                  </div>
                  {renderDonutChart(
                    engagement.platform_breakdown.map((p, idx) => ({
                      label: p.platform,
                      value: p.engagement,
                      color: ["#0a66c2", "#e4405f", "#1da1f2", "#1877f2", "#ff0000"][idx % 5],
                    }))
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-line-light dark:border-line-dark">
                    {engagement.platform_breakdown.map((p) => (
                      <div key={p.platform} className="p-4 rounded-xl bg-canvas-light dark:bg-canvas-dark border border-line-light dark:border-line-dark space-y-2">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span>{p.platform}</span>
                          <span className="text-xs font-mono text-teal-dim">{p.share} share</span>
                        </div>
                        <div className="text-xl font-bold">{p.engagement.toLocaleString()}</div>
                        <div className="w-full h-2 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
                          <div className="h-full bg-teal" style={{ width: p.share }} />
                        </div>
                        <div className="text-xs text-muted-light dark:text-muted-dark flex justify-between pt-1">
                          <span>Engagement Rate:</span>
                          <strong className="text-ink-light dark:text-ink-dark">{p.rate}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: AUDIENCE GROWTH & PERFORMANCE ────────────────────────── */}
            {activeTab === "audience" && audience && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Audience Size</p>
                    <h3 className="text-2xl font-bold mt-1.5">{audience.summary.total_followers.toLocaleString()}</h3>
                    <p className="text-xs text-emerald-500 mt-1 font-medium">{audience.summary.growth_rate} growth rate</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Impressions</p>
                    <h3 className="text-2xl font-bold mt-1.5">{audience.summary.total_impressions.toLocaleString()}</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">Across all campaign channels</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Unique Organic Reach</p>
                    <h3 className="text-2xl font-bold mt-1.5 text-teal-dim">{audience.summary.total_reach.toLocaleString()}</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">Unique accounts reached</p>
                  </div>
                </div>

                {/* Follower Growth Curve Chart */}
                <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                  <h3 className="text-base font-bold">Follower Growth Trend Curve</h3>
                  {renderLineChart(
                    audience.growth_trend.map(g => ({ date: g.date, value: g.total_followers })),
                    "#10b981"
                  )}
                </div>

                {/* Demographics Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Age Distribution */}
                  <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                    <h3 className="text-base font-bold">Age Demographics Distribution</h3>
                    <div className="space-y-3">
                      {audience.demographics.age_groups.map(age => (
                        <div key={age.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>Age {age.label}</span>
                            <span className="font-mono font-bold">{age.percentage}%</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
                            <div className="h-full bg-teal" style={{ width: `${age.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Locations */}
                  <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                    <h3 className="text-base font-bold">Top Geographical Audiences</h3>
                    <div className="space-y-3">
                      {audience.demographics.top_locations.map(loc => (
                        <div key={loc.country} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>{loc.country}</span>
                            <span className="font-mono font-bold">{loc.percentage}%</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${loc.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: CAMPAIGN REPORTS & METRICS ───────────────────────────── */}
            {activeTab === "reports" && reports && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">Campaign Performance Metric Reports</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">Aggregated performance summary across all marketing initiatives.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => exportReport("csv")} className="btn-outline-soft text-xs">Export CSV</button>
                    <button onClick={() => exportReport("json")} className="btn-outline-soft text-xs">Export JSON</button>
                    <button onClick={() => window.print()} className="btn-primary-teal text-xs">Print Report</button>
                  </div>
                </div>

                <div className="rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-canvas-light/50 dark:bg-canvas-dark/50 border-b border-line-light dark:border-line-dark text-xs uppercase font-semibold text-muted-light dark:text-muted-dark">
                        <tr>
                          <th className="p-4">Campaign</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Budget</th>
                          <th className="p-4">Spent</th>
                          <th className="p-4">Impressions</th>
                          <th className="p-4">Clicks</th>
                          <th className="p-4">Conversions</th>
                          <th className="p-4 font-bold text-teal-dim">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line-light dark:divide-line-dark">
                        {reports.campaign_reports.map((r) => (
                          <tr key={r.campaign_id} className="hover:bg-canvas-light/30 dark:hover:bg-canvas-dark/30 transition-colors">
                            <td className="p-4 font-semibold">{r.name}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 capitalize">
                                {r.status}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-xs">{r.budget}</td>
                            <td className="p-4 font-mono text-xs text-muted-light dark:text-muted-dark">{r.spent}</td>
                            <td className="p-4 font-mono text-xs">{r.impressions.toLocaleString()}</td>
                            <td className="p-4 font-mono text-xs">{r.clicks.toLocaleString()}</td>
                            <td className="p-4 font-mono text-xs font-bold text-emerald-500">{r.conversions.toLocaleString()}</td>
                            <td className="p-4 font-mono text-sm font-extrabold text-teal-dim">{r.roi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: ROI & CAMPAIGN COMPARISON ────────────────────────────── */}
            {activeTab === "roi" && roi && comparison && (
              <div className="space-y-6">
                {/* ROI Headline Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Revenue Generated</p>
                    <h3 className="text-2xl font-bold mt-1.5 text-emerald-500">{roi.roi_summary.revenue_generated}</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1">Investment: {roi.roi_summary.total_investment}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Overall ROI Multiplier</p>
                    <h3 className="text-2xl font-bold mt-1.5 text-teal-dim">{roi.roi_summary.roi_multiplier} ({roi.roi_summary.overall_roi})</h3>
                    <p className="text-xs text-emerald-500 mt-1 font-medium">Net Profit: {roi.roi_summary.net_profit}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Cost Per Lead (CPL)</p>
                    <h3 className="text-2xl font-bold mt-1.5">{roi.roi_summary.cost_per_lead}</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1">Average across campaigns</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Cost Per Acquisition (CPA)</p>
                    <h3 className="text-2xl font-bold mt-1.5">{roi.roi_summary.cost_per_acquisition}</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1">-14% acquisition cost</p>
                  </div>
                </div>

                {/* Winning Badges Banner */}
                <div className="p-5 rounded-2xl bg-teal-dim/10 border border-teal-dim/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-dim">Automated AI Insights</span>
                    <h4 className="text-base font-bold mt-0.5">Top Performing Campaign Highlights</h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <div className="px-3 py-1.5 rounded-xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark">
                      Highest ROI: <strong className="text-emerald-500">{comparison.winning_metrics.highest_roi}</strong>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark">
                      Lowest CPA: <strong className="text-teal-dim">{comparison.winning_metrics.lowest_cpa}</strong>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Campaign Comparison Table */}
                <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                  <h3 className="text-base font-bold">Side-by-Side Campaign Comparison Matrix</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-canvas-light/50 dark:bg-canvas-dark/50 border-b border-line-light dark:border-line-dark text-xs uppercase font-semibold text-muted-light dark:text-muted-dark">
                        <tr>
                          <th className="p-4">Campaign Name</th>
                          <th className="p-4">Budget / Spent</th>
                          <th className="p-4">CTR</th>
                          <th className="p-4">Conversions</th>
                          <th className="p-4">CPA</th>
                          <th className="p-4">Revenue</th>
                          <th className="p-4 font-bold text-teal-dim">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line-light dark:divide-line-dark">
                        {comparison.compared_campaigns.map((c) => (
                          <tr key={c.id} className="hover:bg-canvas-light/30 dark:hover:bg-canvas-dark/30 transition-colors">
                            <td className="p-4 font-bold text-ink-light dark:text-ink-dark">{c.name}</td>
                            <td className="p-4 font-mono text-xs">{c.budget} / {c.spent}</td>
                            <td className="p-4 font-mono text-xs">{c.ctr}</td>
                            <td className="p-4 font-mono text-xs font-semibold">{c.conversions.toLocaleString()}</td>
                            <td className="p-4 font-mono text-xs text-emerald-500 font-bold">{c.cpa}</td>
                            <td className="p-4 font-mono text-xs font-bold">{c.revenue}</td>
                            <td className="p-4 font-mono text-base font-extrabold text-teal-dim">{c.roi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: POST PERFORMANCE ────────────────────────────────────── */}
            {activeTab === "post-performance" && (
              <div className="space-y-6 animate-fade-in">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Published Posts</p>
                    <h3 className="text-2xl font-bold mt-1.5">{posts.length}</h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">Across all platforms</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Impressions</p>
                    <h3 className="text-2xl font-bold mt-1.5">
                      {posts.reduce((acc, p) => acc + (p.metrics?.impressions || 0), 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-emerald-500 mt-1 font-medium">Avg: {posts.length ? Math.round(posts.reduce((acc, p) => acc + (p.metrics?.impressions || 0), 0) / posts.length).toLocaleString() : 0} per post</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Total Likes & Reactions</p>
                    <h3 className="text-2xl font-bold mt-1.5 text-emerald-500">
                      {posts.reduce((acc, p) => acc + (p.metrics?.likes || 0), 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">
                      {posts.reduce((acc, p) => acc + (p.metrics?.comments || 0), 0).toLocaleString()} comments
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Avg Engagement Rate</p>
                    <h3 className="text-2xl font-bold mt-1.5 text-teal-dim">
                      {posts.length
                        ? `${(posts.reduce((acc, p) => acc + (p.metrics?.engagement_rate || 0), 0) / posts.length * 100).toFixed(1)}%`
                        : "0.0%"}
                    </h3>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1 font-medium">Benchmark: 3.5%</p>
                  </div>
                </div>

                {/* Filter and Table Card */}
                <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold">Published Post Analytics</h3>
                      <p className="text-xs text-muted-light dark:text-muted-dark">Track how individual published posts perform across all channels.</p>
                    </div>
                    <div className="w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Search posts..."
                        value={postSearchTerm}
                        onChange={(e) => setPostSearchTerm(e.target.value)}
                        className="input-field text-xs py-1.5 px-3 w-full sm:w-[220px]"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line-light dark:border-line-dark overflow-hidden bg-canvas-light/20 dark:bg-canvas-dark/20">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-canvas-light/50 dark:bg-canvas-dark/50 border-b border-line-light dark:border-line-dark text-xs uppercase font-semibold text-muted-light dark:text-muted-dark">
                          <tr>
                            <th className="p-4">Post</th>
                            <th className="p-4">Platform</th>
                            <th className="p-4">Published Date</th>
                            <th className="p-4">Impressions</th>
                            <th className="p-4">Likes</th>
                            <th className="p-4">Comments</th>
                            <th className="p-4">Engagement Rate</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line-light dark:divide-line-dark">
                          {posts
                            .filter(
                              (p) =>
                                p.title?.toLowerCase().includes(postSearchTerm.toLowerCase()) ||
                                p.body?.toLowerCase().includes(postSearchTerm.toLowerCase())
                            )
                            .map((p) => (
                              <tr key={p.post_id} className="hover:bg-canvas-light/30 dark:hover:bg-canvas-dark/30 transition-colors">
                                <td className="p-4 max-w-[240px]">
                                  <div className="font-semibold truncate">{p.title}</div>
                                  <div className="text-xs text-muted-light dark:text-muted-dark truncate mt-0.5">{p.body}</div>
                                </td>
                                <td className="p-4">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ color: "var(--teal-dim)", background: "rgba(69,222,196,0.08)" }}>
                                    {p.platform}
                                  </span>
                                </td>
                                <td className="p-4 font-mono text-xs text-muted-light dark:text-muted-dark">
                                  {p.published_at ? new Date(p.published_at).toLocaleString() : "—"}
                                </td>
                                <td className="p-4 font-mono text-xs">{p.metrics?.impressions?.toLocaleString() ?? 0}</td>
                                <td className="p-4 font-mono text-xs text-emerald-500 font-bold">{p.metrics?.likes?.toLocaleString() ?? 0}</td>
                                <td className="p-4 font-mono text-xs text-teal-dim">{p.metrics?.comments?.toLocaleString() ?? 0}</td>
                                <td className="p-4 font-mono text-xs font-semibold">
                                  {typeof p.metrics?.engagement_rate === "number"
                                    ? `${(p.metrics.engagement_rate * 100).toFixed(1)}%`
                                    : p.metrics?.engagement_rate ?? "0.0%"}
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => setSelectedPost(p)}
                                    className="btn-outline-soft text-xs px-2.5 py-1.5"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {posts.filter(
                            (p) =>
                              p.title?.toLowerCase().includes(postSearchTerm.toLowerCase()) ||
                              p.body?.toLowerCase().includes(postSearchTerm.toLowerCase())
                          ).length === 0 && (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-xs text-muted-light dark:text-muted-dark">
                                No published posts found matching your criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Post Detail Modal */}
            {selectedPost && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
                role="dialog"
                aria-modal="true"
                onClick={() => setSelectedPost(null)}
              >
                <div
                  className="w-full max-w-lg p-6 rounded-2xl surface shadow-2xl animate-in scale-in duration-200"
                  style={{ background: "var(--bg-surface)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start mb-4 pb-2" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-dim">Post Performance Report</span>
                      <h2 className="text-base font-bold truncate max-w-[320px]" style={{ color: "var(--ink)" }}>
                        {selectedPost.title}
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="text-muted-light dark:text-muted-dark hover:text-[var(--ink)] text-lg"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between text-xs text-muted-light dark:text-muted-dark">
                      <span>Platform: <strong className="text-teal-dim">{selectedPost.platform}</strong></span>
                      {selectedPost.published_at && (
                        <span>Published: <strong>{new Date(selectedPost.published_at).toLocaleString()}</strong></span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Impressions</p>
                        <p className="text-lg font-bold mt-0.5 text-[var(--ink)]">
                          {selectedPost.metrics?.impressions?.toLocaleString() ?? 0}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Reach</p>
                        <p className="text-lg font-bold mt-0.5 text-[var(--ink)]">
                          {selectedPost.metrics?.reach?.toLocaleString() ?? 0}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Link Clicks</p>
                        <p className="text-lg font-bold mt-0.5 text-teal-dim">
                          {selectedPost.metrics?.clicks?.toLocaleString() ?? 0}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Likes</p>
                        <p className="text-lg font-bold mt-0.5 text-emerald-500">
                          {selectedPost.metrics?.likes?.toLocaleString() ?? 0}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Comments</p>
                        <p className="text-lg font-bold mt-0.5 text-teal-dim">
                          {selectedPost.metrics?.comments?.toLocaleString() ?? 0}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Reshares</p>
                        <p className="text-lg font-bold mt-0.5 text-[var(--ink)]">
                          {selectedPost.metrics?.shares?.toLocaleString() ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Click-Through Rate (CTR)</p>
                        <p className="text-lg font-bold mt-0.5 text-[var(--ink)]">
                          {typeof selectedPost.metrics?.ctr === "number"
                            ? `${(selectedPost.metrics.ctr * 100).toFixed(1)}%`
                            : selectedPost.metrics?.ctr ?? "0.0%"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">Engagement Rate</p>
                        <p className="text-lg font-bold mt-0.5 text-purple-400">
                          {typeof selectedPost.metrics?.engagement_rate === "number"
                            ? `${(selectedPost.metrics.engagement_rate * 100).toFixed(1)}%`
                            : selectedPost.metrics?.engagement_rate ?? "0.0%"}
                        </p>
                      </div>
                    </div>

                    {selectedPost.body && (
                      <div className="p-3.5 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", color: "var(--ink-muted)" }}>
                        <p className="font-semibold text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)" }}>Post Content</p>
                        <p className="italic">"{selectedPost.body}"</p>
                      </div>
                    )}

                    <div className="flex justify-end pt-2" style={{ borderTop: "1px solid var(--line)" }}>
                      <button
                        onClick={() => setSelectedPost(null)}
                        className="btn-outline-soft px-4 py-2 text-xs font-semibold"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
