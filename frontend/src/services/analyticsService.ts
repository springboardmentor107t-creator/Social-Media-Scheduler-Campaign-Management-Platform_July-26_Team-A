import { apiFetch } from "./api";

export interface EngagementData {
  timeframe: string;
  platform: string;
  is_mock?: boolean;
  summary: {
    total_engagement: number;
    avg_engagement_rate: string;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    total_clicks: number;
  };
  platform_breakdown: Array<{
    platform: string;
    engagement: number;
    rate: string;
    share: string;
  }>;
  timeline: Array<{
    date: string;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    engagement_rate: string;
  }>;
}

export interface AudienceData {
  is_mock?: boolean;
  summary: {
    total_followers: number;
    net_gained_period: number;
    growth_rate: string;
    total_reach: number;
    total_impressions: number;
  };
  demographics: {
    age_groups: Array<{ label: string; percentage: number }>;
    top_locations: Array<{ country: string; percentage: number }>;
  };
  growth_trend: Array<{
    date: string;
    total_followers: number;
    net_gained: number;
    impressions: number;
    reach: number;
  }>;
}

export interface CampaignReportSummary {
  is_mock?: boolean;
  overview: {
    total_campaigns: number;
    active_campaigns: number;
    total_budget: string;
    total_spent: string;
    avg_roi: string;
    total_conversions: number;
  };
  campaign_reports: Array<{
    campaign_id: string;
    name: string;
    status: string;
    budget: string;
    spent: string;
    impressions: number;
    clicks: number;
    conversions: number;
    roi: string;
    platforms: string[];
  }>;
}

export interface RoiData {
  roi_summary: {
    total_investment: string;
    revenue_generated: string;
    net_profit: string;
    overall_roi: string;
    roi_multiplier: string;
    cost_per_lead: string;
    cost_per_acquisition: string;
  };
  monthly_roi_trend: Array<{
    month: string;
    spend: number;
    revenue: number;
    roi_pct: string;
  }>;
}

export interface CampaignComparisonData {
  compared_campaigns: Array<{
    id: string;
    name: string;
    status: string;
    budget: string;
    spent: string;
    impressions: number;
    clicks: number;
    ctr: string;
    conversions: number;
    cpa: string;
    revenue: string;
    roi: string;
  }>;
  winning_metrics: {
    highest_roi: string;
    lowest_cpa: string;
    highest_conversions: string;
  };
}

export async function fetchEngagementAnalytics(timeframe = "30d", platform = "all"): Promise<EngagementData> {
  try {
    return await apiFetch<EngagementData>(`/api/analytics/engagement?timeframe=${timeframe}&platform=${platform}`);
  } catch {
    return {
      timeframe,
      platform,
      summary: {
        total_engagement: 48250,
        avg_engagement_rate: "5.4%",
        total_likes: 28400,
        total_comments: 4120,
        total_shares: 5800,
        total_clicks: 9930
      },
      platform_breakdown: [
        { platform: "LinkedIn", engagement: 18500, rate: "6.2%", share: "38%" },
        { platform: "Twitter", engagement: 14200, rate: "4.8%", share: "29%" },
        { platform: "Instagram", engagement: 11800, rate: "5.9%", share: "24%" },
        { platform: "YouTube", engagement: 3750, rate: "7.1%", share: "9%" }
      ],
      timeline: [
        { date: "Jul 1", likes: 620, comments: 85, shares: 110, clicks: 420, engagement_rate: "4.8%" },
        { date: "Jul 5", likes: 840, comments: 120, shares: 150, clicks: 580, engagement_rate: "5.2%" },
        { date: "Jul 10", likes: 1120, comments: 190, shares: 210, clicks: 890, engagement_rate: "5.9%" },
        { date: "Jul 15", likes: 1450, comments: 240, shares: 280, clicks: 1100, engagement_rate: "6.1%" },
        { date: "Jul 20", likes: 1300, comments: 210, shares: 240, clicks: 960, engagement_rate: "5.7%" },
        { date: "Jul 25", likes: 1680, comments: 310, shares: 360, clicks: 1350, engagement_rate: "6.5%" },
        { date: "Jul 30", likes: 1920, comments: 380, shares: 420, clicks: 1540, engagement_rate: "6.8%" }
      ]
    };
  }
}

