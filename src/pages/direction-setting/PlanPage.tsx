import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Coins,
  Compass,
  Flag,
  Gauge,
  HandCoins,
  Loader2,
  RefreshCw,
  Sprout,
  TimerOff,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { usePlan, useRoi } from "@/hooks/direction-setting/usePlan"
import type {
  PlanItem,
  PlanResultPayload,
  RoiBand,
  RoiConfidence,
  RoiRecommendation,
  RoiResultPayload,
} from "@/types/direction-setting"

/**
 * Stages 9 and 10 — "how do I close the gap?" and "is it worth it?".
 *
 * Both stages are live now: `usePlan()` and `useRoi()` run the accept-then-poll
 * machine against `/plan` and `/roi`, so **waiting is a first-class state on
 * this page**, not a spinner. The presentational pieces below take the wire
 * payloads directly; there is no adapter layer, because every sentence worth
 * saying about these numbers is already written on the backend by the code that
 * produced them, and paraphrasing it here would be the fastest way to end up
 * with a screen that disagrees with its own data.
 *
 * Four rules are load-bearing. None of them is cosmetic:
 *
 * 1. **Server order is the order.** The sequence arrives sorted by what moves
 *    the fit band — critical gaps first, then coaching, largest miss first
 *    within a tier — computed against severity tiers this page does not hold.
 *    An earlier draft of this file re-sorted client-side; it no longer does,
 *    because a second implementation of the ordering rule is a second thing to
 *    drift.
 * 2. **Behavioural items have no cost, and no cost affordance.** The wire
 *    *omits* the `cost` key on them rather than sending `null`, precisely so a
 *    consumer cannot sum it as zero. `PlanItemCard` reads presence, not value.
 * 3. **Unknown effort renders as unknown.** `hours: null, known: false` is the
 *    ordinary case — nothing derives an hour count, because a derived one is
 *    indistinguishable on screen from a measured one. It says "we don't know
 *    how long this takes", never "0 hours" and never nothing at all.
 * 4. **The ROI refuses, and refusing is the ordinary path.** `RoiSummary` shows
 *    no figures when `roi` is null **or** `missing` is non-empty — including
 *    the case where the arithmetic did complete but rests on a partial cost
 *    side. Numbers built on placeholder inputs are a confident lie, and this is
 *    the screen someone quits a job over.
 *
 * One refusal deserves naming here because it is so easy to render wrongly.
 * `purchasable-path` means every gap on the plan was behavioural: there is
 * nothing to buy, so there is no payback period. That is **not** a free, instant
 * route into the role — it is a transition you cannot purchase, and it asks for
 * time and coaching instead. A "£0 payback" here would say close to the opposite
 * of the truth.
 */

/* ── Wording tables ──────────────────────────────────────────────────────── */

const SEVERITY_COPY: Record<
  string,
  { label: string; className: string; critical: boolean }
> = {
  critical: {
    label: "Moves your fit most",
    className: "text-rose-600",
    critical: true,
  },
  coaching: {
    label: "Steady build",
    className: "text-amber-600",
    critical: false,
  },
}

/** An unrecognised severity renders plainly rather than disappearing. */
function severityCopy(severity: string) {
  return (
    SEVERITY_COPY[severity] ?? {
      label: severity,
      className: "text-muted-foreground",
      critical: false,
    }
  )
}

/**
 * The headline for each refusal code.
 *
 * A short label only — the *explanation* is the backend's `missingStatements`
 * entry, rendered verbatim underneath. Those sentences were written next to the
 * code that decides when they apply, and rewording them here would let the two
 * drift apart in the one place where drift is a lie about money.
 *
 * An unknown code falls back to its own text, so a refusal this frontend has
 * never heard of still reaches the reader.
 */
const MISSING_LABEL: Record<string, string> = {
  "target-role": "No role to aim at yet",
  "target-occupation": "We don't hold that occupation",
  "target-salary": "No wage data behind that occupation",
  "current-income": "We don't know what you earn now",
  plan: "No plan to price yet",
  "purchasable-path": "This isn't a transition you can buy",
  "plan-cost": "Nothing on the plan is priced",
  "comparable-currency": "The currencies don't line up",
  "item-prices": "Some of the plan is unpriced",
}

