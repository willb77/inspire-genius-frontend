/**
 * Header notification bell + dropdown notification center.
 *
 * Replaces the previously-static bell in AppHeader. The red dot is driven by
 * the unread-count query (45s poll); the dropdown lists recent notifications
 * with severity accents and a "mark all read" action. Clicking an item marks
 * it read and opens its full branded body in a dialog.
 */
import { useState } from "react"
import { Bell, CheckCheck } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { SEVERITY_META } from "@/lib/broadcastTemplate"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/useNotificationInbox"
import type { NotificationItem } from "@/types/broadcast"

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<NotificationItem | null>(null)
  const { data: unread = 0 } = useUnreadCount()
  const { data: notifications = [], isLoading } = useNotifications(open)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  function openItem(n: NotificationItem) {
    setActive(n)
    if (!n.read_at) markRead.mutate(n.id)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[#f3f4f6] md:h-9 md:w-9"
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
          >
            <Bell className="h-[18px] w-[18px] text-[#4b5563]" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-[#EF4444] px-1 text-[10px] font-bold leading-none text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-3 py-2">
            <span className="text-sm font-semibold text-[#111827]">Notifications</span>
            {notifications.some((n) => !n.read_at) && (
              <button
                onClick={() => markAll.mutate()}
                className="flex items-center gap-1 text-xs font-medium text-[#3B5BFF] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-[#9ca3af]">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[#9ca3af]">You&apos;re all caught up.</p>
            ) : (
              notifications.map((n) => {
                const meta = SEVERITY_META[n.severity]
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={cn(
                      "flex w-full items-start gap-2 border-b border-[#f3f4f6] px-3 py-2.5 text-left hover:bg-[#f9fafb]",
                      !n.read_at && "bg-[#f8faff]",
                    )}
                  >
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#111827]">{n.title}</span>
                      <span className="text-xs text-[#9ca3af]">
                        {meta.label} · {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    {!n.read_at && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B5BFF]" />}
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{active?.title ?? "Notification"}</DialogTitle>
          </DialogHeader>
          {active && (
            <iframe
              title={active.title}
              srcDoc={active.html_body}
              sandbox=""
              className="h-[520px] w-full rounded-lg border-0 bg-[#f4f5f7]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
