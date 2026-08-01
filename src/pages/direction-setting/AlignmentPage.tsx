import {
  AlertTriangle,
  ArrowRight,
  CircleDashed,
  Scale,
  Sprout,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/constants/routes"

/**
 * Stage 6 — "Do my goals and my wiring agree?"
 *
 * This is the stage that has to tell someone their stated goal may fight the
 * way they're built, and it has to do that without sounding like a verdict.
 * The whole design rests on one sentence: **a tension is information, not a
 * problem with the person.** Plenty of people succeed at things that run
 * against their grain; they just pay for it in energy, and knowing the price in
 * advance is the difference between a considered choice and a slow burnout.
 *
 * So the vocabulary here is deliberate and should survive future edits:
 *   - "supported by" rather than "you're good at"
 *   - "runs against" / "at tension" rather than "weakness" or "mismatch"
 *   - conflicts are put as a **question for the person**, never as a
 *     recommendation. We do not get to decide which of two things they want
 *     more.
 *
 * ## State of the backend
 *
 * The endpoint that produces this analysis lands in **Phase 3 and does not
 * exist yet**. There is intentionally no service call, no hook, and no sample
 * data on this page. Showing an invented tension would be worse than showing
 * nothing: someone could reasonably drop a goal over it.
 *
 * What is here instead is the whole presentational layer, already written
 * against the shape Phase 3 will return. When the endpoint ships, the change is
 * confined to `useAlignmentReport` below — swap its body for the real React
 * Query hook. `AlignmentReportView` and the three row components underneath it
 * do not move.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The shape Phase 3 has to fill.
 *
 * Kept in this file rather than in `types/direction-setting.ts` because nothing
 * else consumes it yet, and a type in the shared module implies an endpoint
 * that exists. It moves out the day the backend lands.
 * ──────────────────────────────────────────────────────────────────────────── */

/** A goal the person's wiring makes easier. */
export type SupportedGoal = {
  goal: string
  /** The behavioural read that supports it, in plain words. */
  supportedBy: string
  /** Optional "so what" — how to spend the advantage. */
  note?: string
}

/** A goal that runs against the grain. Reachable; just not free. */
export type GoalTension = {
  goal: string
  /** The wiring it pulls against. */
  runsAgainst: string
  /** What it will actually cost, stated concretely. */
  cost: string
  /** What makes it survivable. Never omitted — a cost with no answer is a verdict. */
  whatHelps: string
}

/** Two things the person wants that cannot both be maximised. */
export type GoalConflict = {
  /** The two goals, named as the person named them. */
  goals: [string, string]
  /** Why they pull apart. Descriptive, not prescriptive. */
  explanation: string
  /** The question only they can answer. We never answer it for them. */
  question: string
}

export type AlignmentReport = {
  supported: SupportedGoal[]
  tensions: GoalTension[]
  conflicts: GoalConflict[]
  /** Present when the report is thin for an explainable reason (no PRISM, no goals). */
  note?: string
}

type AlignmentState = {
  report: AlignmentReport | null
  /** False until Phase 3 ships the endpoint. */
  available: boolean
}

/**
 * The seam.
 *
 * Deliberately a stub that returns nothing rather than a hook pointed at a
 * route that would 404. Phase 3 replaces the body with a real query — the
 * return shape is already what the page reads.
 */
function useAlignmentReport(): AlignmentState {
  return { report: null, available: false }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Presentational pieces. Pure props in, markup out — no data fetching, so they
 * are testable now and unchanged by Phase 3.
 * ──────────────────────────────────────────────────────────────────────────── */

export function SupportedGoalRow({ item }: { item: SupportedGoal }) {
  return (
    <li className="flex gap-3 rounded-lg border border-emerald-200/70 bg-emerald-50/40 p-3">
      <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{item.goal}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <span className="text-foreground/70">Supported by:</span>{" "}
          {item.supportedBy}
        </p>
        {item.note && (
          <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
        )}
      </div>
    </li>
  )
}

export function AtTensionRow({ item }: { item: GoalTension }) {
  return (
    <li className="flex gap-3 rounded-lg border border-amber-200/80 bg-amber-50/40 p-3">
      <Scale className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{item.goal}</p>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground/70">Runs against:</span>{" "}
          {item.runsAgainst}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground/70">What that costs:</span>{" "}
          {item.cost}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground/70">What helps:</span>{" "}
          {item.whatHelps}
        </p>
        {/* Said every time, not once at the top of the list. Someone reading a
            single row about their own goal needs it in front of them. */}
        <p className="pt-0.5 text-xs text-muted-foreground/90">
          This doesn&apos;t mean don&apos;t. It means go in knowing the price.
        </p>
      </div>
    </li>
  )
}

export function ConflictCallout({ item }: { item: GoalConflict }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium">
            {item.goals[0]} <span className="text-muted-foreground">vs</span>{" "}
            {item.goals[1]}
          </p>
          <p className="text-sm text-muted-foreground">{item.explanation}</p>
          <p className="text-sm font-medium">{item.question}</p>
        </div>
      </div>
    </div>
  )
}

/** The report itself, once there is one. Rendered by the page when data exists. */
export function AlignmentReportView({ report }: { report: AlignmentReport }) {
  return (
    <div className="space-y-6">
      {report.note && (
        <p className="text-sm text-muted-foreground">{report.note}</p>
      )}

      <section aria-labelledby="alignment-supported">
        <h2 id="alignment-supported" className="mb-2 text-sm font-medium">
          Goals your wiring is behind
        </h2>
        {report.supported.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here yet — that usually means the goals and the profile
            haven&apos;t both been done, not that none of your goals fit.
          </p>
        ) : (
          <ul className="space-y-2">
            {report.supported.map((item) => (
              <SupportedGoalRow key={item.goal} item={item} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="alignment-tensions">
        <h2 id="alignment-tensions" className="mb-2 text-sm font-medium">
          Goals that will cost you something
        </h2>
        {report.tensions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None found. That&apos;s a real result, not a blank.
          </p>
        ) : (
          <ul className="space-y-2">
            {report.tensions.map((item) => (
              <AtTensionRow key={item.goal} item={item} />
            ))}
          </ul>
        )}
      </section>

      {report.conflicts.length > 0 && (
        <section aria-labelledby="alignment-conflicts" className="space-y-2">
          <h2 id="alignment-conflicts" className="text-sm font-medium">
            Two things you want that pull apart
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;re naming these rather than quietly averaging them. Which way
            you go is yours to decide.
          </p>
          {report.conflicts.map((item) => (
            <ConflictCallout key={item.goals.join("|")} item={item} />
          ))}
        </section>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────── */

export default function AlignmentPage() {
  const navigate = useNavigate()
  const { report, available } = useAlignmentReport()

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">
          Do my goals and my wiring agree?
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Step 6 of the journey. It lays your goals next to the career areas you
          picked and next to how you&apos;re actually built, and says plainly
          where those three agree and where they don&apos;t.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What this step does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Some of what you want will come easily to you. Some of it will take
            more out of you than it takes out of other people. That&apos;s worth
            knowing before you build a plan on top of it — not so you drop the
            hard thing, but so you go in with your eyes open and some support in
            place.
          </p>
          <p>
            Where two of your goals genuinely pull against each other, this step
            says so instead of smoothing it over. A tension is information about
            a trade-off, not a judgement about you, and nothing here is a score.
          </p>
        </CardContent>
      </Card>

      {available && report ? (
        <AlignmentReportView report={report} />
      ) : (
        /* Honest empty state. No chart, no sample rows, no "coming soon!"
           cheerfulness — just what's missing and what to do meanwhile. */
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDashed
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              This step isn&apos;t ready yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We&apos;re still building the part that compares your goals with
              your profile. Rather than show you a guess, we&apos;re showing you
              nothing — this is the kind of thing people change their minds over,
              and it needs to be right.
            </p>
            <p className="text-sm text-muted-foreground">
              The two steps it reads from are both open now, and doing them means
              this one has something real to work with the moment it lands.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.DIRECTION_SETTING.GOALS)}
              >
                Set my goals
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.DIRECTION_SETTING.PORTRAIT)}
              >
                See who I am
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
