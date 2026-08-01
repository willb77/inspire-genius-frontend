import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Coins,
  Flag,
  Sprout,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"

/**
 * Stages 9 and 10 — "how do I close the gap?" and "is it worth it?".
 *
 * **The backend for this lands in Phase 5.** Nothing computes these answers
 * today, so this page ships as the real shell with an honest empty state rather
 * than as a mock-up: every section below is the component Phase 5 will feed, and
 * each one already knows how to say "I don't have this yet" in its own words.
 * When the data arrives the change is props, not a rewrite.
 *
 * Two rules are encoded here now, while the page is still cheap to shape:
 *
 * 1. **Order by what actually moves the fit band.** A plan sorted by what's
 *    easiest, or by what reads nicely, wastes the effort of someone who may not
 *    have much to spare. Critical gaps come first, then coaching gaps —
 *    `PlanSequence` sorts on that rule itself rather than trusting whatever order
 *    it is handed.
 * 2. **The ROI must be able to refuse.** A payback period invented from
 *    placeholder salary figures is worse than no number at all: it is the kind of
 *    thing someone quits a job over. So "we can't work this out honestly yet, and
 *    here's exactly what's missing" is `RoiSummary`'s first-class state, not a
 *    fallback bolted on underneath the happy path.
 */

/** What a plan step needs to be worth showing. Phase 5 supplies these. */
type PlanItemKind = "critical" | "coaching"

type PlanItem = {
  id: string
  /** What to do, in plain words. */
  title: string
  /** Why this one, before the others. */
  why: string
  kind: PlanItemKind
  /** Honest effort, e.g. "about two hours a week for a month". */
  effort: string
  /** Money cost, or null when it genuinely costs nothing but time. */
  cost: string | null
}

type PlanMilestone = {
  id: string
  title: string
  /** When to expect it — vague is fine, invented precision is not. */
  target: string
  /** How you'll know you got there. */
  evidence: string
}

type RoiEstimate = {
  /** Months until the change pays for itself. */
  paybackMonths: number
  /** Net position after three years, in `currency`. */
  threeYearNet: number
  /** ISO currency code. Defaults to USD when the backend omits it. */
  currency?: string
  /** What the number rests on, so it can be argued with. */
  basis: string
}

/** Critical first, then coaching — the rule this page exists to encode. */
const KIND_ORDER: Record<PlanItemKind, number> = { critical: 0, coaching: 1 }

const KIND_COPY: Record<PlanItemKind, { label: string; hint: string; className: string }> = {
  critical: {
    label: "Moves your fit most",
    hint: "The gaps that hold your fit back furthest.",
    className: "text-rose-600",
  },
  coaching: {
    label: "Steady build",
    hint: "Smaller distances that close with practice.",
    className: "text-amber-600",
  },
}

/** What Stage 10 would need before it could honestly compute anything. */
const ROI_INPUTS_MISSING = [
  "what you earn now, or last earned",
  "the going rate for the roles you're aiming at",
  "the cost and length of anything you'd need to train in",
  "how long the move is likely to take you",
]

