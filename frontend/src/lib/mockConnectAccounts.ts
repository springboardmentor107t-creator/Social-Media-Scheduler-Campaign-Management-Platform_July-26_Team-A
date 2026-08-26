/**
 * mockConnectAccounts.ts
 *
 * All platforms check backend `/social-accounts` status.
 * If a platform is connected in the database, its status and handle are populated.
 */
import { apiFetch } from "../services/api";

export interface PlatformAccount {
  platform: string;       // e.g. "facebook"
  displayName: string;    // e.g. "Facebook"
  handle?: string;        // e.g. "@socialpilot_co"
  status: "connected" | "pending" | "disconnected";
}

const DEFAULT_PLATFORMS: PlatformAccount[] = [
  { platform: "facebook",  displayName: "Facebook",  status: "disconnected" },
  { platform: "instagram", displayName: "Instagram", status: "disconnected" },
  { platform: "linkedin",  displayName: "LinkedIn",  status: "disconnected" },
  { platform: "twitter",   displayName: "X (Twitter)", status: "disconnected" },
  { platform: "youtube",   displayName: "YouTube",   status: "disconnected" },
  { platform: "pinterest", displayName: "Pinterest", status: "disconnected" },
];

/** Fetch the real statuses of the user's accounts from the backend */
export async function getConnectedAccounts(): Promise<PlatformAccount[]> {
  try {
    const activeAccounts = await apiFetch<Array<{ id: string; provider: string; account_name: string; is_active: boolean }>>("/social-accounts");
    
    const platforms = structuredClone(DEFAULT_PLATFORMS);
    
    // Update active accounts based on backend db
    for (const acc of activeAccounts) {
      const idx = platforms.findIndex(p => p.platform === acc.provider.toLowerCase());
      if (idx !== -1) {
        platforms[idx].status = "connected";
        platforms[idx].handle = acc.account_name;
      }
    }
    
    return platforms;
  } catch (err) {
    console.error("Failed to load real connected accounts:", err);
    return structuredClone(DEFAULT_PLATFORMS);
  }
}

/** Disconnect platform on the backend */
export async function disconnectAccount(platform: string): Promise<void> {
  const p = platform.toLowerCase();
  if (p === "linkedin") {
    await apiFetch("/linkedin/disconnect", { method: "DELETE" });
  } else if (p === "youtube") {
    await apiFetch("/youtube/disconnect", { method: "DELETE" });
  } else {
    // Simulated disconnect for platforms without OAuth implementation
    await new Promise((r) => setTimeout(r, 400));
    console.info(`[STUB] disconnected simulated platform: ${platform}`);
  }
}
