import type { JSX } from "react"

import { cn } from "@/lib/utils"

export interface ActivityItem {
  label: string
  meta?: string
}

interface RecentActivityCardProps {
  items: ActivityItem[]
  loading?: boolean
  emptyLabel?: string
}

const DEFAULT_EMPTY_LABEL = "No recent activity"

const DOT_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
] as const

export function RecentActivityCard({
  items,
  loading,
  emptyLabel = DEFAULT_EMPTY_LABEL,
}: RecentActivityCardProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7C93B5]">
            Activity
          </div>
          <h3 className="mt-0.5 font-serif text-lg text-[#0B1B33]">
            Recent activity
          </h3>
        </div>
        <span className="text-xs text-[#4b5f80]">Last 7 days</span>
      </div>

      {loading ? (
        <div className="py-2 text-sm text-[#4b5f80]">Loading activity…</div>
      ) : items.length === 0 ? (
        <div className="py-2 text-sm text-[#4b5f80]">{emptyLabel}</div>
      ) : (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="flex items-start gap-3 border-b border-[rgba(11,27,51,0.10)] px-1.5 py-2.5 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                  DOT_COLORS[index % DOT_COLORS.length]
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[#0B1B33]">{item.label}</div>
                {item.meta ? (
                  <div className="text-xs text-[#7C93B5]">{item.meta}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
