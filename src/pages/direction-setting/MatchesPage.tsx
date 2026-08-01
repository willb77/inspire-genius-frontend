import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Info,
  Loader2,
  MessagesSquare,
  Pause,
  SearchX,
  Sprout,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { useMatches } from "@/hooks/direction-setting/useMatches"
import { useAdvanceJourney } from "@/hooks/direction-setting/useJourney"
import { useFitDetail } from "@/hooks/job-fit/useFitDetail"
import type { FitDetail, FitMatch, FitMethod } from "@/types/job-fit"
import {
  bandLabel,
  fitPercent,
  fitPercentLabel,
  fitPercentTone,
  formatGap,
  tierLabel,
  type Tone,
} from "@/pages/job-fit/_fit"

/**
 * Stages 7 and 8 — "which roles actually suit me?" and "how far off am I?".
 *
 * Both stages live on one page on purpose: a list of role names with no read of
 * the gap is a tease, and a gap read with no role attached is abstract. Picking
 * a match opens its breakdown in place, so the answer to "how far off am I?"
 * never costs a page load or a lost scroll position.
 *
 * Three things this page is built around:
 *
 * 1. **It reuses Job-Fit outright.** The rows come from the same
 *    `/v1/blueprint/fit/matches` read the Job-Fit vertical uses, the breakdown
 *    from the same `/v1/blueprint/fit/{jobId}`, and the percentages from the same
 *    `fitPercent` helper — so a number here and the same number over there can
 *    never drift. Only the chrome is Direction Setting's, because this vertical's
 *    surfaces are calm and neutral where Job-Fit's are teal-branded.
 * 2. **Self-advocacy leads the breakdown, gaps follow.** Someone using this page
 *    is often between jobs. The dimensions where they already meet or beat the
 *    benchmark are the ones they should be saying out loud in an interview, and
 *    they are the part a gap-first layout buries. So they go first, and they get
 *    the largest card on the page.
 * 3. **The empty state is the real state.** Matching runs against *published*
 *    role benchmarks — an organisation's own, plus a shared library open to
 *    everyone. Someone arriving without an employer sees only the shared library,
 *    and that library has nothing in it yet: each benchmark is reviewed by a
 *    person before it is published, and that review hasn't happened. So the
 *    audience this journey exists for is, today, the audience that gets zero
 *    rows. That has to read as an honest "there's nothing to compare you with
 *    yet" — never as a fault in them, never as a bug, and never patched over
 *    with invented sample roles.
 */

/** Tone → text colour. Local to this vertical; Job-Fit's palette is its own. */
const TONE_TEXT: Record<Tone, string> = {
  green: "text-emerald-600",
  teal: "text-teal-600",
  amber: "text-amber-600",
  red: "text-rose-600",
  gray: "text-muted-foreground",
}

/** How the list is ordered. Both reads are live; the wording avoids jargon. */
const METHODS: { value: FitMethod; label: string }[] = [
  { value: "gap", label: "Closest to the role" },
  { value: "closeness", label: "Best overall match" },
]

/** The stages that still work when matching has nothing to show. */
const ELSEWHERE: { to: string; label: string; blurb: string }[] = [
  {
    to: ROUTES.DIRECTION_SETTING.CAREERS,
    label: "Career areas",
    blurb: "Which kinds of work suit how you're wired — no job listings needed.",
  },
  {
    to: ROUTES.DIRECTION_SETTING.PORTRAIT,
    label: "Who I am",
    blurb: "A plain-language read of your strengths you can borrow for a CV.",
  },
  {
    to: ROUTES.DIRECTION_SETTING.INTERVIEW,
    label: "Interview prep",
    blurb: "Work out what to say about yourself, and practise saying it.",
  },
]

/** The fit percentage for a row: closeness score under the closeness read. */
function rowPercent(match: FitMatch): number {
  if (match.method === "closeness" && match.closenessScore != null) {
    return Math.max(1, Math.min(100, Math.round(match.closenessScore)))
  }
  return fitPercent(match.fitScore, match.totalVariation, 22)
}

/** One ranked role. Selecting it opens its breakdown below, in place. */
function MatchRow({
  match,
  selected,
  onSelect,
}: {
  match: FitMatch
  selected: boolean
  onSelect: (jobId: string) => void
}) {
  const pct = rowPercent(match)
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(match.jobId)}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-colors",
          selected
            ? "border-primary bg-primary/5"
            : "border-border bg-background hover:border-primary/50"
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{match.roleTitle}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {match.department && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" aria-hidden />
                {match.department}
              </span>
            )}
            <span>{tierLabel(match.tier)} role</span>
            {match.fitBand && <span>{bandLabel(match.fitBand)}</span>}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span
            className={cn("block text-2xl font-semibold leading-none", TONE_TEXT[fitPercentTone(pct)])}
          >
            {pct}
            <span className="text-sm text-muted-foreground">%</span>
          </span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
            fit
          </span>
        </span>
      </button>
    </li>
  )
}

/**
 * The self-advocacy card — the quiet star of the page.
 *
 * These are the dimensions where the person already meets or beats the role's
 * benchmark, written as things to say. Deliberately the first and largest card
 * in the breakdown: a gap list is useful, but it is not what someone job-hunting
 * needs to read first.
 */
