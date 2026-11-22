import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { cn } from "@/lib/utils"
import type { EventOption } from "@/types/eventRegistration"
import { formatEventClockEastern } from "./eventTime"
import {
  DEFAULT_HOST,
  sessionDay,
  sessionKey,
  sessionLocalTime,
  viewerZoneAbbreviation,
  type EventGroup,
  type EventSession,
} from "./eventSessions"

/**
 * One event on `/events`: a session picker whose tiles are self-contained cards
 * (R4; the owner's revised design, 2026-11-17, replacing the navy hero block).
 *
 * - Every session of the event is a gray, raised radio tile (native inputs, so
 *   arrow keys move between them); exactly one is selected, the earliest by default.
 *   Each tile carries a "30-day Free Access" pill at its top (owner's request, 2026-11-22), the logo, a LIVE DEMO tag, the event's heading text, its day
 *   and time, and "Hosted by".
 * - "Details" is a separate button beside its tile, never inside the label, so it
 *   cannot change the selection and nothing interactive is nested.
 * - The CTA hands the selected session's registration option to the existing
 *   registration dialog. No option (the switch is off, or the event is not
 *   offered) leaves a link to "Register your interest" instead; a full session
 *   says so. Nothing is registered from here directly.
 * - The English copy is literal text, not i18n keys: the repo's guards require every
 *   `t()` key to exist in the English file and the parity gate then requires it
 *   translated in six languages. The translation wave moves it into `joinPages`.
 * - Seats left is shown only when the data carries it; none is invented.
 * - The host line is the owner's fixed copy ("Hosted by Mark Tully, PRISM Practitioner", typed
 *   2026-11-17), like the rest of the tile text. The events data has no presenter fields; if it ever
 *   names one, that session shows its own presenter instead.
 */

