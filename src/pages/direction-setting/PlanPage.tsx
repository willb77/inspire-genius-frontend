import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
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

type TFn = ReturnType<typeof useTranslation>["t"]

/** An unrecognised severity renders plainly rather than disappearing. */
function severityCopy(severity: string, t: TFn) {
  const SEVERITY_COPY: Record<
    string,
    { label: string; className: string; critical: boolean }
  > = {
    critical: {
      label: t("plan.severity.critical", "Moves your fit most"),
      className: "text-rose-600",
      critical: true,
    },
    coaching: {
      label: t("plan.severity.coaching", "Steady build"),
      className: "text-amber-600",
      critical: false,
    },
  }
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
const missingLabels = (t: TFn): Record<string, string> => ({
  "target-role": t("plan.missing.targetRole", "No role to aim at yet"),
  "target-occupation": t("plan.missing.targetOccupation", "We don't hold that occupation"),
  "target-salary": t("plan.missing.targetSalary", "No wage data behind that occupation"),
  "current-income": t("plan.missing.currentIncome", "We don't know what you earn now"),
  plan: t("plan.missing.plan", "No plan to price yet"),
  "purchasable-path": t("plan.missing.purchasablePath", "This isn't a transition you can buy"),
  "plan-cost": t("plan.missing.planCost", "Nothing on the plan is priced"),
  "comparable-currency": t("plan.missing.comparableCurrency", "The currencies don't line up"),
  "item-prices": t("plan.missing.itemPrices", "Some of the plan is unpriced"),
})

const wagePointLabels = (t: TFn): Record<string, string> => ({
  entry: t("plan.wagePoint.entry", "At the entry wage"),
  median: t("plan.wagePoint.median", "At the median wage"),
  experienced: t("plan.wagePoint.experienced", "At the experienced end"),
})

/* ── Formatting ──────────────────────────────────────────────────────────── */

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatYears(value: number, t: TFn): string {
  const rounded = Math.round(value * 10) / 10
  return rounded === 1
    ? t("plan.yearsOne", { defaultValue: "{{value}} year", value: rounded })
    : t("plan.yearsMany", { defaultValue: "{{value}} years", value: rounded })
}

function formatHours(value: number, t: TFn): string {
  const rounded = Math.round(value * 10) / 10
  return rounded === 1
    ? t("plan.hoursOne", { defaultValue: "{{value}} hour", value: rounded })
    : t("plan.hoursMany", { defaultValue: "{{value}} hours", value: rounded })
}

/** One band figure, in the band's own unit. `years` and money read differently. */
function formatBandValue(value: number, unit: string, t: TFn): string {
  return unit === "years" ? formatYears(value, t) : formatMoney(value, unit || "USD")
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
  const { t } = useTranslation("directionPages")
  const severity = severityCopy(item.severity, t)
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
              {effort.horizon
                ? t("plan.effortWithReview", {
                    defaultValue: "Effort: {{hours}} · review {{horizon}}",
                    hours: formatHours(effort.hours, t),
                    horizon: effort.horizon,
                  })
                : t("plan.effort", {
                    defaultValue: "Effort: {{hours}}",
                    hours: formatHours(effort.hours, t),
                  })}
            </p>
          ) : (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
              <TimerOff className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>
                <span className="font-medium">
                  {t("plan.weDonTKnowHow", "We don't know how long this takes.")}
                </span>{" "}
                {effort.statement}
                {effort.horizon && (
                  <>
                    {" "}
                    {t("plan.lookAgain", {
                      defaultValue: "We'd look at it again {{horizon}}.",
                      horizon: effort.horizon,
                    })}
                  </>
                )}
              </span>
            </p>
          )}

          {/* Cost. Only purchasable items get a money line at all. */}
          {purchasable ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <HandCoins className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>
                {cost?.known && cost.amount !== null && cost.amount !== undefined
                  ? t("plan.costKnown", {
                      defaultValue: "Cost: {{amount}}",
                      amount: formatMoney(cost.amount, cost.currency ?? "USD"),
                    })
                  : t("plan.costUnknown", {
                      defaultValue: "Cost: not known. {{statement}}",
                      statement: cost?.statement ?? "",
                    })}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("plan.notSomethingYouBuyThis", "Not something you buy — this one is coached, practised and reviewed.")}
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
  const { t } = useTranslation("directionPages")
  const items = plan?.sequence ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
          {t("plan.howYouDCloseThe", "How you'd close the gap")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {plan?.note ??
                t("plan.noPlanYet", "There's no plan to show yet. This gets built from your matched role and the gaps between you and it — the biggest ones first, because those are what actually move your fit, not the ones that are easiest to tick off.")}
            </p>
            {/* The server's note names "stages 7 and 8" — numbers the user has
                never seen, since the nav calls that page Job matches. Give them
                the door rather than the internal vocabulary. */}
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.DIRECTION_SETTING.MATCHES}>
                {t("plan.pickARoleToAim", "Pick a role to aim at")}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {plan?.targetRole?.title && (
              <p className="text-sm">
                {t("plan.towards", "Towards")}{" "}
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
                <span className="font-medium">{t("plan.time", "Time:")} </span>
                {plan?.effort.statedHours !== null &&
                plan?.effort.statedHours !== undefined ? (
                  <>
                    {t("plan.hoursStated", {
                      defaultValue: "{{hours}} stated.",
                      hours: formatHours(plan.effort.statedHours, t),
                    })}{" "}
                  </>
                ) : null}
                {plan?.effort.statement}
              </p>
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium">{t("plan.money", "Money:")} </span>
                {plan?.cost.knownTotal !== null &&
                plan?.cost.knownTotal !== undefined ? (
                  <>
                    {t("plan.moneySoFar", {
                      defaultValue: "{{amount}} so far.",
                      amount: formatMoney(
                        plan.cost.knownTotal,
                        plan.cost.currency ?? "USD"
                      ),
                    })}{" "}
                  </>
                ) : null}
                {plan?.cost.statement}
              </p>
            </div>

            {plan && plan.advisories.overdone.length > 0 && (
              <div>
                <p className="text-sm font-medium">
                  {t("plan.strengthsYouTurnUpHigh", "Strengths you turn up high")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("plan.reportedNeverSequencedThereS", "Reported, never sequenced — there's no course for an over-expression and nothing here needs fixing.")}
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {plan.advisories.overdone.map((flag, i) => (
                    <li key={`${flag.dimension ?? "dimension"}-${i}`}>
                      <Badge variant="outline">
                        {flag.dimension ?? t("plan.unnamedDimension", "Unnamed dimension")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan && plan.refusals.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">
                  {plan.refusals.length === 1
                    ? t("plan.refusalsOne", {
                        defaultValue: "{{total}} input was refused",
                        total: plan.refusals.length,
                      })
                    : t("plan.refusalsMany", {
                        defaultValue: "{{total}} inputs were refused",
                        total: plan.refusals.length,
                      })}
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
  const { t } = useTranslation("directionPages")
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag className="h-4 w-4 text-muted-foreground" aria-hidden />
          {t("plan.howYouLlKnowIt", "How you'll know it's working")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("plan.weDonTSetYou", "We don't set you dated checkpoints. Nothing in your plan claims a deadline, and invented ones are something you'd end up measuring yourself against unfairly. Each step carries a review horizon instead — when it's worth looking at that one again.")}
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
  const { t } = useTranslation("directionPages")
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
              {wagePointLabels(t)[point] ?? point}
            </dt>
            <dd className="text-sm">
              {value === null ? (
                <span className="text-muted-foreground">
                  {t("plan.neverReachesPaybackAtThis", "never reaches payback at this wage")}
                </span>
              ) : (
                formatBandValue(value, band.unit, t)
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
  const { t } = useTranslation("directionPages")
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden />
        {t("plan.confidence", {
          defaultValue: "Confidence: {{band}}",
          band: confidence.band,
        })}
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
  const { t } = useTranslation("directionPages")
  const recommend = recommendation.recommendDifferentTarget
  if (!recommend && recommendation.grounds.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="h-4 w-4 text-muted-foreground" aria-hidden />
          {recommend
            ? t("plan.nearerTarget", "There may be a nearer target")
            : t("plan.worthKnowingBeforeCommit", "Worth knowing before you commit")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {recommendation.statement}
        </p>

        {recommendation.grounds.length > 0 && (
          <div>
            <p className="text-sm font-medium">{t("plan.whatThatSBasedOn", "What that's based on")}</p>
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
            <p className="text-sm font-medium">{t("plan.areasThatSitNearerTo", "Areas that sit nearer to you")}</p>
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
                        {t("plan.pivotBadge", {
                          defaultValue: "{{difficulty}} pivot",
                          difficulty: alt.pivotDifficulty,
                        })}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {alt.why}
                  </p>
                  {alt.range && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("plan.rangeLine", {
                        defaultValue: "{{low}} – {{high}} · Source: {{source}} · as of {{asOf}}",
                        low: formatMoney(alt.range.low, "USD"),
                        high: formatMoney(alt.range.high, "USD"),
                        source: alt.range.source,
                        asOf: alt.range.asOf,
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {t("plan.thisIsAReadOf", "This is a read of distances between your profile and a benchmark, and it is yours to overrule. Plenty of people go on to do the thing the arithmetic was lukewarm about, and they are right to.")}
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
  const { t } = useTranslation("directionPages")
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
          {t("plan.isItWorthIt", "Is it worth it?")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canCompute ? (
          <>
            <p className="text-sm text-muted-foreground">
              {partial
                ? t("plan.roiPartial", "The sum ran, but it rests on inputs we don't have in full — so what it produced is a floor, not an answer, and we're not putting it on screen as though it were one.")
                : t("plan.roiRefused", "We can't work this out honestly yet. We'd rather show you nothing than a number we made up — you might make a real decision on it.")}
            </p>

            {missing.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  {t("plan.whatSStillMissing", "What's still missing:")}
                </p>
                <ul className="space-y-2">
                  {missing.map((code, i) => (
                    <li
                      key={code}
                      className="rounded-lg border border-border p-3"
                    >
                      <p className="text-sm font-medium">
                        {missingLabels(t)[code] ?? code}
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
                label={t("plan.beforeItPaysForItself", "Before it pays for itself")}
                band={computed.paybackYears}
              />
              <RoiBandRow label={t("plan.extraPerYear", "Extra per year")} band={computed.upliftPerYear} />
              <RoiBandRow
                label={t("plan.whereYoudBeAfterYears", {
                  defaultValue: "Where you'd be after {{years}} years",
                  years: computed.horizonYears,
                })}
                band={computed.netOverHorizon}
              />
            </div>

            {result && <ConfidencePanel confidence={result.confidence} />}

            <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              {computed.statement}
            </p>
            <p className="text-xs text-muted-foreground">
              {result?.currentIncome.statement}{" "}
              {t("plan.pricedIn", {
                defaultValue: "Priced in {{currency}}.",
                currency,
              })}{" "}
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
  const { t } = useTranslation("directionPages")
  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("plan.checkingWhatWeAlreadyHave", "Checking what we already have…")}
      </div>
    )
  }

  if (phase === "waiting") {
    return (
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
        <span>
          {t("plan.workingOn", {
            defaultValue:
              "Working on {{what}}. It reads what the other steps found and takes a little while — long enough that we hand it off and come back for it. You can leave this page; it carries on without you.",
            what,
          })}
        </span>
      </div>
    )
  }

  if (phase === "failed") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("plan.thatRunDidnTFinish", "That run didn't finish")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("plan.somethingBrokeOnOurSide", "Something broke on our side part-way through. Nothing you've entered was lost, and running it again is safe.")}
          </p>
          {jobError && (
            <p className="rounded border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
              {jobError}
            </p>
          )}
          <Button type="button" onClick={onStart} disabled={isStarting}>
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
            {t("plan.tryAgain", "Try again")}
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
            {t("plan.weVeLostTrackOf", "We've lost track of that run")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("plan.thatJobIsnTThere", "That job isn't there any more. Starting a fresh one costs you nothing but the wait.")}
          </p>
          <Button type="button" onClick={onStart} disabled={isStarting}>
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
            {t("plan.startANewOne", "Start a new one")}
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
              {t("plan.weCouldnTCheckWhether", "We couldn't check whether you've already run this — that's a fault on our side, not a sign there's nothing here. Running it again is safe either way.")}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("plan.thisOneIsComputedRather", "This one is computed rather than stored, so it has to be asked for. You can run it whatever state the earlier steps are in — it will tell you what it was missing rather than pretend it wasn't.")}
          </p>
          <Button type="button" onClick={onStart} disabled={isStarting}>
            {t("plan.workOut", { defaultValue: "Work out {{what}}", what })}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}

/**
 * The one input nothing on this platform knows.
 *
 * The ROI refuses without it, and its refusal text says "if you are not earning
 * anything at the moment, say so explicitly — a stated zero computes". Until
 * now there was nowhere to say either thing: the page called `roi.start()` with
 * no argument, so `current-income` was missing on every single run and the ROI
 * could never compute through the app. Being told what to do with no way to do
 * it is the most frustrating shape a screen can take.
 *
 * The "I'm not earning" checkbox is not a nicety. A stated zero and an omitted
 * value mean different things to the backend — one computes, one refuses — and
 * an empty number field cannot express the difference.
 */
function CurrentIncomeField({
  value,
  notEarning,
  onValue,
  onNotEarning,
}: {
  value: string
  notEarning: boolean
  onValue: (next: string) => void
  onNotEarning: (next: boolean) => void
}) {
  const { t } = useTranslation("directionPages")
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-4 w-4 text-muted-foreground" aria-hidden />
          {t("plan.whatYouEarnNow", "What you earn now")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("plan.workingOutWhetherAMove", "Working out whether a move pays off needs the side of the sum only you know. It is used for this calculation and nothing else.")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="ds-current-income"
            className="text-sm font-medium text-muted-foreground"
          >
            {t("plan.currentAnnualIncome", "Current annual income")}
          </label>
          <input
            id="ds-current-income"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            disabled={notEarning}
            value={notEarning ? "" : value}
            onChange={(e) => onValue(e.target.value)}
            placeholder={t("plan.incomePlaceholder", "e.g. 42000")}
            className="w-40 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={notEarning}
            onChange={(e) => onNotEarning(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          {t("plan.iMNotEarningAnything", "I'm not earning anything at the moment")}
        </label>
      </CardContent>
    </Card>
  )
}

export default function PlanPage() {
  const { t } = useTranslation("directionPages")
  const plan = usePlan()
  const roi = useRoi()

  const [income, setIncome] = useState("")
  const [notEarning, setNotEarning] = useState(false)

  /**
   * Build the plan on arrival instead of asking for another click.
   *
   * Someone who followed "My plan" from the journey map has already said what
   * they want. Landing them on an idle page with a button that says, in effect,
   * "did you mean it?" is a step that exists for the software's benefit rather
   * than theirs — and it read as the page being broken, because nothing
   * appeared.
   *
   * Guarded three ways so this stays a convenience and never a loop:
   *  - only from `idle` — never re-runs a plan that is ready, waiting or failed;
   *  - `startedRef` fires it at most once per mount, so a phase that flickers
   *    back through idle cannot start a second job;
   *  - a failure is left alone. `JobStates` already offers a retry, and
   *    automatically retrying a failing job on every render is how you turn one
   *    broken plan into a queue of them.
   */
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    if (plan.phase !== "idle" || plan.isStarting) return
    startedRef.current = true
    plan.start()
    // `plan` is rebuilt every render; depending on it would re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.phase, plan.isStarting])

  /**
   * `undefined` when nothing has been said, `0` when "not earning" is ticked.
   *
   * The distinction is the whole point: `undefined` omits the field and the
   * ROI refuses; `0` is a statement and computes. Never coerce a blank box to
   * zero — that would put words in someone's mouth about their income.
   */
  const parsed = Number(income)
  const statedIncome: number | undefined = notEarning
    ? 0
    : income.trim() !== "" && Number.isFinite(parsed) && parsed >= 0
      ? parsed
      : undefined

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("plan.myPlan", "My plan")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("plan.howYouDCloseThe2", "How you'd close the distance to a role you want, in the order that actually moves it — and an honest read on whether the move pays off.")}
        </p>
      </header>

      <section className="space-y-4" aria-label={t("plan.yourPlan", "Your plan")}>
        <JobStates
          what={t("plan.whatYourPlan", "your plan")}
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
                  {t("plan.rebuildThePlan", "Rebuild the plan")}
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("plan.worthDoingAfterYouChange", "Worth doing after you change your target role or run the fit step again.")}
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <section className="space-y-4" aria-label={t("plan.isItWorthIt", "Is it worth it?")}>
        <CurrentIncomeField
          value={income}
          notEarning={notEarning}
          onValue={setIncome}
          onNotEarning={setNotEarning}
        />
        <JobStates
          what={t("plan.whatWhetherItPaysOff", "whether it pays off")}
          phase={roi.phase}
          jobError={roi.jobError}
          isStarting={roi.isStarting}
          storedFailed={roi.storedFailed}
          onStart={() => roi.start({ currentIncome: statedIncome })}
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
            {t("plan.backToYourJourney", "Back to your journey")}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  )
}
