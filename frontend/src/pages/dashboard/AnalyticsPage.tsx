import { useState, useEffect } from "react";
import DashboardShell from "../../components/DashboardShell";
import {
  EngagementData,
  AudienceData,
  CampaignReportSummary,
  RoiData,
  CampaignComparisonData,
  fetchEngagementAnalytics,
  fetchAudienceData,
  fetchCampaignReports,
  fetchRoiAnalytics,
  fetchCampaignComparison
} from "../../services/analyticsService";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"engagement" | "audience" | "reports" | "roi">("engagement");
  const [timeframe, setTimeframe] = useState("30d");

  // Data states
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [audience, setAudience] = useState<AudienceData | null>(null);
  const [reports, setReports] = useState<CampaignReportSummary | null>(null);
  const [roi, setRoi] = useState<RoiData | null>(null);
  const [comparison, setComparison] = useState<CampaignComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const [engData, audData, repData, roiData, compData] = await Promise.all([
      fetchEngagementAnalytics(timeframe),
      fetchAudienceData(timeframe),
      fetchCampaignReports(),
      fetchRoiAnalytics(),
      fetchCampaignComparison()
    ]);

    setEngagement(engData);
    setAudience(audData);
    setReports(repData);
    setRoi(roiData);
    setComparison(compData);
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
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
        <div className="flex justify-between text-[11px] text-muted-light dark:text-muted-dark px-6 mt-1 font-mono">
          {dataPoints.map(dp => <span key={dp.date}>{dp.date}</span>)}
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
          </nav>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-medium text-muted-light dark:text-muted-dark">Timeframe:</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="input-field text-xs py-1.5 px-3 max-w-[110px]"
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

                {/* Engagement Interactive Chart */}
                <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold">Engagement Trend Over Time</h3>
                      <p className="text-xs text-muted-light dark:text-muted-dark">Daily interaction volume (Likes + Comments + Shares)</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal" /> Engagement</span>
                    </div>
                  </div>

                  {renderLineChart(
                    engagement.timeline.map(t => ({ date: t.date, value: t.likes + t.comments + t.shares })),
                    "var(--teal)"
                  )}
                </div>

                {/* Platform Engagement Breakdown */}
                <div className="p-6 rounded-2xl bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark shadow-sm space-y-4">
                  <h3 className="text-base font-bold">Platform Engagement Breakdown</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {engagement.platform_breakdown.map(p => (
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
          </>
        )}
      </div>
    </DashboardShell>
  );
}
