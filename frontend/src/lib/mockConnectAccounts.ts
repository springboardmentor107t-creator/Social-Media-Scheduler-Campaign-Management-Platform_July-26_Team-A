/**
 * mockConnectAccounts.ts
 *
 * STUB — All platforms use mock data.
 * No backend OAuth endpoints exist yet (/oauth/* routes are absent from all backend
 * route files). Replace getConnectedAccounts() with a real apiFetch call to
 * GET /oauth/accounts/status when backend OAuth is implemented.
 */

export interface PlatformAccount {
  platform: string;       // e.g. "facebook"
  displayName: string;    // e.g. "Facebook"
  handle?: string;        // e.g. "@socialpilot_co"
  status: "connected" | "pending" | "disconnected";
}

const MOCK_DATA: PlatformAccount[] = [
  { platform: "facebook",  displayName: "Facebook",  handle: "@socialpilot_co", status: "connected" },
  { platform: "instagram", displayName: "Instagram", handle: "@socialpilot",     status: "pending" },
  { platform: "linkedin",  displayName: "LinkedIn",  status: "disconnected" },
  { platform: "twitter",   displayName: "X (Twitter)", handle: "@socialpilot_x", status: "connected" },
  { platform: "youtube",   displayName: "YouTube",   status: "disconnected" },
  { platform: "pinterest", displayName: "Pinterest", status: "disconnected" },
];

/** Fake 600 ms network delay for realistic UX testing. */
export async function getConnectedAccounts(): Promise<PlatformAccount[]> {
  await new Promise((r) => setTimeout(r, 600));
  // STUB: return structuredClone so callers can mutate freely
  return structuredClone(MOCK_DATA);
}

/** Stub disconnect — always succeeds after 400 ms. */
export async function disconnectAccount(platform: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  console.info(`[STUB] disconnected ${platform}`);
}
