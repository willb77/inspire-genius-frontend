/**
 * Site-wide severity banner for the highest-priority unread broadcast.
 *
 * Mounted in AppShell next to the EcosystemStatusBanner so every role sees it.
 * Shows the single most-severe unread alert; dismissing hides it locally
 * (marks the notification read) so it doesn't nag. Warning/critical only —
 * info/success live in the bell + toast to avoid banner fatigue.
 */
import { useState } from "react"
import { X } from "lucide-react"

import { SEVERITY_META } from "@/lib/broadcastTemplate"
import { useMarkNotificationRead, useNotifications } from "@/hooks/useNotificationInbox"
import type { NotificationItem, Severity } from "@/types/broadcast"

const BANNER_SEVERITIES: Severity[] = ["critical", "warning"]
const RANK: Record<Severity, number> = { critical: 3, warning: 2, success: 1, info: 0 }

export function BroadcastAlertBanner() {
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkNotificationRead()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const candidate: NotificationItem | undefined = notifications
    .filter((n) => !n.read_at && BANNER_SEVERITIES.includes(n.severity) && !dismissedIds.has(n.id))
    .sort((a, b) => RANK[b.severity] - RANK[a.severity])[0]

  if (!candidate) return null

  const meta = SEVERITY_META[candidate.severity]

  function dismiss() {
    if (!candidate) return
    setDismissedIds((s) => new Set(s).add(candidate.id))
    markRead.mutate(candidate.id)
  }

  return (
    <div
      role="status"
      className="fixed left-0 right-0 top-[var(--spacing-header-h)] z-40 flex items-center gap-3 px-4 py-2 text-sm"
      style={{ backgroundColor: meta.tint, color: meta.text, borderBottom: `1px solid ${meta.color}` }}
    >
      <span aria-hidden>{meta.emoji}</span>
      <span className="min-w-0 flex-1 truncate">
        <strong className="font-semibold">{meta.label}:</strong> {candidate.title}
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss alert"
        className="shrink-0 rounded p-1 hover:bg-black/5"
        style={{ color: meta.text }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
