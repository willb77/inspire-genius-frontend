import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Loader2, Pause, SearchX, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { useMatches } from "@/hooks/direction-setting/useMatches"
import { useAdvanceJourney } from "@/hooks/direction-setting/useJourney"
import { useFitDetail } from "@/hooks/job-fit/useFitDetail"
import { FIT_MATCHES_STALE_MS, useFitMatches } from "@/hooks/job-fit/useFitMatches"
import { useFitComponents } from "@/hooks/job-fit/useFitComponents"
import { useFitSharedDisplayEnabled } from "@/hooks/switches/useFitSharedDisplayEnabled"
import { useJobFitComponentsEnabled } from "@/hooks/switches/useJobFitComponentsEnabled"
import { displayFitPercent } from "@/components/fit/fit"
import { asOverall } from "@/components/fit/components"
import type { FitMethod } from "@/types/job-fit"
import { FitMatchList } from "@/components/fit/FitMatchList"
import { FitResult } from "@/components/fit/FitResult"

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
 *    `displayFitPercent` helper, drawn by the shared `@/components/fit` list and
 *    result (FIT-5) — so a number here and the same number over there can
 *    never drift. Only the chrome is Direction Setting's, because this vertical's
 *    surfaces are calm and neutral where Job-Fit's are teal-branded.
 * 2. **Self-advocacy leads the breakdown, gaps follow.** Someone using this page
 *    is often between jobs. The dimensions where they already meet or beat the
 *    benchmark are the ones they should be saying out loud in an interview, and
 *    they are the part a gap-first layout buries. So they go first, and they get
 *    the largest card on the page.
 * 3. **The empty state is the real state.** Matching runs against *published*
 *    role benchmarks — an organisation's own, plus a shared library open to
 *    everyone. Someone arriving without an employer sees only the shared library.
 *    That library was empty for a long time, which made this page's zero-row
 *    state the *normal* one; it now carries 32 org-agnostic roles, so the empty
 *    state is back to being genuinely exceptional. It still has to read as an
 *    honest "there's nothing to compare you with yet" when it happens — never as
 *    a fault in them, never as a bug, and never patched over with invented
 *    sample roles.
 *
 * One thing this page must NOT show: the gap engine's band beside a closeness
 * percentage (4.1, option D; see below).
 */

/** A toggle option. `hint` is FIT-5b's (shared display on) and absent before it. */
type MethodOption = { value: FitMethod; label: string; hint?: string }

/** How the list is ordered. Both reads are live; the wording avoids jargon. */
const METHODS: MethodOption[] = [
  { value: "gap", label: "Closest to the role" },
  { value: "closeness", label: "Best overall match" },
]

/**
 * FIT-5b, decision 3 — the same toggle while `fit_shared_display` is on.
 * "Overall" means Overall fit only, so both reads are named for what they are:
 * two PRISM reads. The plain-language framing stays, as the hint.
 */
