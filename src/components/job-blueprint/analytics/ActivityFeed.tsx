import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActivityItem } from '@/types/job-blueprint'
import { Briefcase, UserPlus, ClipboardList, Tags, ClipboardCheck, UserCheck, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ActivityFeedProps = {
  items: ActivityItem[]
}

const ICONS: Record<ActivityItem['type'], LucideIcon> = {
  'job-created': Briefcase,
  'candidate-intake': UserPlus,
  'assessment-completed': ClipboardList,
  'candidate-classified': Tags,
  'scorecard-submitted': ClipboardCheck,
  hired: UserCheck,
}

function when(ts: string): string {
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString()
}

/**
 * Recent Job DNA activity (`GET /v1/blueprint/activity`). Descriptions come
 * from the server verbatim; an unknown type gets a neutral icon rather than
 * being dropped. The caller renders the honest empty state when there is none.
 */
export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => {
            const Icon = ICONS[item.type] ?? Activity
            return (
              <li key={item.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Icon className="h-3.5 w-3.5 text-slate-600" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{item.description}</p>
                  <p className="text-xs text-slate-500">{when(item.timestamp)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