export async function fetchAudienceData(timeframe = "30d"): Promise<AudienceData> {
  try {
    return await apiFetch<AudienceData>(`/api/analytics/audience?timeframe=${timeframe}`);
  } catch {
    return {
      summary: {
        total_followers: 24500,
        net_gained_period: 2450,
        growth_rate: "+11.4%",
        total_reach: 348000,
        total_impressions: 582000
      },
      demographics: {
        age_groups: [
          { label: "18-24", percentage: 18 },
          { label: "25-34", percentage: 46 },
          { label: "35-44", percentage: 24 },
          { label: "45+", percentage: 12 }
        ],
        top_locations: [
          { country: "United States", percentage: 42 },
          { country: "India", percentage: 22 },
          { country: "United Kingdom", percentage: 14 },
          { country: "Germany", percentage: 9 },
          { country: "Canada", percentage: 7 }
        ]
      },
      growth_trend: [
        { date: "Jul 1", total_followers: 22050, net_gained: 120, impressions: 24000, reach: 15000 },
        { date: "Jul 8", total_followers: 22680, net_gained: 630, impressions: 85000, reach: 52000 },
        { date: "Jul 15", total_followers: 23350, net_gained: 670, impressions: 142000, reach: 89000 },
        { date: "Jul 22", total_followers: 23900, net_gained: 550, impressions: 198000, reach: 124000 },
        { date: "Jul 30", total_followers: 24500, net_gained: 600, impressions: 250000, reach: 168000 }
      ]
    };
  }
}

export async function fetchCampaignReports(): Promise<CampaignReportSummary> {
  try {
    return await apiFetch<CampaignReportSummary>("/api/reports/campaigns");
  } catch {
    return {
      overview: {
        total_campaigns: 4,
        active_campaigns: 2,
        total_budget: "$37,500",
        total_spent: "$26,250",
        avg_roi: "3.2x",
        total_conversions: 5170
      },
      campaign_reports: [
        {
          campaign_id: "cp-101",
          name: "Q3 Product V2 Growth Drive",
          status: "active",
          budget: "$12,000",
          spent: "$7,450",
          impressions: 248000,
          clicks: 29400,
          conversions: 2150,
          roi: "3.8x",
          platforms: ["linkedin", "twitter", "instagram"]
        },
        {
          campaign_id: "cp-102",
          name: "Summer Retargeting & Lead Magnet",
          status: "active",
          budget: "$6,500",
          spent: "$3,800",
          impressions: 114000,
          clicks: 14200,
          conversions: 980,
          roi: "3.1x",
          platforms: ["facebook", "linkedin"]
        },
        {
          campaign_id: "cp-103",
          name: "YouTube Masterclass Webinar Series",
          status: "scheduled",
          budget: "$4,000",
          spent: "$0",
          impressions: 0,
          clicks: 0,
          conversions: 0,
          roi: "0.0x",
          platforms: ["youtube", "twitter"]
        },
        {
          campaign_id: "cp-104",
          name: "Q2 Brand Awareness Push",
          status: "completed",
          budget: "$15,000",
          spent: "$15,000",
          impressions: 512000,
          clicks: 48900,
          conversions: 2040,
          roi: "2.7x",
          platforms: ["twitter", "linkedin", "instagram", "youtube"]
        }
      ]
    };
  }
}

export async function fetchRoiAnalytics(): Promise<RoiData> {
  try {
    return await apiFetch<RoiData>("/api/analytics/roi");
  } catch {
    return {
      roi_summary: {
        total_investment: "$26,250",
        revenue_generated: "$84,000",
        net_profit: "$57,750",
        overall_roi: "320%",
        roi_multiplier: "3.2x",
        cost_per_lead: "$10.80",
        cost_per_acquisition: "$32.40"
      },
      monthly_roi_trend: [
        { month: "May", spend: 4500, revenue: 12600, roi_pct: "280%" },
        { month: "Jun", spend: 6200, revenue: 19800, roi_pct: "319%" },
        { month: "Jul", spend: 7500, revenue: 24750, roi_pct: "330%" },
        { month: "Aug", spend: 8050, revenue: 26850, roi_pct: "333%" }
      ]
    };
  }
}