const SHARED_METHODS: MethodOption[] = [
  { value: "gap", label: "PRISM: gap", hint: "Closest to the role" },
  { value: "closeness", label: "PRISM: closeness", hint: "Closest in shape to the role's profile" },
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

/*
 * No fit tier and no Excellent/Good/Moderate/Poor band on this page (4.1,
 * option D). The band is the fit tier in other words, and the four-tier cut is
 * not calibrated; the percentage and the order carry the read. `fitBand`,
 * `displayBand`, `tier` and `baseTier` still arrive on the wire — they are just
 * not rendered here.
 */

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
        {/* The operator note. Someone seeing this card is usually one env var
            away from matches working, and previously the page gave them nothing
            to act on — so the most common response was to go looking for a fault
            in the user's profile, where there isn't one. Plain text rather than
            a link: this is a deploy-time change, not something to click. */}
        <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs">
          <p className="font-medium text-foreground">Turning it on</p>
          <p className="mt-1">
            Matching is always computed — this flag only controls who can see it.
            Set <code className="rounded bg-muted px-1">BLUEPRINT_MATCHING_ENABLED=true</code>{" "}
            on the blueprint-service Lambda via CDK
            (<code className="rounded bg-muted px-1">-c blueprintMatching=true</code>),
            not by editing the Lambda directly — a direct edit is reverted by the
            next deploy. Full steps in{" "}
            <code className="rounded bg-muted px-1">
              docs/runbooks/enable_role_matching.md
            </code>
            .
          </p>
          <p className="mt-1">
            This gates Job Matches, and Job Matches gates My Plan and Interview
            Prep — so all three come back together.
          </p>
        </div>
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
  // FIT-5b — the shared fit display. Fails closed: off, loading or unreadable
  // all read as off, and off is FIT-5a's page exactly.
  const shared = useFitSharedDisplayEnabled()
  // Off: exactly FIT-5a's call — `useMatches(method)`, its own key and its
  // 60 s cache. On: idle, and the page reads Career Fit's key instead (one
  // matches hook, one cache, 5 minutes — decision 9), so moving between Career
  // Fit and here no longer costs a second GET and a second snapshot row.
  //
  // While the switch is still loading the page is OFF (fail closed), so a cold
  // first visit may already have its own read in flight when the switch says
  // on. Those rows come from the same endpoint under the same method, so they
  // are shown until the shared read lands rather than flashing the spinner.
  const dsArgs: Parameters<typeof useMatches> = shared ? [method, { enabled: false }] : [method]
  const dsQuery = useMatches(...dsArgs)
  const sharedQuery = useFitMatches(method, { enabled: shared, staleTime: FIT_MATCHES_STALE_MS })
  const data = shared
    ? sharedQuery.data
      ? { matches: sharedQuery.data, gated: sharedQuery.gated }
      : dsQuery.data
    : dsQuery.data
  const isLoading = shared ? sharedQuery.isLoading && !dsQuery.data : dsQuery.isLoading
  const isError = shared ? sharedQuery.isError : dsQuery.isError
  const advance = useAdvanceJourney()

  const matches = data?.matches ?? []
  const gated = data?.gated === true
  // Default to the best match rather than making the user click to see anything.
  // Derived, not stored: a refetch that reorders the list can't strand the page
  // on a role that is no longer in it.
  const selectedId =
    picked && matches.some((m) => m.jobId === picked) ? picked : (matches[0]?.jobId ?? null)
  const selected = matches.find((m) => m.jobId === selectedId) ?? null

  // FIT-5b — Overall fit on the rows and the breakdown headline, read the way
  // Career Fit reads it (same route, same query key, so the two share a cache).
  // Only asked for while the shared display is on; the components switch is
  // not even read otherwise, so the off path makes no new request. Decision 7:
  // the rows stay in the server's order — Overall fit changes the figure on
  // each row, never which row is first, because `matches[0]` is what stage 7
  // records as the person's target role (FIT-3-F1, FIT-5-F3).
  const componentsOn = useJobFitComponentsEnabled(shared)
  const componentJobs = useMemo(
    () =>
      shared && !gated
        ? (sharedQuery.data ?? []).map((m) => ({ jobId: m.jobId, fitScore: displayFitPercent(m) }))
        : [],
    [shared, gated, sharedQuery.data],
  )
  const components = useFitComponents(componentJobs, shared && componentsOn)
  const overallJobs =
    shared && components.data?.mode === "overall" ? components.data.jobs : undefined
  const selectedOverall = selectedId ? asOverall(overallJobs?.[selectedId])?.overall : undefined

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
    // The two reads are separate queries. `useFitDetail` currently clears its
    // data when the job id changes, so `detail` cannot lag `selected` — but
    // that is a caching detail, and adding `placeholderData` to smooth the
    // transition would silently start writing one role's gaps under another
    // role's target. Assert the pairing instead of depending on it.
    if (detail.jobId !== selected.jobId) return
    // One write per role. Without this the effect re-fires on every refetch
    // and rewrites the same artefact indefinitely.
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
      <FitMatchList
        variant="ds"
        matches={matches}
        selectedId={selectedId}
        onSelect={setPicked}
        components={overallJobs}
        state={{ isLoading, isError, gated, gatedHidesRows: true }}
        slots={{
          loading: (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Lining your profile up against published roles…
            </div>
          ),
          error: (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  We couldn&apos;t load your matches just now. Refresh to try again —
                  nothing you&apos;ve done has been lost.
                </p>
              </CardContent>
            </Card>
          ),
          gated: <MatchingPaused />,
          empty: <NothingToMatchYet />,
          wrapList: (list) => (
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
                    {(shared ? SHARED_METHODS : METHODS).map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        role="radio"
                        title={m.hint}
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

                {list}
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
                {!detailLoading && detail && selected && <FitResult variant="ds" data={detail} overall={selectedOverall} />}
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
          ),
        }}
      />
    </div>
  )
}
