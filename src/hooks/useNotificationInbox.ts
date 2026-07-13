/**
 * React Query hooks for the recipient notification inbox.
 *
 * Polls unread state on a 45s interval (mirrors `useSystemStatus`) so a user
 * sees a broadcast shortly after login / arrival without a WebSocket. Drives
 * the header bell, the notification center dropdown, the severity banner, and
 * an on-arrival toast.
 */
import { useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  dismissNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications/inbox.service"
import { useAuth } from "@/context/useAuth"
import { SEVERITY_META } from "@/lib/broadcastTemplate"
import type { NotificationItem } from "@/types/broadcast"

const UNREAD_COUNT_KEY = ["notifications", "unread-count"]
const LIST_KEY = ["notifications", "list"]
const POLL_MS = 45_000

export function useUnreadCount() {
  const { user } = useAuth()
  const isAuthenticated = !!user
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  })
}

export function useNotifications(enabled = true) {
  const { user } = useAuth()
  const isAuthenticated = !!user
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => listNotifications(false, 50),
    enabled: isAuthenticated && enabled,
    refetchInterval: POLL_MS,
    staleTime: 10_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
    },
  })
}

export function useDismissNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dismissNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
    },
  })
}

/**
 * Fire a Sonner toast when a new unread notification arrives. Mount ONCE
 * (in AppShell) so toasts don't multiply. Skips the very first load so a
 * user isn't spammed with a toast for every pre-existing unread item.
 */
export function useNotificationToasts() {
  const { data: notifications } = useNotifications()
  const seenIds = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!notifications) return
    const unread = notifications.filter((n) => !n.read_at)

    // First observation: seed the seen-set, don't toast historical items.
    if (seenIds.current === null) {
      seenIds.current = new Set(notifications.map((n) => n.id))
      return
    }

    for (const n of unread) {
      if (!seenIds.current.has(n.id)) {
        toastForNotification(n)
      }
    }
    // Remember everything currently observed.
    seenIds.current = new Set(notifications.map((n) => n.id))
  }, [notifications])
}

function toastForNotification(n: NotificationItem) {
  const meta = SEVERITY_META[n.severity]
  const opts = { description: `${meta.emoji} ${meta.label} alert`, duration: n.severity === "critical" ? 12_000 : 6_000 }
  if (n.severity === "critical") toast.error(n.title, opts)
  else if (n.severity === "warning") toast.warning(n.title, opts)
  else if (n.severity === "success") toast.success(n.title, opts)
  else toast.info(n.title, opts)
}