/** One step in the plan: what to do, why it's here, what it asks of you. */
export function PlanItemCard({ item, position }: { item: PlanItem; position: number }) {
  const kind = KIND_COPY[item.kind]
  return (
    <li className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium">
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{item.title}</span>
            <span className={cn("inline-flex items-center gap-1 text-xs", kind.className)}>
              {item.kind === "critical" ? (
                <AlertTriangle className="h-3 w-3" aria-hidden />
              ) : (
                <Sprout className="h-3 w-3" aria-hidden />
              )}
              {kind.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Effort: {item.effort} · Cost: {item.cost ?? "your time only"}
          </p>
        </div>
      </div>
    </li>
  )
}

/**
 * Stage 9 — the sequenced plan.
 *
 * Sorts by what moves the fit band rather than rendering the order it was given:
 * the ordering rule is a product decision and belongs where it can't be lost by a
 * caller passing a differently-sorted array.
 */
export function PlanSequence({ items }: { items: PlanItem[] }) {
  const ordered = [...items].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
          How you&apos;d close the gap
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            There&apos;s no plan to show yet. This gets built from your matched role
            and the gaps between you and it — the biggest ones first, because
            those are what actually move your fit, not the ones that are easiest to
            tick off.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              In this order on purpose: the steps that move your fit furthest come
              first, so if you only get through the top of the list you&apos;ve still
              gained the most.
            </p>
            <ol className="space-y-2">
              {ordered.map((item, i) => (
                <PlanItemCard key={item.id} item={item} position={i + 1} />
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/** A checkpoint: what changes, roughly when, and how you'd know. */
export function MilestoneRow({ milestone }: { milestone: PlanMilestone }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border p-3">
      <Flag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="block font-medium">{milestone.title}</span>
        <span className="block text-sm text-muted-foreground">{milestone.evidence}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{milestone.target}</span>
      </div>
    </li>
  )
}

/** The checkpoints along the way. Empty until Phase 5 has a plan to mark up. */
export function MilestoneList({ milestones }: { milestones: PlanMilestone[] }) {
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
            Checkpoints appear once there&apos;s a plan to hang them on — small,
            visible things you can point at, so progress isn&apos;t something you
            have to take on faith.
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

/**
 * Stage 10 — is it worth it?
 *
 * Refusing is a first-class outcome. When `roi` is null, or anything in
 * `missing` is still outstanding, this renders what it would need instead of a
 * number — and it refuses even if a number was passed, because a payback period
 * computed from placeholder inputs is a confident lie, and someone may act on it.
 */
export function RoiSummary({
  roi,
  missing,
}: {
  roi: RoiEstimate | null
  missing: string[]
}) {
  const canCompute = roi !== null && missing.length === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-4 w-4 text-muted-foreground" aria-hidden />
          Is it worth it?
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!canCompute ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We can&apos;t work this out honestly yet. We&apos;d rather show you
              nothing than a number we made up — you might make a real decision on
              it.
            </p>
            <div>
              <p className="mb-1.5 text-sm font-medium">What&apos;s still missing:</p>
              <ul className="space-y-1">
                {missing.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                      aria-hidden
                    />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-semibold">
                  {roi.paybackMonths} month{roi.paybackMonths === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">before it pays for itself</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-2xl font-semibold">
                  <TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden />
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: roi.currency ?? "USD",
                    maximumFractionDigits: 0,
                  }).format(roi.threeYearNet)}
                </p>
                <p className="text-xs text-muted-foreground">where you&apos;d be after three years</p>
              </div>
            </div>
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              {roi.basis} These are estimates from the figures above — worth arguing
              with, not worth treating as a promise.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function PlanPage() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">My plan</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          How you&apos;d close the distance to a role you want, in the order that
          actually moves it — and an honest read on whether the move pays off.
        </p>
      </header>

      {/* The honest state. Said once, at the top, so nothing below reads as a
          promise that data is coming on this visit. */}
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This step isn&apos;t ready yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The part that builds your plan — putting your gaps in the order that
            moves your fit, costing what each step asks of you, and working out
            whether the move pays back — is still being built. Rather than fill this
            page with example numbers you might act on, we&apos;ve left it honest.
          </p>
          <p className="text-sm text-muted-foreground">
            Everything you do in the other steps feeds this one, so nothing you do
            now is wasted waiting for it.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.DIRECTION_SETTING.JOURNEY}>
              Back to your journey
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* The real shell. Phase 5 passes data in here; until then each section
          explains itself in its own words rather than showing a placeholder. */}
      <PlanSequence items={[]} />
      <MilestoneList milestones={[]} />
      <RoiSummary roi={null} missing={ROI_INPUTS_MISSING} />
    </div>
  )
}
