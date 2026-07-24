import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Clock, MapPin, Pencil, Trash2 } from "lucide-react"
import type { HonorSession } from "@/types/honor"
import { HonorCard, HonorEmptyState } from "./_shared"
import { HONOR_BTN_OUTLINE, formatClock } from "./_format"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

type View = "month" | "day"

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function sessionDay(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : dayKey(d)
}
function sameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b)
}

export default function ScheduleCalendar({
  sessions,
  fellowNameById,
  kindLabel,
  onEdit,
  onDelete,
  deleting,
  isLoading,
}: {
  sessions: HonorSession[]
  fellowNameById: Map<string, string>
  kindLabel: Record<string, string>
  onEdit: (s: HonorSession) => void
  onDelete: (s: HonorSession) => void
  deleting: boolean
  isLoading: boolean
}) {
  const [view, setView] = useState<View>("month")
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const today = new Date()

  const byDay = useMemo(() => {
    const m = new Map<string, HonorSession[]>()
    for (const s of sessions) {
      const k = sessionDay(s.startsAt)
      if (!k) continue
      const list = m.get(k) ?? []
      list.push(s)
      m.set(k, list)
    }
    for (const list of m.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    return m
  }, [sessions])

  // 6-week grid (42 cells) for the cursor's month.
  const grid = useMemo(() => {
    const y = cursor.getFullYear()
    const mo = cursor.getMonth()
    const start = new Date(y, mo, 1 - new Date(y, mo, 1).getDay())
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }, [cursor])

  function step(delta: number) {
    if (view === "month") setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth(), c.getDate() + delta))
  }
  function goToday() {
    setCursor(new Date())
  }
  function openDay(d: Date) {
    setCursor(d)
    setView("day")
  }

  const heading =
    view === "month"
      ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })

  const dayItems = byDay.get(dayKey(cursor)) ?? []

  return (
    <HonorCard className="p-0">
      {/* Toolbar: nav + heading + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f5] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous"
            className="rounded-lg border border-[#dfe4ec] p-1.5 text-[#5b6678] hover:border-[#E8792B] hover:text-[#c9631a]"
            onClick={() => step(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            className="rounded-lg border border-[#dfe4ec] p-1.5 text-[#5b6678] hover:border-[#E8792B] hover:text-[#c9631a]"
            onClick={() => step(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className={`${HONOR_BTN_OUTLINE} !px-3 !py-1.5`} onClick={goToday}>
            Today
          </button>
          <h2 className="ml-2 text-sm font-semibold text-[#18202f]">{heading}</h2>
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-[#dfe4ec]">
          {(["month", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v ? "bg-[#1B2A4A] text-white" : "bg-white text-[#5b6678] hover:text-[#18202f]"
              }`}
            >
              {v === "month" ? "Month" : "Day"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4">
          <HonorEmptyState>Loading schedule…</HonorEmptyState>
        </div>
      ) : view === "month" ? (
        <div>
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-[#eef1f5] text-center text-[11px] font-semibold uppercase tracking-wide text-[#9299a6]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>
          {/* Day grid */}
          <div className="grid grid-cols-7">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth()
              const items = byDay.get(dayKey(d)) ?? []
              const isToday = sameDay(d, today)
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => openDay(d)}
                  className={`min-h-[92px] border-b border-r border-[#f1f3f7] p-1.5 text-left align-top transition-colors hover:bg-[#f7f9fc] ${
                    inMonth ? "bg-white" : "bg-[#fbfcfe]"
                  } ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-[#E8792B] font-semibold text-white"
                        : inMonth
                          ? "text-[#18202f]"
                          : "text-[#c6cdd9]"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {items.slice(0, 3).map((s) => (
                      <div
                        key={s.id}
                        className="truncate rounded bg-[rgba(27,42,74,0.08)] px-1.5 py-0.5 text-[11px] text-[#1B2A4A]"
                        title={`${formatClock(s.startsAt)} · ${s.title}`}
                      >
                        <span className="font-medium">{formatClock(s.startsAt)}</span> {s.title}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="px-1 text-[10px] text-[#9299a6]">+{items.length - 3} more</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* Day view */
        <div className="p-4">
          {dayItems.length === 0 ? (
            <HonorEmptyState>No sessions on this day.</HonorEmptyState>
          ) : (
            <ul className="space-y-2">
              {dayItems.map((s) => {
                const who = s.fellowId ? fellowNameById.get(s.fellowId) : undefined
                return (
                  <li
                    key={s.id}
                    className="flex items-start gap-3 rounded-lg border border-[#f1f3f7] px-3 py-2.5"
                  >
                    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[rgba(27,42,74,0.08)] px-2 py-1 text-xs font-semibold text-[#1B2A4A]">
                      <Clock className="h-3.5 w-3.5" />
                      {formatClock(s.startsAt)}
                      {s.endsAt ? `–${formatClock(s.endsAt)}` : ""}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium text-[#18202f]">{s.title}</span>
                        {s.kind && (
                          <span className="rounded-full bg-[#f1f3f7] px-2 py-0.5 text-[11px] font-medium text-[#5b6678]">
                            {kindLabel[s.kind] ?? s.kind}
                          </span>
                        )}
                        {who && <span className="text-sm text-[#9299a6]">· {who}</span>}
                      </div>
                      {(s.location || s.description) && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9299a6]">
                          {s.location && (
                            <>
                              <MapPin className="h-3 w-3" /> {s.location}
                            </>
                          )}
                          {s.location && s.description ? " · " : ""}
                          {s.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-[#5b6678] hover:bg-[#f6f7f9] hover:text-[#1B2A4A]"
                        onClick={() => onEdit(s)}
                        aria-label={`Edit ${s.title}`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-[#5b6678] hover:bg-[#fdecec] hover:text-[#c0472b] disabled:opacity-50"
                        onClick={() => onDelete(s)}
                        disabled={deleting}
                        aria-label={`Delete ${s.title}`}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </HonorCard>
  )
}
