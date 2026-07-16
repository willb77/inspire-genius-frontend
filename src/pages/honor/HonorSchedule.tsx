import { useMemo, useState } from "react"
import { CalendarDays, CalendarPlus, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCoachSchedule } from "@/hooks/honor/useCoachData"
import type { ScheduleView } from "@/types/honor"
import { HonorCard, HonorEmptyState, HonorPageHeader } from "./_shared"
import { HONOR_BTN_OUTLINE } from "./_format"

/**
 * Honor Coach Workbench — Schedule.
 *
 * Wiring target: `GET /v1/coach/schedule?view=…` (net-new). Calendar-sync
 * (iCal / Google) is an explicit Phase-2 stub per the wireframe. Mock-backed via
 * {@link useCoachSchedule}; grouped into a simple day agenda for the scaffold.
 */

const VIEWS: ScheduleView[] = ["month", "day", "year"]

/** Group events by ISO date, sorted. */
function groupByDate(events: { date: string }[]) {
  const dates = Array.from(new Set(events.map((e) => e.date))).sort()
  return dates
}

const DAY_LABEL: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
}

/** Parse an ISO date into a "Mon, Jul 13" label without Date.now(). */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${DAY_LABEL[dow]}, ${months[m - 1]} ${d}`
}

export default function HonorSchedule() {
  const [view, setView] = useState<ScheduleView>("month")
  const { data: events = [], isLoading } = useCoachSchedule(view)

  const dates = useMemo(() => groupByDate(events), [events])

  return (
    <div>
      <HonorPageHeader
        icon={CalendarDays}
        title="Schedule"
        description="Sessions, debriefs, and cohort milestones across your caseload."
        action={
          <button
            type="button"
            className={HONOR_BTN_OUTLINE}
            title="Calendar sync is a Phase-2 integration"
          >
            <CalendarPlus className="h-4 w-4" /> Connect calendar (iCal / Google)
          </button>
        }
      />

      {/* View switcher */}
      <div className="mb-4 inline-flex rounded-lg border border-[#dfe4ec] bg-white p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              view === v ? "bg-[#1B2A4A] text-white" : "text-[#5b6678] hover:bg-[#f6f7f9]"
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {isLoading ? (
        <HonorEmptyState>Loading schedule…</HonorEmptyState>
      ) : dates.length === 0 ? (
        <HonorEmptyState>No events scheduled.</HonorEmptyState>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <HonorCard key={date}>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#18202f]">
                <CalendarDays className="h-4 w-4 text-[#1B2A4A]" />
                {formatDay(date)}
              </div>
              <ul className="space-y-2">
                {events
                  .filter((e) => e.date === date)
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 rounded-lg border border-[#f1f3f7] px-3 py-2.5"
                    >
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(27,42,74,0.08)] px-2 py-1 text-xs font-semibold text-[#1B2A4A]">
                        <Clock className="h-3.5 w-3.5" /> {e.time}
                      </span>
                      <span className="text-sm text-[#18202f]">{e.title}</span>
                      {e.fellow && <span className="text-sm text-[#9299a6]">· {e.fellow}</span>}
                    </li>
                  ))}
              </ul>
            </HonorCard>
          ))}
        </div>
      )}
    </div>
  )
}
