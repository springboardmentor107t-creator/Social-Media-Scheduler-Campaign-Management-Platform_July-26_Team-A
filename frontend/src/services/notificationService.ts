/**
 * notificationService.ts — Fetches notifications from the real backend API.
 *
 * Endpoints:
 *   GET   /api/notifications           — List notifications for the current user
 *   PATCH /api/notifications/:id/read  — Mark a single notification as read
 *   POST  /api/notifications/read-all  — Mark all notifications as read
 */

import { apiFetch } from "./api";

export interface ApiNotification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  read: boolean;
  created_by?: string;
}

/**
 * Fetch notifications from backend. Falls back to empty array on error.
 */
export async function fetchNotifications(): Promise<ApiNotification[]> {
  try {
    return await apiFetch<ApiNotification[]>("/api/notifications");
  } catch {
    return [];
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await apiFetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
  } catch {
    // Silently fail — UI already updated optimistically
  }
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiFetch("/api/notifications/read-all", { method: "POST" });
  } catch {
    // Silently fail
  }
}

/**
 * Create a new notification (broadcast or targeted).
 */
export async function createNotification(
  type: string,
  message: string,
  targetUserId?: string
): Promise<ApiNotification | null> {
  try {
    return await apiFetch<ApiNotification>("/api/notifications", {
      method: "POST",
      body: JSON.stringify({
        type,
        message,
        target_user_id: targetUserId || null,
      }),
    });
  } catch {
    return null;
  }
}