export function EventHeroCard({
  group,
  optionFor,
  onRegister,
  onInfo,
}: {
  group: EventGroup
  optionFor: (session: EventSession) => EventOption | undefined
  onRegister: (option: EventOption) => void
  onInfo: (session: EventSession) => void
}) {
  const uid = useId()
  const headingId = `${uid}-pick`
  const { sessions } = group

  const keys = sessions.map((s, i) => sessionKey(s, i))
  const [picked, setPicked] = useState<string | null>(null)
  // The earliest session unless the visitor chose one that is still listed.
  const selectedKey = picked !== null && keys.includes(picked) ? picked : keys[0]
  const selectedIndex = keys.indexOf(selectedKey)
  const selected = sessions[selectedIndex]
  const selectedOption = optionFor(selected)

  const zone = viewerZoneAbbreviation(selected.starts_at)
  const day = sessionDay(selected.starts_at)
  const time = sessionLocalTime(selected.starts_at)

  const seats = selected.seats_left
  const seatsText = seats == null ? "Free" : seats === 1 ? "Free · 1 seat left" : `Free · ${seats} seats left`

  return (
    <li className="list-none">
      <section aria-label={group.title} className="@container flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={headingId} className="text-lg font-semibold">
            Choose a session
          </h2>
          {zone && <p className="text-sm text-slate-600">{`Times shown in your time zone (${zone})`}</p>}
        </div>

        <div role="radiogroup" aria-labelledby={headingId} className="grid grid-cols-1 gap-5 @2xl:grid-cols-2">
          {sessions.map((s, i) => {
            const key = keys[i]
            const id = `${uid}-s${i}`
            const option = optionFor(s)
            const label = `${sessionDay(s.starts_at)}, ${sessionLocalTime(s.starts_at)}`
            // The session's own presenter wins; otherwise the owner's fixed host.
            const hostName = s.presenter_name ?? DEFAULT_HOST.name
            const hostRole = s.presenter_name ? s.presenter_role : DEFAULT_HOST.role
            return (
              <div key={key} className="relative">
                <input
                  type="radio"
                  id={id}
                  name={`${uid}-session`}
                  value={key}
                  aria-label={label}
                  checked={key === selectedKey}
                  onChange={() => setPicked(key)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className={cn(
                    "flex min-h-[260px] cursor-pointer flex-col gap-4 rounded-xl border-2 border-event-tile-border p-5 pb-16 transition",
                    "bg-gradient-to-b from-event-tile-top to-event-tile-bottom shadow-event-tile",
                    "hover:-translate-y-0.5 hover:border-event-primary/50",
                    "peer-checked:-translate-y-0.5 peer-checked:border-event-primary peer-checked:shadow-event-tile-selected",
                    "peer-focus-visible:ring-[3px] peer-focus-visible:ring-event-primary/40",
                  )}
                >
                  <span className="self-start rounded-full bg-teal-800 px-3 py-1 text-xs font-bold tracking-wide text-white">
                    30-day Free Access
                  </span>

                  <span className="flex items-start justify-between gap-3">
                    <img src="/Logo-Dark.png" alt="" className="h-7 w-auto" />
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-bold tracking-wider text-teal-900">
                      LIVE DEMO
                    </span>
                  </span>

                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-600">{group.title}</span>
                    <span className="text-xl font-bold leading-snug tracking-tight text-slate-900">
                      See your AI mentoring partner in action
                    </span>
                    <span className="text-base font-semibold text-teal-800">PRISM has never been this powerful</span>
                    <span className="mt-1 text-sm leading-relaxed text-slate-700">
                      PRISM meets InspiresGenius — an exclusive invitation for PRISM Practitioners to see the InspiresGenius
                      AI platform in action.
                    </span>
                  </span>

                  <span className="mt-auto flex flex-col border-t border-slate-300 pt-3">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700">{sessionDay(s.starts_at)}</span>
                      {i === 0 && (
                        <span className="rounded-full bg-event-next-bg px-2 py-0.5 text-[11px] font-bold tracking-wide text-event-next-fg">
                          NEXT UP
                        </span>
                      )}
                    </span>
                    <span className="mt-1 text-2xl font-bold leading-tight text-slate-900">{sessionLocalTime(s.starts_at)}</span>
                    <span className="mt-0.5 text-xs text-slate-600">{formatEventClockEastern(s.starts_at)}</span>
                    {option?.full && <span className="mt-1 text-xs font-semibold text-slate-700">Full</span>}
                  </span>
                </label>

                <p className="pointer-events-none absolute bottom-4 left-5 max-w-[calc(100%-8rem)] text-xs leading-snug text-slate-700">
                  <span className="font-semibold">{`Hosted by ${hostName}`}</span>
                  {hostRole ? `, ${hostRole}` : ""}
                </p>

                {s.description && (
                  <button
                    type="button"
                    aria-label={`Details: ${label}`}
                    onClick={() => onInfo(s)}
                    className={cn(
                      "absolute bottom-3 right-3 min-h-8 rounded-full border border-slate-400 bg-white px-3 text-xs font-medium text-slate-800",
                      "before:absolute before:-inset-[6px] hover:bg-slate-50",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-event-primary/50",
                    )}
                  >
                    Details
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {selectedOption ? (
          selectedOption.full ? (
            <p role="status" className="rounded-xl border border-dashed px-4 py-4 text-center text-sm font-medium text-slate-700">
              This session is full.
            </p>
          ) : (
            <Button type="button" className="h-13 w-full rounded-xl text-base font-semibold" onClick={() => onRegister(selectedOption)}>
              {`Save my seat · ${day}, ${time}`}
            </Button>
          )
        ) : (
          <Button asChild className="h-13 w-full rounded-xl text-base font-semibold">
            {/* A plain anchor, not a router Link: the page renders with no router. */}
            <a href={ROUTES.JOIN}>Register your interest</a>
          </Button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-slate-600">
          <p>{seatsText}</p>
          <a href={ROUTES.JOIN} className="font-medium text-blue-primary underline-offset-4 hover:underline">
            Can't make it? Get notified
          </a>
        </div>
      </section>
    </li>
  )
}
