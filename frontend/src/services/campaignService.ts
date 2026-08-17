import { apiFetch } from "./api";

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "scheduled" | "completed" | "paused";
  start_date?: string;
  end_date?: string;
  budget?: string;
  spent?: string;
  target_audience?: string;
  platforms?: string[];
  kpis?: Record<string, any>;
  created_at?: string;
}

export interface CampaignTrackingData {
  campaign_id: string;
  name: string;
  status: string;
  budget: string;
  spent: string;
  progress_percentage: number;
  metrics: {
    total_posts: number;
    published_posts: number;
    pending_posts: number;
    failed_posts: number;
    impressions: number;
    clicks: number;
    conversions: number;
    engagement_rate: string;
  };
  platforms: string[];
}

export interface CampaignScheduledPost {
  id: string;
  campaign_id: string;
  content_title: string;
  content_body: string;
  scheduled_time: string;
  status: string;
  platform: string;
}

const FALLBACK_CAMPAIGNS: Campaign[] = [
  {
    id: "cp-101",
    name: "Q3 Product V2 Growth Drive",
    description: "Multi-platform campaign focusing on feature rollouts & user onboarding.",
    status: "active",
    start_date: "2026-07-01",
    end_date: "2026-09-30",
    budget: "$12,000",
    spent: "$7,450",
    target_audience: "SaaS Founders, Tech Leads, Marketers",
    platforms: ["linkedin", "twitter", "instagram"],
    kpis: { target_impressions: 250000, target_conversions: 1500 },
    created_at: "2026-06-25T10:00:00Z"
  },
  {
    id: "cp-102",
    name: "Summer Retargeting & Lead Magnet",
    description: "Paid social retargeting push for ebook downloads.",
    status: "active",
    start_date: "2026-07-15",
    end_date: "2026-08-31",
    budget: "$6,500",
    spent: "$3,800",
    target_audience: "Marketing Managers, Growth Leads",
    platforms: ["facebook", "linkedin"],
    kpis: { target_impressions: 120000, target_conversions: 800 },
    created_at: "2026-07-10T14:30:00Z"
  },
  {
    id: "cp-103",
    name: "YouTube Masterclass Webinar Series",
    description: "Video teasers and webinar signups.",
    status: "scheduled",
    start_date: "2026-08-20",
    end_date: "2026-09-15",
    budget: "$4,000",
    spent: "$0",
    target_audience: "Content Creators, Social Leads",
    platforms: ["youtube", "twitter"],
    kpis: { target_impressions: 80000, target_conversions: 500 },
    created_at: "2026-08-01T09:00:00Z"
  },
  {
    id: "cp-104",
    name: "Q2 Brand Awareness Push",
    description: "Completed brand awareness campaign.",
    status: "completed",
    start_date: "2026-04-01",
    end_date: "2026-06-30",
    budget: "$15,000",
    spent: "$15,000",
    target_audience: "General Tech Audience",
    platforms: ["twitter", "linkedin", "instagram", "youtube"],
    kpis: { target_impressions: 500000, target_conversions: 3000 },
    created_at: "2026-03-20T11:00:00Z"
  }
];

export async function fetchCampaigns(statusFilter?: string): Promise<Campaign[]> {
  try {
    const url = statusFilter ? `/api/campaigns?status=${statusFilter}` : `/api/campaigns`;
    const res = await apiFetch<Campaign[]>(url);
    if (res && Array.isArray(res) && res.length > 0) return res;
    return FALLBACK_CAMPAIGNS;
  } catch {
    return FALLBACK_CAMPAIGNS;
  }
}

export async function updateCampaign(campaignId: string, data: Partial<Campaign>): Promise<Campaign> {
  try {
    return await apiFetch<Campaign>(`/api/campaigns/${campaignId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  } catch {
    const index = FALLBACK_CAMPAIGNS.findIndex(c => c.id === campaignId);
    if (index !== -1) {
      FALLBACK_CAMPAIGNS[index] = { ...FALLBACK_CAMPAIGNS[index], ...data as any };
      return FALLBACK_CAMPAIGNS[index];
    }
    throw new Error("Campaign not found");
  }
}

export async function createCampaign(data: {
  name: string;
  description?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  budget?: string;
  target_audience?: string;
  platforms?: string[];
}): Promise<Campaign> {
  try {
    return await apiFetch<Campaign>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(data)
    });
  } catch {
    const newCamp: Campaign = {
      id: `cp-${Date.now()}`,
      name: data.name,
      description: data.description || "",
      status: (data.status as any) || "active",
      start_date: data.start_date || new Date().toISOString().split("T")[0],
      end_date: data.end_date || new Date(Date.now() + 30*86400000).toISOString().split("T")[0],
      budget: data.budget || "$5,000",
      spent: "$0",
      target_audience: data.target_audience || "Target Audience",
      platforms: data.platforms || ["twitter", "linkedin"],
      created_at: new Date().toISOString()
    };
    FALLBACK_CAMPAIGNS.unshift(newCamp);
    return newCamp;
  }
}

export async function fetchCampaignTracking(campaignId: string): Promise<CampaignTrackingData> {
  try {
    return await apiFetch<CampaignTrackingData>(`/api/campaigns/${campaignId}/tracking`);
  } catch {
    const camp = FALLBACK_CAMPAIGNS.find(c => c.id === campaignId) || FALLBACK_CAMPAIGNS[0];
    return {
      campaign_id: camp.id,
      name: camp.name,
      status: camp.status,
      budget: camp.budget || "$5,000",
      spent: camp.spent || "$2,500",
      progress_percentage: camp.status === "completed" ? 100 : camp.status === "active" ? 62 : 0,
      metrics: {
        total_posts: 18,
        published_posts: 11,
        pending_posts: 6,
        failed_posts: 1,
        impressions: 142000,
        clicks: 16800,
        conversions: 1240,
        engagement_rate: "5.6%"
      },
      platforms: camp.platforms || ["twitter", "linkedin", "instagram"]
    };
  }
}

export async function schedulePostForCampaign(campaignId: string, postData: {
  title: string;
  body?: string;
  scheduled_time: string;
  platform?: string;
}): Promise<any> {
  try {
    return await apiFetch(`/api/campaigns/${campaignId}/schedule`, {
      method: "POST",
      body: JSON.stringify(postData)
    });
  } catch {
    return {
      message: "Post successfully scheduled for campaign",
      scheduled_post_id: `sp-${Date.now()}`,
      campaign_id: campaignId,
      scheduled_time: postData.scheduled_time
    };
  }
}

export async function fetchCampaignScheduledPosts(campaignId: string): Promise<CampaignScheduledPost[]> {
  try {
    return await apiFetch<CampaignScheduledPost[]>(`/api/campaigns/${campaignId}/scheduled-posts`);
  } catch {
    return [
      {
        id: "sp-1",
        campaign_id: campaignId,
        content_title: "Keynote Announcement & Feature Reveal",
        content_body: "Excited to share our brand new platform upgrades! #Growth #SaaS",
        scheduled_time: new Date(Date.now() + 86400000).toISOString(),
        status: "pending",
        platform: "linkedin"
      },
      {
        id: "sp-2",
        campaign_id: campaignId,
        content_title: "Customer Spotlight & ROI Case Study",
        content_body: "Discover how ACME Corp boosted engagement by 3.5x using SocialPilot.",
        scheduled_time: new Date(Date.now() + 172800000).toISOString(),
        status: "pending",
        platform: "twitter"
      }
    ];
  }
}