export async function fetchCampaignComparison(): Promise<CampaignComparisonData> {
  try {
    return await apiFetch<CampaignComparisonData>("/api/analytics/comparison");
  } catch {
    return {
      compared_campaigns: [
        {
          id: "cp-101",
          name: "Q3 Product V2 Growth Drive",
          status: "Active",
          budget: "$12,000",
          spent: "$7,450",
          impressions: 248000,
          clicks: 29400,
          ctr: "11.85%",
          conversions: 2150,
          cpa: "$3.46",
          revenue: "$28,310",
          roi: "3.8x"
        },
        {
          id: "cp-102",
          name: "Summer Retargeting Push",
          status: "Active",
          budget: "$6,500",
          spent: "$3,800",
          impressions: 114000,
          clicks: 14200,
          ctr: "12.45%",
          conversions: 980,
          cpa: "$3.87",
          revenue: "$11,780",
          roi: "3.1x"
        },
        {
          id: "cp-104",
          name: "Q2 Brand Awareness Push",
          status: "Completed",
          budget: "$15,000",
          spent: "$15,000",
          impressions: 512000,
          clicks: 48900,
          ctr: "9.55%",
          conversions: 2040,
          cpa: "$7.35",
          revenue: "$40,500",
          roi: "2.7x"
        }
      ],
      winning_metrics: {
        highest_roi: "Q3 Product V2 Growth Drive (3.8x)",
        lowest_cpa: "Q3 Product V2 Growth Drive ($3.46)",
        highest_conversions: "Q3 Product V2 Growth Drive (2,150)"
      }
    };
  }
}

export interface PostAnalyticsData {
  post_id: string;
  content_id: string;
  title: string;
  body: string;
  platform: string;
  account_name: string;
  published_at: string;
  status: string;
  metrics: {
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    reach: number;
    views: number;
    ctr: number;
    engagement_rate: number;
  };
}

export async function fetchPostAnalytics(): Promise<PostAnalyticsData[]> {
  try {
    return await apiFetch<PostAnalyticsData[]>("/api/analytics/posts");
  } catch {
    // Fallback/mock data for offline/development environments
    return [
      {
        post_id: "sp-101",
        content_id: "c-101",
        title: "Summer Campaign Launch Promo",
        body: "Get ready for the hottest deals of the summer! Launching soon. #SummerSale",
        platform: "Instagram",
        account_name: "Brand IG",
        published_at: "2026-08-25T14:30:00Z",
        status: "published",
        metrics: {
          impressions: 4800,
          likes: 215,
          comments: 28,
          shares: 12,
          clicks: 140,
          reach: 3900,
          views: 4800,
          ctr: 0.029,
          engagement_rate: 0.053
        }
      },
      {
        post_id: "sp-102",
        content_id: "c-102",
        title: "New Product Feature Reveal",
        body: "Introducing our new analytics engine! Gain deeper insights with one click. #FeatureRelease",
        platform: "Linkedin",
        account_name: "Brand LinkedIn Page",
        published_at: "2026-08-24T18:00:00Z",
        status: "published",
        metrics: {
          impressions: 6200,
          likes: 340,
          comments: 42,
          shares: 31,
          clicks: 195,
          reach: 5100,
          views: 6200,
          ctr: 0.031,
          engagement_rate: 0.067
        }
      },
      {
        post_id: "sp-103",
        content_id: "c-103",
        title: "Weekly SEO Tips thread",
        body: "1/5 How to optimize your meta tags for 2026. A quick guide for creators. 👇",
        platform: "Twitter",
        account_name: "Brand X Account",
        published_at: "2026-08-25T09:00:00Z",
        status: "published",
        metrics: {
          impressions: 3100,
          likes: 125,
          comments: 14,
          shares: 18,
          clicks: 80,
          reach: 2800,
          views: 3100,
          ctr: 0.026,
          engagement_rate: 0.051
        }
      }
    ];
  }
}

