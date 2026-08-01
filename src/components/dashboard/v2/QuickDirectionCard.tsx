import type { JSX } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Compass, RotateCcw } from "lucide-react"

import { ROUTES } from "@/constants/routes"
import { useJourney } from "@/hooks/direction-setting/useJourney"
import { useVerticalAccess } from "@/verticals/core"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * QuickDirectionCard — the Direction Setting entry point on My Space (HomeV2).
 *
 * One card, one job: put the **single next thing** in front of someone who
 * opened the dashboard not knowing what to do. Everything about it is a
 * deliberately small echo of `JourneyPage` — same idea, one tile's worth of it.
 *
 * Three choices worth keeping:
 *
 * 1. **It never invents the next step.** `nextAction` is derived server-side
 *    from the full stage map (the first *incomplete* stage, not the furthest
 *    reached). This card renders that answer; it does not recompute it. If the
 *    backend reorders or renames a stage, this card follows without an edit.
 * 2. **It always routes to the journey map, never straight into a stage.** The
 *    stage-id → route map lives in `JourneyPage` and is the one seam that has
 *    to be maintained when stages move. Duplicating it here would mean two
 *    places to forget. One extra click, no second source of truth.
 * 3. **It fails silently.** Home is the front door for every user and every
 *    role. A new vertical that is down, unreleased, or not entitled must be
 *    invisible here — not a red box, not a greyed-out tease. Anything other
 *    than a real, entitled, loaded journey renders `null`.
 *
 * ## Entitlement: hidden, not greyed
 *
 * The platform's nav convention is "visible to all, greyed without
 * entitlement" — verticals stay in the launcher so people can see what exists.
 * Home is deliberately the opposite. The launcher is a shop window; the Home
 * column is a work queue, and every tile in it is something you can act on now.
 * A permanently-inert card at the top of that queue is noise for most users and
 * a small "you can't have this" for the one user this vertical is actually for
 * — someone out of work. There is also nothing to show: the card's whole
 * content *is* the next action, and without entitlement there is no journey to
 * read one from. So: entitled → card; not entitled → nothing. The vertical is
 * still discoverable in the launcher, greyed, exactly as the convention says.
 */

/** What the card is saying, per journey status. Copy lives here, not inline. */
type CardCopy = {
  lead: string
  detail?: string
  cta: string
}

export function QuickDirectionCard(): JSX.Element | null {
  const navigate = useNavigate()

  // Entitlement first — a user without the vertical must not trigger the
  // journey read at all (it would 403, and a 403 on the Home surface is a
  // wasted request plus a console error for something they can't use).
  const { hasAccess, isLoading: accessLoading } = useVerticalAccess(
    "direction-setting"
  )

  const {
    data: journey,
    isLoading: journeyLoading,
    isError,
  } = useJourney({
    enabled: hasAccess,
    // No retries on Home. A failing read should disappear immediately rather
    // than hold a skeleton for three backoff rounds on someone else's page.
    retry: false,
  })

  // Not entitled → nothing at all. (While the entitlement read is in flight we
  // fall through to the skeleton, so the card never flashes in and out.)
  if (!accessLoading && !hasAccess) return null

  if (accessLoading || journeyLoading) {
    return (
      <div
        className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-4 shadow-sm md:p-5"
        aria-hidden="true"
      >
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-3 h-4 w-72" />
        <Skeleton className="mt-4 h-10 w-36 rounded-xl" />
      </div>
    )
  }

  // Error, 401, 403, or an empty body — say nothing. See the header note.
  if (isError || !journey) return null

  const next = journey.nextAction
  const total = journey.stages.length
  // 1-based position of the next step. `nextAction` is null-id when the journey
  // is finished, and findIndex returns -1 for an id we don't have a stage for,
  // so both collapse to 0 and the progress line is simply not rendered.
  const position = next.id
    ? journey.stages.findIndex((s) => s.id === next.id) + 1
    : 0

  const copy: CardCopy =
    journey.status === "complete" || next.id === null
      ? {
          lead: "You've been all the way through Direction Setting.",
          detail:
            "Things change — a new role in mind, a different goal. It's all still here whenever you want to go back over it.",
          cta: "Revisit your journey",
        }
      : journey.status === "in_progress"
        ? {
            lead: `Next: ${next.name} — ${next.question}`,
            detail: next.outcome,
            cta: "Continue",
          }
        : {
            lead: "Not sure what's next? Start here.",
            detail:
              "A guided path from “I don't know what I should be doing” to a role worth going for and a plan to get there. Take it at your own pace — every step is saved.",
            cta: "Start",
          }

  const showProgress = journey.status === "in_progress" && position > 0 && total > 0
  const pct = showProgress ? Math.round(((position - 1) / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-4 shadow-sm md:p-5">
      {/* Header — mirrors MeridianEngageCard: serif title, then a muted line. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-[#0B1B33]">
          <Compass className="h-5 w-5 text-[#127A8A]" aria-hidden="true" />
          Direction Setting
        </h3>
        {showProgress && (
          <span className="text-[12px] text-[#7C93B5]">
            Step {position} of {total}
          </span>
        )}
      </div>

      <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#0B1B33]">
        {copy.lead}
      </p>
      {copy.detail && (
        <p className="mt-1 text-[13px] leading-relaxed text-[#7C93B5]">
          {copy.detail}
        </p>
      )}

      {showProgress && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F3ECDD]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Direction Setting progress"
        >
          <div
            className="h-full rounded-full bg-[#127A8A] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate(ROUTES.DIRECTION_SETTING.JOURNEY)}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#0B1B33] px-4 text-[14px] font-medium text-[#FBF7F0] transition-colors hover:bg-[#3E6B55]"
      >
        {copy.cta}
        {journey.status === "complete" || next.id === null ? (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
