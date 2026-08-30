/**
 * Notification inbox service — raw Axios calls to the broadcast-service
 * recipient endpoints (/v1/notifications/*). Any authenticated user reads and
 * manages ONLY their own notifications (server matches by JWT email).
 */
import { api } from "@/lib/axios"
import type { NotificationItem } from "@/types/broadcast"

export async function listNotifications(unread = false, limit = 50): Promise<NotificationItem[]> {
  const { data } = await api.get<NotificationItem[]>("/v1/notifications", {
    params: { unread: unread ? 1 : 0, limit },
  })
  return data
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ unread: number }>("/v1/notifications/unread-count")
  return data.unread
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/v1/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await api.post<{ ok: boolean; updated: number }>("/v1/notifications/read-all")
  return data.updated
}

export async function dismissNotification(id: string): Promise<void> {
  await api.patch(`/v1/notifications/${id}/dismiss`)
}