const WAGE_POINT_LABEL: Record<string, string> = {
  entry: "At the entry wage",
  median: "At the median wage",
  experienced: "At the experienced end",
}

/* ── Formatting ──────────────────────────────────────────────────────────── */

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatYears(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded} ${rounded === 1 ? "year" : "years"}`
}

function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded} ${rounded === 1 ? "hour" : "hours"}`
}

/** One band figure, in the band's own unit. `years` and money read differently. */
function formatBandValue(value: number, unit: string): string {
  return unit === "years" ? formatYears(value) : formatMoney(value, unit || "USD")
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 9 — the plan.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One step: what to do, why it's here, what it asks of you.
 *
 * The cost line is decided by **key presence**, not by value. A behavioural item
 * has no `cost` key at all, so it gets a sentence saying it isn't something you
 * buy — not a price, not a zero, and not a blank slot that reads as free.
 */
export function PlanItemCard({ item }: { item: PlanItem }) {
  const severity = severityCopy(item.severity)
  const effort = item.effort
  // Presence, never value: `"cost" in item` is the whole taxonomy check.
  const purchasable = "cost" in item && item.cost !== undefined
  const cost = item.cost

  return (
    <li className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium">
          {item.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{item.title || item.competency}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                severity.className
              )}
            >
              {severity.critical ? (
                <AlertTriangle className="h-3 w-3" aria-hidden />
              ) : (
                <Sprout className="h-3 w-3" aria-hidden />
              )}
              {severity.label}
            </span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>

          {/* Effort. Unknown is a state with words of its own, not a blank. */}
          {effort.known && effort.hours !== null ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Effort: {formatHours(effort.hours)}
              {effort.horizon ? ` · review ${effort.horizon}` : ""}
            </p>
          ) : (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
              <TimerOff className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>
                <span className="font-medium">
                  We don&apos;t know how long this takes.
                </span>{" "}
                {effort.statement}
                {effort.horizon
                  ? ` We'd look at it again ${effort.horizon}.`
                  : ""}
              </span>
            </p>
          )}

          {/* Cost. Only purchasable items get a money line at all. */}
          {purchasable ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <HandCoins className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>
                {cost?.known && cost.amount !== null && cost.amount !== undefined
                  ? `Cost: ${formatMoney(cost.amount, cost.currency ?? "USD")}`
                  : `Cost: not known. ${cost?.statement ?? ""}`}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Not something you buy — this one is coached, practised and
              reviewed.
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * Stage 9 — the sequenced plan.
 *
 * Renders `plan.sequence` **in the order it arrived**. The ordering rule lives
 * on the backend, against severity tiers and gap magnitudes this page never
 * sees; `plan.sequenceBasis` is the backend's own explanation of it and is
 * printed rather than paraphrased.
 */
export function PlanSequence({ plan }: { plan: PlanResultPayload | null }) {
  const items = plan?.sequence ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
          How you&apos;d close the gap
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {plan?.note ??
              "There's no plan to show yet. This gets built from your matched role and the gaps between you and it — the biggest ones first, because those are what actually move your fit, not the ones that are easiest to tick off."}
          </p>
        ) : (
          <>
            {plan?.targetRole?.title && (
              <p className="text-sm">
                Towards{" "}
                <span className="font-medium">{plan.targetRole.title}</span>.
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              {plan?.sequenceBasis}
            </p>

            <ol className="space-y-2">
              {items.map((item) => (
                <PlanItemCard key={item.itemId} item={item} />
              ))}
            </ol>

            {/* The two totals, each allowed to say it cannot be totalled. */}
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium">Time: </span>
                {plan?.effort.statedHours !== null &&
                plan?.effort.statedHours !== undefined
                  ? `${formatHours(plan.effort.statedHours)} stated. `
                  : ""}
                {plan?.effort.statement}
              </p>
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium">Money: </span>
                {plan?.cost.knownTotal !== null &&
                plan?.cost.knownTotal !== undefined
                  ? `${formatMoney(
                      plan.cost.knownTotal,
                      plan.cost.currency ?? "USD"
                    )} so far. `
                  : ""}
                {plan?.cost.statement}
              </p>
            </div>

            {plan && plan.advisories.overdone.length > 0 && (
              <div>
                <p className="text-sm font-medium">
                  Strengths you turn up high
                </p>
                <p className="text-xs text-muted-foreground">
                  Reported, never sequenced — there&apos;s no course for an
                  over-expression and nothing here needs fixing.
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {plan.advisories.overdone.map((flag, i) => (
                    <li key={`${flag.dimension ?? "dimension"}-${i}`}>
                      <Badge variant="outline">
                        {flag.dimension ?? "Unnamed dimension"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan && plan.refusals.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">
                  {plan.refusals.length} input
                  {plan.refusals.length === 1 ? " was" : "s were"} refused
                </p>
                <ul className="mt-1 space-y-1">
                  {plan.refusals.map((refusal) => (
                    <li key={refusal} className="text-xs text-muted-foreground">
                      {refusal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">{plan?.note}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/** A checkpoint: what changes, roughly when, and how you'd know. */
export type PlanMilestone = {
  id: string
  title: string
  /** When to expect it — vague is fine, invented precision is not. */
  target: string
  /** How you'll know you got there. */
  evidence: string
}

export function MilestoneRow({ milestone }: { milestone: PlanMilestone }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border p-3">
      <Flag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="block font-medium">{milestone.title}</span>
        <span className="block text-sm text-muted-foreground">
          {milestone.evidence}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {milestone.target}
        </span>
      </div>
    </li>
  )
}

/**
 * The checkpoints along the way.
 *
 * Stage 9 does not produce these — it produces a sequence, a review horizon per
 * step, and no dates — so this list is empty in production and says so plainly.
 * Deriving milestones from the plan would mean inventing target dates and
 * inventing evidence, and someone would then measure themselves against both.
 */
export function MilestoneList({
  milestones,
}: {
  milestones: PlanMilestone[]
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag className="h-4 w-4 text-muted-foreground" aria-hidden />
          How you&apos;ll know it&apos;s working
        </CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            We don&apos;t set you dated checkpoints. Nothing in your plan claims
            a deadline, and invented ones are something you&apos;d end up
            measuring yourself against unfairly. Each step carries a review
            horizon instead — when it&apos;s worth looking at that one again.
          </p>
        ) : (
          <ul className="space-y-2">
            {milestones.map((m) => (
              <MilestoneRow key={m.id} milestone={m} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 10 — the ROI.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One derived figure across the three wage points.
 *
 * There is no scalar to render here and that is by design: the wage behind
 * these numbers is a range, and reducing it to one figure turns a planning aid
 * into a promise. A `null` at a wage point is *never reaches payback at that
 * wage* — a fact about the wage band, not a failure and not a zero.
 */
export function RoiBandRow({ label, band }: { label: string; band: RoiBand }) {
  const points: [string, number | null][] = [
    ["entry", band.atEntryWage],
    ["median", band.atMedianWage],
    ["experienced", band.atExperiencedWage],
  ]

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-sm font-medium">{label}</p>
      <dl className="mt-2 space-y-1">
        {points.map(([point, value]) => (
          <div key={point} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted-foreground">
              {WAGE_POINT_LABEL[point] ?? point}
            </dt>
            <dd className="text-sm">
              {value === null ? (
                <span className="text-muted-foreground">
                  never reaches payback at this wage
                </span>
              ) : (
                formatBandValue(value, band.unit)
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">{band.basis}</p>
      {band.note && (
        <p className="mt-1 text-xs text-muted-foreground">{band.note}</p>
      )}
    </div>
  )
}

/**
 * How much the figures can be leaned on, and exactly why not more.
 *
 * Rendered next to the numbers, never below the fold. `degradedBy` names which
 * input is the weak one, which is the difference between "low confidence" and
 * "low confidence *because nobody has priced two of your three courses*".
 */
export function ConfidencePanel({ confidence }: { confidence: RoiConfidence }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden />
        Confidence: {confidence.band}
      </p>
      {confidence.degradedBy.length > 0 && (
        <ul className="mt-2 space-y-1">
          {confidence.degradedBy.map((row) => (
            <li key={row.key} className="text-xs text-muted-foreground">
              {row.statement}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{confidence.ceiling}</p>
    </div>
  )
}

/**
 * When the honest answer is "a nearer target".
 *
 * The order is fixed and it matters: what this target would ask of you, then a
 * nearer one and *why* it is nearer, then — explicitly — that the choice is
 * theirs. The reader may be out of work and frightened. Nothing in here says or
 * implies that the original target is beyond them, and no sentence should be
 * added that puts the words "you cannot do this" in front of them, even to deny
 * it.
 */
export function RecommendationPanel({
  recommendation,
}: {
  recommendation: RoiRecommendation
}) {
  const recommend = recommendation.recommendDifferentTarget
  if (!recommend && recommendation.grounds.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="h-4 w-4 text-muted-foreground" aria-hidden />
          {recommend
            ? "There may be a nearer target"
            : "Worth knowing before you commit"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {recommendation.statement}
        </p>

        {recommendation.grounds.length > 0 && (
          <div>
            <p className="text-sm font-medium">What that&apos;s based on</p>
            <ul className="mt-1 space-y-1.5">
              {recommendation.grounds.map((ground) => (
                <li
                  key={ground.code}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                    aria-hidden
                  />
                  <span>{ground.statement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendation.alternatives.length > 0 && (
          <div>
            <p className="text-sm font-medium">Areas that sit nearer to you</p>
            <ul className="mt-1 space-y-2">
              {recommendation.alternatives.map((alt) => (
                <li
                  key={alt.family}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{alt.family}</span>
                    {alt.pivotDifficulty && (
                      <Badge variant="outline">
                        {alt.pivotDifficulty} pivot
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {alt.why}
                  </p>
                  {alt.range && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatMoney(alt.range.low, "USD")} –{" "}
                      {formatMoney(alt.range.high, "USD")} · Source:{" "}
                      {alt.range.source} · as of {alt.range.asOf}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          This is a read of distances between your profile and a benchmark, and
          it is yours to overrule. Plenty of people go on to do the thing the
          arithmetic was lukewarm about, and they are right to.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Stage 10 — is it worth it?
 *
 * Refusing is a first-class outcome. No figure is shown when `roi` is null, and
 * **none is shown when `missing` is non-empty either** — even though the
 * arithmetic in that second case did complete. A payback period built on a
 * partially-priced plan is a floor presented as an answer, and someone may act
 * on it.
 */
export function RoiSummary({ result }: { result: RoiResultPayload | null }) {
  const missing = result?.missing ?? []
  const computed = result?.roi ?? null
  const canCompute = computed !== null && missing.length === 0
  // Numbers exist but are not trustworthy enough to print: worth saying out
  // loud, because "we couldn't work it out" and "we worked it out and won't
  // show you" are different claims and the reader can tell.
  const partial = computed !== null && missing.length > 0
  const currency = computed?.currency ?? result?.cost.currency ?? "USD"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-4 w-4 text-muted-foreground" aria-hidden />
          Is it worth it?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canCompute ? (
          <>
            <p className="text-sm text-muted-foreground">
              {partial
                ? "The sum ran, but it rests on inputs we don't have in full — so what it produced is a floor, not an answer, and we're not putting it on screen as though it were one."
                : "We can't work this out honestly yet. We'd rather show you nothing than a number we made up — you might make a real decision on it."}
            </p>

            {missing.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  What&apos;s still missing:
                </p>
                <ul className="space-y-2">
                  {missing.map((code, i) => (
                    <li
                      key={code}
                      className="rounded-lg border border-border p-3"
                    >
                      <p className="text-sm font-medium">
                        {MISSING_LABEL[code] ?? code}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {result?.missingStatements?.[i] ?? ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result && <ConfidencePanel confidence={result.confidence} />}
            {result?.note && (
              <p className="text-xs text-muted-foreground">{result.note}</p>
            )}
          </>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <RoiBandRow
                label="Before it pays for itself"
                band={computed.paybackYears}
              />
              <RoiBandRow label="Extra per year" band={computed.upliftPerYear} />
              <RoiBandRow
                label={`Where you'd be after ${computed.horizonYears} years`}
                band={computed.netOverHorizon}
              />
            </div>

            {result && <ConfidencePanel confidence={result.confidence} />}

            <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              {computed.statement}
            </p>
            <p className="text-xs text-muted-foreground">
              {result?.currentIncome.statement} Priced in {currency}.{" "}
              {result?.note}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * The page.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Shared wording for the two job surfaces. Same machine, same states. */
function JobStates({
  what,
  phase,
  jobError,
  isStarting,
  storedFailed,
  onStart,
}: {
  what: string
  phase: string
  jobError: string | null
  isStarting: boolean
  storedFailed: boolean
  onStart: () => void
}) {
  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Checking what we already have…
      </div>
    )
  }

  if (phase === "waiting") {
    return (
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
        <span>
          Working on {what}. It reads what the other steps found and takes a
          little while — long enough that we hand it off and come back for it.
          You can leave this page; it carries on without you.
        </span>
      </div>
    )
  }

  if (phase === "failed") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">That run didn&apos;t finish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Something broke on our side part-way through. Nothing you&apos;ve
            entered was lost, and running it again is safe.
          </p>
          {jobError && (
            <p className="rounded border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
              {jobError}
            </p>
          )}
          <Button type="button" onClick={onStart} disabled={isStarting}>
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "lost") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            We&apos;ve lost track of that run
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            That job isn&apos;t there any more. Starting a fresh one costs you
            nothing but the wait.
          </p>
          <Button type="button" onClick={onStart} disabled={isStarting}>
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
            Start a new one
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "idle") {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          {storedFailed && (
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t check whether you&apos;ve already run this —
              that&apos;s a fault on our side, not a sign there&apos;s nothing
              here. Running it again is safe either way.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            This one is computed rather than stored, so it has to be asked for.
            You can run it whatever state the earlier steps are in — it will tell
            you what it was missing rather than pretend it wasn&apos;t.
          </p>
          <Button type="button" onClick={onStart} disabled={isStarting}>
            Work out {what}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}

export default function PlanPage() {
  const plan = usePlan()
  const roi = useRoi()

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">My plan</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          How you&apos;d close the distance to a role you want, in the order that
          actually moves it — and an honest read on whether the move pays off.
        </p>
      </header>

      <section className="space-y-4" aria-label="Your plan">
        <JobStates
          what="your plan"
          phase={plan.phase}
          jobError={plan.jobError}
          isStarting={plan.isStarting}
          storedFailed={plan.storedFailed}
          onStart={() => plan.start()}
        />

        {/* The plan outlives the phase it was produced in: a failed re-run or a
            lost job id shouldn't take the last good answer off the screen. */}
        {plan.result && plan.phase !== "loading" && (
          <>
            <PlanSequence plan={plan.result} />
            <MilestoneList milestones={[]} />
            {plan.phase === "ready" && (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => plan.start()}
                  disabled={plan.isStarting}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
                  Rebuild the plan
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  Worth doing after you change your target role or run the fit
                  step again.
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <section className="space-y-4" aria-label="Is it worth it?">
        <JobStates
          what="whether it pays off"
          phase={roi.phase}
          jobError={roi.jobError}
          isStarting={roi.isStarting}
          storedFailed={roi.storedFailed}
          onStart={() => roi.start()}
        />

        {roi.result && roi.phase !== "loading" && (
          <>
            <RoiSummary result={roi.result} />
            <RecommendationPanel recommendation={roi.result.recommendation} />
          </>
        )}
      </section>

      <div>
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES.DIRECTION_SETTING.JOURNEY}>
            Back to your journey
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  )
}