function SelfAdvocacyCard({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessagesSquare className="h-4 w-4 text-primary" aria-hidden />
          What to say out loud about this one
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          These are the places you already match or beat what the role asks for.
          They&apos;re yours to claim — worth having ready before an interview.
        </p>
        <ul className="space-y-2.5">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
              <span className="text-sm leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/** A gap group: the priority ones first, then the steadier ones. */
function GapList({
  title,
  hint,
  gaps,
  tone,
}: {
  title: string
  hint: string
  gaps: { dimensionName: string; gap: number }[]
  tone: Tone
}) {
  if (gaps.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {tone === "red" ? (
            <AlertTriangle className={cn("h-4 w-4", TONE_TEXT[tone])} aria-hidden />
          ) : (
            <Sprout className={cn("h-4 w-4", TONE_TEXT[tone])} aria-hidden />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
        <ul className="space-y-2">
          {gaps.map((g) => (
            <li
              key={g.dimensionName}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 text-sm"
            >
              <span>{g.dimensionName}</span>
              <span className={cn("font-medium", TONE_TEXT[tone])}>{formatGap(g.gap)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/**
 * Over-expressed strengths.
 *
 * Framed as information, never as a fault: these are things the person is good
 * at, turned up higher than this particular role tends to need — usually the way
 * someone behaves under pressure. Knowing it is useful. Being told off for it is
 * not, so the copy says so explicitly.
 */
function OverdoneCard({ flags }: { flags: { dimensionName: string; candidateScore: number }[] }) {
  if (flags.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
          Strengths you turn up high
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          These are strengths, not faults. You express them more strongly than this
          role typically calls for — which often shows up under pressure. Nothing
          here needs fixing; it&apos;s just useful to know which dial you reach for
          first.
        </p>
        <div className="flex flex-wrap gap-2">
          {flags.map((f) => (
            <span
              key={f.dimensionName}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
            >
              {f.dimensionName} · {f.candidateScore}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Stage 8 — the full breakdown for the selected role. */
function FitBreakdown({ match, detail }: { match: FitMatch; detail: FitDetail }) {
  const pct = fitPercent(
    detail.fitScore,
    detail.totalVariation,
    detail.perDimension.length || 22
  )
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-baseline gap-x-4 gap-y-2 p-5">
          <span
            className={cn("text-4xl font-semibold leading-none", TONE_TEXT[fitPercentTone(pct)])}
          >
            {pct}
            <span className="text-xl text-muted-foreground">%</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{detail.roleTitle}</span>
            <span className="block text-sm text-muted-foreground">
              {fitPercentLabel(pct)}
              {match.fitBand ? ` · ${bandLabel(match.fitBand)}` : ""}
            </span>
          </span>
        </CardContent>
      </Card>

      {/* Strengths first — see the note on SelfAdvocacyCard. */}
      <SelfAdvocacyCard lines={detail.interviewSelfAdvocacy} />

      <GapList
        title="Worth putting first"
        hint="The furthest from what this role leans on. Closing one of these moves your fit more than anything else you could do."
        gaps={detail.criticalGaps}
        tone="red"
      />

      <GapList
        title="Worth building over time"
        hint="Smaller distances. Steady practice closes these — no leap required."
        gaps={detail.coachingGaps}
        tone="amber"
      />

      <OverdoneCard flags={detail.overdoneFlags} />

      {detail.gated && (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Matching for this role is still in limited release, so treat this read as
          a first draft rather than a settled answer.
        </p>
      )}

      <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        {detail.methodologyNote ||
          "This compares your profile with a role's published benchmark to help you aim your effort. It is not a hiring decision, and no one else sees it."}
      </p>
    </div>
  )
}

/**
 * Nothing to match against.
 *
 * The most-visited state on this page, and the one that must not look broken.
 * It names the real cause (the shared library of role benchmarks is still being
 * reviewed), says plainly that it is not about the person, and hands them the
 * stages that do work today. No invented sample roles: a fake match here would
 * be the single most damaging thing this page could do.
 */
function NothingToMatchYet() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <SearchX className="h-4 w-4 text-muted-foreground" aria-hidden />
          There aren&apos;t any roles to compare you with yet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            This step lines your profile up against <em>published role benchmarks</em>
            {" "}— the detailed profiles of what a role actually asks for. Those come
            from two places: an employer&apos;s own library, and a shared library
            that&apos;s open to everyone.
          </p>
          <p>
            If you&apos;re not attached to an employer here, the shared library is all
            there is — and it&apos;s still being built. Every benchmark in it is read
            and checked by a person before it&apos;s published, and that work
            isn&apos;t finished, so right now there&apos;s nothing on the other side
            of the comparison.
          </p>
          <p className="font-medium text-foreground">
            Nothing is missing from your profile, and nothing has gone wrong. When
            the first benchmarks are published, your matches will appear here on
            their own — you won&apos;t have to redo anything.
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">In the meantime, these do work:</p>
          <ul className="space-y-2">
            {ELSEWHERE.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {item.blurb}
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Matching switched off platform-side.
 *
 * Distinct from "nothing to match against", and worth its own words: an empty
 * library is a gap being filled, whereas this is a feature deliberately held
 * back. Telling someone "no results" when the truth is "we haven't turned it on"
 * would be a small lie with a long tail.
 */
function MatchingPaused() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pause className="h-4 w-4 text-muted-foreground" aria-hidden />
          Role matching is switched off for now
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          We&apos;ve paused this step while the matching is checked over. It&apos;s a
          deliberate hold, not a fault at your end and nothing to do with your
          profile — it&apos;ll come back on without you doing anything.
        </p>
        <p>
          Everything else in your journey is unaffected, and anything you finish now
          feeds straight into your matches the moment they&apos;re back.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES.DIRECTION_SETTING.JOURNEY}>
            Back to your journey
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function MatchesPage() {
  const [method, setMethod] = useState<FitMethod>("gap")
  const [picked, setPicked] = useState<string | null>(null)
  const { data, isLoading, isError } = useMatches(method)
  const advance = useAdvanceJourney()

  const matches = data?.matches ?? []
  const gated = data?.gated === true
  // Default to the best match rather than making the user click to see anything.
  // Derived, not stored: a refetch that reorders the list can't strand the page
  // on a role that is no longer in it.
  const selectedId =
    picked && matches.some((m) => m.jobId === picked) ? picked : (matches[0]?.jobId ?? null)
  const selected = matches.find((m) => m.jobId === selectedId) ?? null

  const { data: detail, isLoading: detailLoading } = useFitDetail(
    selectedId ?? undefined,
    method
  )

  /**
   * Record stages 7 and 8 on the journey — the step this page was missing.
   *
   * Everything downstream (the plan, the ROI, the rehearsal's self-advocacy
   * read) is built from `direction_journey.artefacts`, keyed by stage. This
   * page renders both stages and was the only surface that could write them,
   * but never did: it read matches and fit detail and kept both in React
   * Query alone. So the plan reported "no target role and no gaps on file"
   * however long someone spent here, and the ROI refused to compute for want
   * of a target — and following the instruction to "work through stages 7 and
   * 8" changed nothing, because there was nothing to change.
   *
   * Stage 7 is wrapped as `{targetRole}` deliberately: `compute_plan` picks
   * that key out of the artefact, and the fit row nested underneath carries
   * `roleTitle` + `jobId`, which `normalise_target_role` reads. Stage 8 stores
   * the fit detail as-is — `collect_gaps` reads `criticalGaps`,
   * `coachingGaps`, `overdoneFlags` and `skillGaps` straight off it.
   *
   * Fire-and-forget, and only ever additive: this is bookkeeping that must not
   * cost the user a spinner, and a failed write leaves the stage where it was
   * rather than claiming progress that isn't stored.
   */
  const recorded = useRef<string | null>(null)
  useEffect(() => {
    if (gated || !selected || !detail) return
    // One write per role per mount. Without this the effect re-fires on every
    // refetch and rewrites the same artefact indefinitely.
    if (recorded.current === selected.jobId) return
    recorded.current = selected.jobId

    advance.mutate({
      stageId: "7",
      state: "complete",
      artefact: { targetRole: selected as unknown as Record<string, unknown> },
    })
    advance.mutate({
      stageId: "8",
      state: "complete",
      artefact: detail as unknown as Record<string, unknown>,
    })
    // `advance` is a stable mutation object; including it would re-run this on
    // every render for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated, selected, detail])

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Job matches</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Which roles suit the way you&apos;re actually wired, and how far you are
          from each one. Pick a role to see where you already match it and where
          there&apos;s ground to make up.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Lining your profile up against published roles…
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t load your matches just now. Refresh to try again —
              nothing you&apos;ve done has been lost.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && gated && <MatchingPaused />}

      {!isLoading && !isError && !gated && matches.length === 0 && <NothingToMatchYet />}

      {!isLoading && !isError && !gated && matches.length > 0 && (
        <>
          <section aria-labelledby="ds-matches-heading">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 id="ds-matches-heading" className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4 text-muted-foreground" aria-hidden />
                {matches.length} role{matches.length === 1 ? "" : "s"} to compare with
              </h2>
              <div
                role="radiogroup"
                aria-label="How to order your matches"
                className="inline-flex rounded-lg border border-border p-0.5"
              >
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={method === m.value}
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs transition-colors",
                      method === m.value
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="space-y-2">
              {matches.map((m) => (
                <MatchRow
                  key={m.jobId}
                  match={m}
                  selected={m.jobId === selectedId}
                  onSelect={setPicked}
                />
              ))}
            </ul>
          </section>

          <section aria-labelledby="ds-breakdown-heading">
            <h2 id="ds-breakdown-heading" className="mb-2 text-sm font-medium">
              Where you stand
            </h2>
            {detailLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Working out where you stand against this role…
              </div>
            )}
            {!detailLoading && detail && selected && (
              <FitBreakdown match={selected} detail={detail} />
            )}
            {!detailLoading && !detail && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    We couldn&apos;t open the breakdown for this role. Pick another,
                    or try again in a moment.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  )
}
