import { useId, useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { cn } from "@/lib/utils"
import type { EventOption } from "@/types/eventRegistration"
import { formatEventClock } from "./eventTime"
import {
  sessionDay,
  sessionKey,
  sessionLocalTime,
  viewerZoneAbbreviation,
  type EventGroup,
  type EventSession,
} from "./eventSessions"

/**
 * One event on `/events`: a navy brand panel and a session picker (R4, Bill's
 * "A go EventReg page rebuild", 2026-11-17).
 *
 * - Every session of the event is a radio tile (native inputs, so arrow keys move
 *   between them); exactly one is selected, the earliest by default.
 * - "Details" is a separate button beside its tile, never inside the label, so it
 *   cannot change the selection and nothing interactive is nested.
 * - The CTA hands the selected session's registration option to the existing
 *   registration dialog. No option (the switch is off, or the event is not
 *   offered) leaves a link to "Register your interest" instead; a full session
 *   says so. Nothing is registered from here directly.
 * - The card's English copy is literal text, not i18n keys (Bill's "i18n: English", 2026-11-17): the
 *   repo's guards require every `t()` key to exist in the English file and the parity gate then
 *   requires it translated in six languages. The translation wave moves it into the `joinPages`
 *   namespace (the registration dialog is in the same state).
 * - Optional presentation fields (presenter, duration, seats left) are shown only
 *   when the data carries them. None is invented.
 */

const CHECK_ITEM = "flex items-start gap-3 text-[15px] leading-snug text-white"

function Tick() {
  return <Check className="mt-0.5 h-4 w-4 flex-none text-event-accent" aria-hidden="true" />
}

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

  const minutes = selected.duration_minutes
  const seats = selected.seats_left
  const seatsText =
    seats == null
      ? "Free"
      : seats === 1
        ? "Free · 1 seat left"
        : `Free · ${seats} seats left`

  return (
    <li className="list-none">
      <section
        aria-label={group.title}
        className="@container overflow-hidden rounded-2xl border border-event-tile-border bg-card shadow-md"
      >
        <div className="grid grid-cols-1 @3xl:grid-cols-[minmax(300px,40%)_1fr] @4xl:grid-cols-[460px_1fr]">
          {/* ── Brand panel ───────────────────────────────────────── */}
          <div className="flex flex-col gap-5 bg-event-navy p-7 text-white @4xl:p-10">
            <img src="/Logo-Light.png" alt="Inspires Genius" className="h-8 w-auto self-start" />
            <ul className="flex flex-wrap gap-2" aria-label="Event type">
              <li className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold tracking-wider">
                LIVE DEMO
              </li>
              <li className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold tracking-wider">
                {minutes
                  ? `FREE · ${minutes} MIN`
                  : "FREE"}
              </li>
            </ul>
            <div>
              <p className="text-sm font-medium text-event-navy-muted">{group.title}</p>
              <h2 className="mt-1 text-3xl font-bold leading-tight tracking-tight">
                See your AI mentoring partner in action
              </h2>
              <p className="mt-3 text-lg font-semibold text-event-accent">
                PRISM has never been this powerful
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-event-navy-muted">
                PRISM meets InspiresGenius — an exclusive invitation for PRISM Practitioners to see the InspiresGenius AI platform in action.
              </p>
            </div>
            <ul className="flex flex-col gap-3" aria-label="What you will see">
              <li className={CHECK_ITEM}>
                <Tick />
                <span>Invite clients and follow their progress between sessions</span>
              </li>
              <li className={CHECK_ITEM}>
                <Tick />
                <span>Give each client a PRISM-grounded AI mentor</span>
              </li>
              <li className={CHECK_ITEM}>
                <Tick />
                <span>
                  <em>Grounded in PRISM.</em> Works with the tools your customers use.
                </span>
              </li>
              <li className={cn(CHECK_ITEM, "font-semibold")}>
                <Tick />
                <span>Free 30-day access for all attendees</span>
              </li>
            </ul>
            {selected.presenter_name && (
              <div className="mt-auto flex items-center gap-3 border-t border-event-navy-line pt-5">
                <img
                  src="/inspire-genius-mobile-logo.svg"
                  alt=""
                  width={40}
                  height={40}
                  loading="lazy"
                  className="h-10 w-10 flex-none rounded-lg"
                />
                <div>
                  <p className="text-sm font-semibold">
                    {`Hosted by ${selected.presenter_name}`}
                  </p>
                  {selected.presenter_role && <p className="text-sm text-event-navy-muted">{selected.presenter_role}</p>}
                </div>
              </div>
            )}
          </div>

          {/* ── Session picker ────────────────────────────────────── */}
          <div className="@container flex flex-col gap-5 p-6 @4xl:p-10">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 id={headingId} className="text-lg font-semibold">
                Choose a session
              </h3>
              {zone && (
                <p className="text-sm text-slate-600">
                  {`Times shown in your time zone (${zone})`}
                </p>
              )}
            </div>

            <div role="radiogroup" aria-labelledby={headingId} className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
              {sessions.map((s, i) => {
                const key = keys[i]
                const id = `${uid}-s${i}`
                const option = optionFor(s)
                const label = `${sessionDay(s.starts_at)}, ${sessionLocalTime(s.starts_at)}`
                return (
                  <div key={key} className="relative">
                    <input
                      type="radio"
                      id={id}
                      name={`${uid}-session`}
                      value={key}
                      checked={key === selectedKey}
                      onChange={() => setPicked(key)}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor={id}
                      className={cn(
                        "flex min-h-[136px] cursor-pointer flex-col rounded-xl border-2 border-event-tile-border bg-card p-4 pb-14 transition-colors",
                        "hover:border-event-primary/50 peer-checked:border-event-primary peer-checked:bg-event-selected",
                        "peer-focus-visible:ring-[3px] peer-focus-visible:ring-event-primary/40",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-700">{sessionDay(s.starts_at)}</span>
                        {i === 0 && (
                          <span className="rounded-full bg-event-next-bg px-2 py-0.5 text-[11px] font-bold tracking-wide text-event-next-fg">
                            NEXT UP
                          </span>
                        )}
                      </span>
                      <span className="mt-1 text-2xl font-bold leading-tight text-slate-900">{sessionLocalTime(s.starts_at)}</span>
                      <span className="mt-0.5 text-xs text-slate-600">{formatEventClock(s.starts_at, s.time_zone)}</span>
                      {option?.full && (
                        <span className="mt-1 text-xs font-semibold text-slate-700">
                          Full
                        </span>
                      )}
                    </label>
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
                {"Can't make it? Get notified"}
              </a>
            </div>
          </div>
        </div>
      </section>
    </li>
  )
}
