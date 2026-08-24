/**
 * mockData.ts — Central mock data layer for new UX/product-depth features.
 *
 * BACKEND DEPENDENCY MAP (replace each export when the real endpoint lands):
 *   MOCK_CALENDAR_POSTS   → GET /api/posts?view=calendar&month=YYYY-MM
 *   MOCK_NOTIFICATIONS    → GET /api/notifications + PATCH /api/notifications/:id/read
 *   MOCK_AUDIT_LOG        → GET /api/admin/audit-log
 *   ONBOARDING_ITEMS      → GET /api/onboarding/status (per-user completion)
 *
 * All functions include a fake network delay to surface loading states realistically.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Posts
// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarPost {
  id: string;
  caption: string;
  platform: "instagram" | "facebook" | "linkedin" | "twitter" | "youtube" | "pinterest";
  /** ISO date string: "2026-08-05" */
  scheduledDate: string;
  status: "scheduled" | "published" | "draft" | "failed";
}

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth(); // 0-based

function iso(day: number, offsetMonth = 0) {
  const d = new Date(y, m + offsetMonth, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const MOCK_CALENDAR_POSTS: CalendarPost[] = [
  { id: "cp1", caption: "Summer launch 🚀 — exclusive early-bird discount for followers who share this post!", platform: "instagram", scheduledDate: iso(2), status: "published" },
  { id: "cp2", caption: "We're hiring! Join our remote-first team and help build the future of social automation.", platform: "linkedin", scheduledDate: iso(3), status: "published" },
  { id: "cp3", caption: "Flash sale ends midnight — use code PILOT20 for 20% off all plans today only.", platform: "twitter", scheduledDate: iso(5), status: "scheduled" },
  { id: "cp4", caption: "Behind-the-scenes: how our team plans 30 days of content in a single afternoon.", platform: "instagram", scheduledDate: iso(5), status: "scheduled" },
  { id: "cp5", caption: "New blog post: 10 proven tactics to double your LinkedIn engagement rate in 60 days.", platform: "linkedin", scheduledDate: iso(8), status: "scheduled" },
  { id: "cp6", caption: "Customer spotlight: how @brandname grew their reach by 3× using SocialPilot in Q2.", platform: "facebook", scheduledDate: iso(10), status: "scheduled" },
  { id: "cp7", caption: "YouTube tutorial drop: building a full content calendar from scratch — link in bio!", platform: "youtube", scheduledDate: iso(12), status: "scheduled" },
  { id: "cp8", caption: "Throwback to our first product screenshot 😅 — come a long way since then!", platform: "twitter", scheduledDate: iso(14), status: "draft" },
  { id: "cp9", caption: "Pinterest board update: 50 design inspiration pins for your next campaign creative.", platform: "pinterest", scheduledDate: iso(16), status: "scheduled" },
  { id: "cp10", caption: "Monthly analytics wrap-up thread — reach, impressions, top posts & lessons learned.", platform: "twitter", scheduledDate: iso(19), status: "scheduled" },
  { id: "cp11", caption: "Webinar replay now live: Advanced scheduling strategies for enterprise teams.", platform: "linkedin", scheduledDate: iso(21), status: "draft" },
  { id: "cp12", caption: "Community shoutout Friday 🙌 — tag a creator who inspired you this week.", platform: "instagram", scheduledDate: iso(23), status: "scheduled" },
  { id: "cp13", caption: "Big product announcement — something major is dropping next week. Stay tuned.", platform: "facebook", scheduledDate: iso(26), status: "scheduled" },
  { id: "cp14", caption: "End-of-month performance report: August numbers are in and they're 🔥", platform: "linkedin", scheduledDate: iso(28), status: "draft" },
  { id: "cp15", caption: "Fail post — the Flash Sale thread that got zero impressions. Here's what we learned.", platform: "twitter", scheduledDate: iso(7), status: "failed" },
];

export async function getCalendarPosts(): Promise<CalendarPost[]> {
  await new Promise((r) => setTimeout(r, 500));
  return structuredClone(MOCK_CALENDAR_POSTS);
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export type NotifType =
  | "scheduled_reminder"
  | "publish_success"
  | "publish_failure"
  | "campaign_alert"
  | "team_role_change"
  | "team_invite_accepted"
  | "team_invite_sent";

export interface Notification {
  id: string;
  type: NotifType;
  message: string;
  /** ISO datetime string */
  createdAt: string;
  read: boolean;
}

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "publish_success",    message: "\"Summer Launch 🚀\" published successfully to Instagram.", createdAt: ago(5),    read: false },
  { id: "n2", type: "scheduled_reminder", message: "Reminder: \"Flash Sale Thread\" is scheduled to post in 30 minutes.", createdAt: ago(28),   read: false },
  { id: "n3", type: "publish_failure",    message: "\"Flash Sale Announcement\" failed to publish to Facebook. Check your connection.", createdAt: ago(120), read: false },
  { id: "n4", type: "team_invite_accepted", message: "Mia Chen accepted your team invitation and joined as Content Creator.", createdAt: ago(200), read: false },
  { id: "n5", type: "campaign_alert",     message: "Campaign \"Q3 Growth\" is running low on budget — 90% spent.", createdAt: ago(360), read: true  },
  { id: "n6", type: "team_role_change",   message: "Your role was updated to Marketing Team by admin@company.com.", createdAt: ago(720), read: true  },
  { id: "n7", type: "publish_success",    message: "\"Case Study: Scaling Teams\" published successfully to LinkedIn.", createdAt: ago(1440), read: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export type AuditActionType =
  | "role_changed"
  | "member_removed"
  | "account_deactivated"
  | "account_activated"
  | "post_deleted"
  | "campaign_approved"
  | "api_key_rotated"
  | "invite_sent"
  | "login_failed";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actionType: AuditActionType;
  target: string;
  before?: string;
  after?: string;
}

export const MOCK_AUDIT_LOG: AuditEntry[] = [
  { id: "al1",  timestamp: ago(5),    actor: "admin@company.com",   actionType: "role_changed",       target: "james_park",    before: "Content Creator",  after: "Administrator"  },
  { id: "al2",  timestamp: ago(18),   actor: "admin@company.com",   actionType: "invite_sent",        target: "mia.chen@co.io" },
  { id: "al3",  timestamp: ago(55),   actor: "system",              actionType: "login_failed",       target: "unknown@hack.io", before: "5 attempts" },
  { id: "al4",  timestamp: ago(120),  actor: "admin@company.com",   actionType: "account_deactivated",target: "bob_jones" },
  { id: "al5",  timestamp: ago(200),  actor: "admin@company.com",   actionType: "role_changed",       target: "sara_okafor",   before: "Content Creator",  after: "Marketing Team" },
  { id: "al6",  timestamp: ago(350),  actor: "manager@company.com", actionType: "campaign_approved",  target: "campaign-88" },
  { id: "al7",  timestamp: ago(720),  actor: "admin@company.com",   actionType: "api_key_rotated",    target: "Instagram API" },
  { id: "al8",  timestamp: ago(1440), actor: "creator1",            actionType: "post_deleted",       target: "post-189" },
  { id: "al9",  timestamp: ago(2160), actor: "admin@company.com",   actionType: "member_removed",     target: "old_user_12" },
  { id: "al10", timestamp: ago(4320), actor: "admin@company.com",   actionType: "account_activated",  target: "sara_okafor" },
];

export async function getAuditLog(): Promise<AuditEntry[]> {
  await new Promise((r) => setTimeout(r, 600));
  return structuredClone(MOCK_AUDIT_LOG);
}

// ─────────────────────────────────────────────────────────────────────────────
// Best Time to Post — static lookup table
// ─────────────────────────────────────────────────────────────────────────────

export interface BestTimeEntry {
  window: string;        // e.g. "Weekdays 6–8 PM"
  timeValue: string;     // e.g. "18:00" — used to pre-fill time pickers
  rationale: string;
}

export const BEST_TIMES: Record<string, BestTimeEntry> = {
  instagram: { window: "Weekdays 6–8 PM",     timeValue: "18:00", rationale: "Highest scroll activity after work hours." },
  facebook:  { window: "Wed–Fri 1–4 PM",      timeValue: "13:00", rationale: "Mid-week afternoon drives link clicks." },
  linkedin:  { window: "Tue–Thu 9–11 AM",     timeValue: "09:00", rationale: "Professional audience checks feeds before noon." },
  twitter:   { window: "Weekdays 12–1 PM",    timeValue: "12:00", rationale: "Lunch-hour browsing peaks for X." },
  youtube:   { window: "Sat–Sun 9–11 AM",     timeValue: "09:00", rationale: "Weekend morning has highest view-through rates." },
  pinterest: { window: "Fri–Sat 8–11 PM",     timeValue: "20:00", rationale: "Evening weekend browsing peaks for Pinterest." },
};
