import {
  AlertTriangle,
  ArrowRight,
  CircleDashed,
  FileQuestion,
  Loader2,
  RefreshCw,
  Scale,
  Sprout,
  Waves,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/constants/routes"
import { useAlignment } from "@/hooks/direction-setting/useAlignment"
import type {
  AlignmentDimension,
  AlignmentGoal,
  AlignmentResultPayload,
} from "@/types/direction-setting"

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
 * ## The backend, and the shape of this file
 *
 * The analysis is real now: `useAlignment` reads `GET /alignment` on mount,
 * starts `POST /alignment/jobs`, and polls the job to a terminal status. The
 * stage is on the async job path because it cannot finish inside API Gateway's
 * 30-second cap, so **waiting is a first-class state on this page**, not a
 * spinner — it says what is being computed while it computes it.
 *
 * The presentational components below are untouched from the placeholder build
 * and take the same props they always did. What sits between them and the wire
 * is `toReportView`, one adapter, in one place. That is where every judgement
 * about how a computed number becomes a sentence lives, and it is the only
 * thing to read when the wording needs to change.
 *
 * ## What the adapter will not do
 *
 * The backend's `conflicts[]` is the at-tension goals over again — it does not
 * detect *pairs* of goals that pull against each other, which is what
 * `GoalConflict` describes. So `conflicts` comes out empty, and
 * `ConflictCallout` waits for a backend that produces pairs. Manufacturing "you
 * want A and B, which will you drop?" out of two independently-scored goals
 * would be inventing a finding, and someone could reasonably drop a real goal
 * over it.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The view model.
 *
 * Deliberately not the wire shape. The wire carries scores and dimension
 * vectors; these types carry sentences. Keeping them apart is what stops a
 * rounding change on the backend from rewriting the page's tone by accident.
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

/** Neither clearly supported nor clearly at tension — workable, at a price. */
export type MixedGoal = {
  goal: string
  /** How it reads against the role family, with the numbers behind it. */
  readsAs: string
  /** Where the effort will go, when the profile names somewhere specific. */
  whatItCosts?: string
}

/**
 * A goal we could not place against any career family.
 *
 * The matcher is conservative by design — it only accepts a whole-word match —
 * so this list is expected to have things in it. **It is always rendered.** A
 * goal quietly disappearing from someone's own alignment report is a worse
 * failure than admitting we couldn't place it.
 */
export type UnplacedGoal = {
  goal: string
  why: string
}

/**
 * Goals on file that cannot be scored at all, because there is no behavioural
 * assessment to score them against.
 *
 * A separate state from a low score, and it must never be rendered as one. With
 * no PRISM every dimension imputes to neutral and every goal lands near 50 —
 * a screenful of middling verdicts that look measured and are not.
 */
export type UnscoredGoals = {
  goals: string[]
  why: string
}

export type AlignmentReport = {
  supported: SupportedGoal[]
  tensions: GoalTension[]
  conflicts: GoalConflict[]
  mixed?: MixedGoal[]
  unplaced?: UnplacedGoal[]
  unscored?: UnscoredGoals
  /** Present when the report is thin for an explainable reason (no PRISM, no goals). */
  note?: string
}

/* ────────────────────────────────────────────────────────────────────────────
 * Wire → view model.
 * ──────────────────────────────────────────────────────────────────────────── */

/** 63.0 → "63", 63.4 → "63.4". Trailing zeroes read as false precision. */
function num(value: number): string {
  return String(Number(value.toFixed(1)))
}

/**
 * One driving dimension, with **both** numbers.
 *
 * "You're low on Investigative & Analytical" is an opinion. "You 34, this kind
 * of work usually asks 90" is a fact the person can check against their own
 * PRISM report — and can disagree with, which is the point.
 *
 * `yourScore` is null when the dimension was imputed rather than measured. That
 * says "nothing on file" and never a number: printing the neutral placeholder
 * would be reporting a measurement that was never taken.
 */
function describeDimension(dimension: AlignmentDimension): string {
  if (dimension.yourScore === null || dimension.yourScore === undefined) {
    return `${dimension.dimension} (nothing on file for this one yet)`
  }
  return `${dimension.dimension} (you ${num(dimension.yourScore)}, this kind of work usually asks ${num(dimension.roleNeeds)})`
}

function describeDimensions(dimensions: AlignmentDimension[] | undefined): string {
  return (dimensions ?? []).map(describeDimension).join("; ")
}

/** "the Research & Analysis family", or a neutral fallback when unnamed. */
function familyPhrase(goal: AlignmentGoal): string {
  return goal.family ? `${goal.family} work` : "this kind of work"
}

function toSupported(goal: AlignmentGoal): SupportedGoal {
  const carrying = describeDimensions(goal.drivers?.supporting)
  return {
    goal: goal.title,
    supportedBy: carrying || `the shape of ${familyPhrase(goal)} overall`,
    note:
      goal.score === null
        ? undefined
        : `You score ${num(goal.score)} out of 100 against ${familyPhrase(goal)}. This is the one you don't have to force.`,
  }
}

function toTension(goal: AlignmentGoal): GoalTension {
  const opposing = describeDimensions(goal.drivers?.opposing)
  const carrying = describeDimensions(goal.drivers?.supporting)
  const score = goal.score === null ? null : num(goal.score)

  return {
    goal: goal.title,
    runsAgainst:
      opposing ||
      `${familyPhrase(goal)} as a whole — no single dimension dominates, the distance is spread across the profile`,
    cost: score
      ? `You score ${score} out of 100 against ${familyPhrase(goal)}. That distance is effort: work leaning on a dimension you sit below takes more out of your day than it takes out of someone who sits above it.`
      : `The distance between you and ${familyPhrase(goal)} will show up as effort — more out of your day than it takes out of someone whose profile sits closer to it.`,
    // Never omitted. A cost with no answer next to it is a verdict, and this
    // page does not get to hand down verdicts about someone's own goals.
    whatHelps: carrying
      ? `Lean on what is already carrying it — ${carrying}. Build the approach around those rather than around the parts that drain you.`
      : `Your profile doesn't point at one specific lever here. That's worth taking to a coach along with the numbers above, rather than guessing at an answer.`,
  }
}

function toMixed(goal: AlignmentGoal): MixedGoal {
  const opposing = describeDimensions(goal.drivers?.opposing)
  const score = goal.score === null ? null : num(goal.score)
  return {
    goal: goal.title,
    readsAs: score
      ? `You score ${score} out of 100 against ${familyPhrase(goal)} — close enough to be workable, far enough to cost you something.`
      : `A mixed read against ${familyPhrase(goal)} — workable, and not free.`,
    whatItCosts: opposing ? `Where the effort goes: ${opposing}.` : undefined,
  }
}

/**
 * The whole translation, in one function.
 *
 * Every goal the backend reports comes out somewhere. Nothing is filtered on the
 * way through — an `unmapped` goal becomes an unplaced row and an `unscored`
 * goal becomes an unscored one, because the alternative is a person's goal
 * silently absent from their own report.
 */
// Why the fast-refresh rule is waived for this one export: this is the single
// place the report's wording is decided, and it belongs beside the components
// that render it — an editor changing the tone should find the sentences and
// the markup in the same file. It is exported so it can be tested directly
// rather than only through rendered output. The cost is a full HMR reload when
// this file is edited, which is the right side of that trade.
// eslint-disable-next-line react-refresh/only-export-components
export function toReportView(payload: AlignmentResultPayload): AlignmentReport {
  const goals = payload.goals ?? []
  const by = (verdict: AlignmentGoal["verdict"]) =>
    goals.filter((goal) => goal.verdict === verdict)

  const unscored = by("unscored")

  return {
    supported: by("supported").map(toSupported),
    tensions: by("at-tension").map(toTension),
    // Empty on purpose — the backend scores goals individually and never pairs
    // them. See the note at the top of this file.
    conflicts: [],
    mixed: by("mixed").map(toMixed),
    unplaced: (payload.unmapped ?? []).map((goal) => ({
      goal: goal.title,
      why: goal.statement,
    })),
    unscored: unscored.length
      ? {
          goals: unscored.map((goal) => goal.title),
          why:
            unscored[0]?.statement ??
            "These are on file but there's no behavioural assessment to compare them against yet.",
        }
      : undefined,
    note: payload.note,
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Presentational pieces. Pure props in, markup out — no data fetching, so they
 * are independently testable and unaffected by how the report is fetched.
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

/** Workable and not free. Same register as the tension row, lower temperature. */
export function MixedGoalRow({ item }: { item: MixedGoal }) {
  return (
    <li className="flex gap-3 rounded-lg border border-sky-200/70 bg-sky-50/40 p-3">
      <Waves className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{item.goal}</p>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground/70">How it reads:</span>{" "}
          {item.readsAs}
        </p>
        {item.whatItCosts && (
          <p className="text-sm text-muted-foreground">{item.whatItCosts}</p>
        )}
      </div>
    </li>
  )
}

/**
 * A goal we couldn't place. Rendered, always — the alternative is dropping it.
 *
 * Worded so the limitation lands on us and not on the person. "We couldn't
 * place this" is a statement about our matcher; "your goal was too vague" is a
 * statement about them, and it isn't ours to make.
 */
export function UnplacedGoalRow({ item }: { item: UnplacedGoal }) {
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <FileQuestion
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-medium">{item.goal}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.why}</p>
      </div>
    </li>
  )
}

/**
 * The no-PRISM state, said plainly.
 *
 * Not a score, not a grey bar, not a zero. These goals were never measured, and
 * the only honest thing on the screen is the reason and the way to fix it.
 */
export function UnscoredNotice({
  item,
  onEstablish,
}: {
  item: UnscoredGoals
  onEstablish?: () => void
}) {
  return (
    <section
      aria-labelledby="alignment-unscored"
      className="rounded-lg border border-border bg-muted/40 p-4"
    >
      <div className="flex items-start gap-3">
        <CircleDashed
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 space-y-2">
          <h2 id="alignment-unscored" className="text-sm font-medium">
            Not scored yet — we need your PRISM first
          </h2>
          <p className="text-sm text-muted-foreground">
            {item.why} Nothing below is a low score; these goals simply
            haven&apos;t been measured against anything, and we&apos;d rather say
            that than show you a number we made up.
          </p>
          <ul className="space-y-1">
            {item.goals.map((goal, index) => (
              <li key={`${goal}-${index}`} className="text-sm font-medium">
                {goal}
              </li>
            ))}
          </ul>
          {onEstablish && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEstablish}
            >
              Take the PRISM assessment
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

/** The report itself, once there is one. Rendered by the page when data exists. */
export function AlignmentReportView({
  report,
  onEstablish,
}: {
  report: AlignmentReport
  onEstablish?: () => void
}) {
  const mixed = report.mixed ?? []
  const unplaced = report.unplaced ?? []

  return (
    <div className="space-y-6">
      {report.note && (
        <p className="text-sm text-muted-foreground">{report.note}</p>
      )}

      {/* First, because it explains why everything under it is thin. */}
      {report.unscored && (
        <UnscoredNotice item={report.unscored} onEstablish={onEstablish} />
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

      {mixed.length > 0 && (
        <section aria-labelledby="alignment-mixed">
          <h2 id="alignment-mixed" className="mb-2 text-sm font-medium">
            Goals that could go either way
          </h2>
          <ul className="space-y-2">
            {mixed.map((item, index) => (
              <MixedGoalRow key={`${item.goal}-${index}`} item={item} />
            ))}
          </ul>
        </section>
      )}

      {unplaced.length > 0 && (
        <section aria-labelledby="alignment-unplaced">
          <h2 id="alignment-unplaced" className="mb-2 text-sm font-medium">
            Goals we couldn&apos;t place
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">
            These are yours and they still count — our matcher just couldn&apos;t
            tell which kind of work they point at, so it declined to guess. That
            is a limit of ours, not a judgement on the goal.
          </p>
          <ul className="space-y-2">
            {unplaced.map((item, index) => (
              <UnplacedGoalRow key={`${item.goal}-${index}`} item={item} />
            ))}
          </ul>
        </section>
      )}

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

/**
 * The waiting state.
 *
 * The compute is genuinely slow — a behavioural profile hydrated, the goal store
 * read, every goal scored against nine career families — so this page waits for
 * real seconds and a bare spinner would read as a stall. It says what is
 * happening instead, and says the work survives leaving the page, because it
 * does.
 */
export function AlignmentWaiting() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          Reading your goals against your profile — this takes a moment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>Pulling the goals you set in the goal interview</li>
          <li>Reading your behavioural profile</li>
          <li>Scoring each goal against the nine career families</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          You can leave this page — it keeps going without you, and the result
          will be here when you come back.
        </p>
      </CardContent>
    </Card>
  )
}

/* ──────────────────────────────────────────────────────────────────────────── */

export default function AlignmentPage() {
  const navigate = useNavigate()
  const { phase, report, jobError, isStarting, start, storedFailed } =
    useAlignment()

  const view = report ? toReportView(report) : null
  const goEstablish = () => navigate(ROUTES.DIRECTION_SETTING.ESTABLISH)

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

      {phase === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Checking what we already have…
        </div>
      )}

      {phase === "waiting" && <AlignmentWaiting />}

      {phase === "failed" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              That run didn&apos;t finish
            </CardTitle>
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
            <Button type="button" onClick={start} disabled={isStarting}>
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "lost" && (
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
            <Button type="button" onClick={start} disabled={isStarting}>
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
              Start a new one
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "idle" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDashed
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              Nothing has been run yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {storedFailed && (
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t check whether you&apos;ve already run this —
                that&apos;s a fault on our side, not a sign there&apos;s nothing
                here. Running it again is safe either way.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This one is computed rather than stored, so it has to be asked for.
              It reads your goals and your behavioural profile and takes a little
              while — long enough that we hand it off and come back for it.
            </p>
            <p className="text-sm text-muted-foreground">
              You can run it now whatever state those two steps are in. It will
              tell you what it was missing rather than pretend it wasn&apos;t.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={start} disabled={isStarting}>
                Run the alignment
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
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

      {/* The report outlives the phase it was produced in: a failed re-run or a
          lost job id shouldn't take the last good answer off the screen. */}
      {view && phase !== "loading" && (
        <div className="space-y-4">
          {phase !== "ready" && (
            <p className="text-sm text-muted-foreground">
              Below is your most recent completed run.
            </p>
          )}
          <AlignmentReportView report={view} onEstablish={goEstablish} />
          {phase === "ready" && (
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={start}
                disabled={isStarting}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
                Run it again
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Worth doing after you change your goals or take a new
                assessment. Nothing else about this reads differently.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
