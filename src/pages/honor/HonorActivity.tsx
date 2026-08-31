import type { LucideIcon } from "lucide-react"
import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Flag,
  Mail,
  ShieldAlert,
  Sparkles,
  Target,
  Upload,
  UserPlus,
} from "lucide-react"
import { useHonorActivityFeed } from "@/hooks/honor/useHonorSchedule"
import type { HonorActivityItem } from "@/types/honor"
import { HonorCard, HonorEmptyState, HonorPageHeader } from "./_shared"
import { relativeTime } from "./_format"

/**
 * Honor Coach Workbench — Activity feed.
 *
 * Wires the live coach activity endpoint (GET /v1/agents/honor/coach/activity)
 * through {@link useHonorActivityFeed}, which is read-safe: an undeployed backend
 * degrades to the honest empty state below rather than an error boundary. Rows
 * render newest-first (the server sorts) with an action icon, actor, summary,
 * optional target, and a relative timestamp.
 */

/** Map an action code to an icon by keyword — unknown actions fall back to Activity. */
function iconForAction(action: string): LucideIcon {
  const a = action.toLowerCase()
  if (a.includes("evaluat")) return ClipboardCheck
  if (a.includes("invite") || a.includes("account")) return UserPlus
  if (a.includes("upload") || a.includes("import")) return Upload
  if (a.includes("document") || a.includes("resume") || a.includes("report")) return FileText
  if (a.includes("goal")) return Target
  if (a.includes("plan") || a.includes("meridian") || a.includes("agent")) return Sparkles
  if (a.includes("schedule") || a.includes("session")) return CalendarDays
  if (a.includes("email")) return Mail
  if (a.includes("denied") || a.includes("403") || a.includes("blocked")) return ShieldAlert
  if (a.includes("milestone") || a.includes("cohort")) return Flag
  return Activity
}

function ActivityRow({ item }: { item: HonorActivityItem }) {
  const Icon = iconForAction(item.action)
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(27,42,74,0.08)]">
        <Icon className="h-4 w-4 text-[#1B2A4A]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#18202f]">
          <span className="font-semibold">{item.actor}</span>{" "}
          <span className="text-[#374151]">{item.summary}</span>
          {item.target ? <span className="text-[#9299a6]"> · {item.target}</span> : null}
        </p>
      </div>
      <time
        className="shrink-0 whitespace-nowrap text-xs text-[#9299a6]"
        dateTime={item.when}
        title={item.when}
      >
        {relativeTime(item.when)}
      </time>
    </li>
  )
}

export default function HonorActivity() {
  const { data: items = [], isLoading } = useHonorActivityFeed()

  return (
    <div>
      <HonorPageHeader
        icon={Activity}
        title="Activity"
        description="Audit trail of coach and member actions, scoped to your caseload — newest first."
      />

      {isLoading ? (
        <HonorEmptyState>Loading activity…</HonorEmptyState>
      ) : items.length === 0 ? (
        <HonorEmptyState>No activity in the last 7 days.</HonorEmptyState>
      ) : (
        <HonorCard className="p-0">
          <ul className="divide-y divide-[#f1f3f7]">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>
        </HonorCard>
      )}
    </div>
  )
}
