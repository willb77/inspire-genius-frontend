/**
 * Goals tab — Summit-powered, behind the member's goals grant.
 *
 * Renders formalized goals with WHY-root motivation, PRISM alignment,
 * execution style, success metric, reward-framed first step, owning coach,
 * and provisional/confirmed provenance — and, since the Goals offering
 * (Phase 4), the coach's side of the loop: reviews under each goal, a review
 * form (ratify + comment) the member reads back (D7), and a note-about-this-
 * goal composer that writes to the coaching notes store with goalId set.
 *
 * Three share states, none of them the empty list (plan §6 Phase 4, item 4):
 *   shared      → "Shared with you until <date>" and the goals
 *   not shared  → the member has not shared; nobody sees goals by rank
 *   no account  → a roster-only member cannot share; say so, no dead button
 * Plus the two Summit gates that predate them: prismNeeded → route to Aura;
 * goalsPending → invite CTA.
 *
 * Both audiences (manager, practitioner) render this identically — audience
 * only swaps the page chrome, never the tab. No conditionals on audience here.
 */
import { useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  CircleSlash,
  Lock,
  MessageSquarePlus,
  NotebookPen,
  Quote,
  Sparkles,
  UserX,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { QUADRANT_CONFIG, BEHAVIOUR_CONFIG } from "@/constants/prism"
import {
  GOAL_CATEGORY_LABEL,
  GOAL_HORIZON_LABEL,
  PRISM_ALIGNMENT_LABEL,
} from "@/constants/development"
import type {
  GoalCategory,
  GoalCategoryCoverage,
  GoalReview,
  PrismAlignment,
  SummitGoal,
} from "@/types/development"
import type { CoachingNoteKind } from "@/services/manager/development/growthService"
import {
  useCreateCoachingNote,
  useDevelopmentGoals,
  useGoalReviews,
  useGoalSession,
  useRatifyGoal,
} from "@/hooks/manager/development"
import { useDevSkin } from "../skin"

const CATEGORY_ORDER: GoalCategory[] = [
  "career_history",
  "current_job",
  "workplace_situation",
  "career_ambitions",
  "personal_goals",
]

const NOTE_KINDS: { value: CoachingNoteKind; label: string }[] = [
  { value: "observation", label: "Observation" },
  { value: "plan", label: "Plan" },
  { value: "outcome", label: "Outcome" },
]

/** "4 Sep 2026" from an ISO string; "" when there is none. */
export function formatShareDate(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function CoverageStrip({ coverage }: { coverage: GoalCategoryCoverage[] }) {
  const sk = useDevSkin()
  const byCat = new Map(coverage.map((c) => [c.category, c.state]))
  const stateColor: Record<string, string> = {
    covered: "bg-emerald-500",
    in_progress: "bg-amber-400",
    not_started: "bg-slate-200",
  }
  return (
    <div className="flex flex-wrap gap-2" aria-label="Discovery coverage by category">
      {CATEGORY_ORDER.map((cat) => {
        const state = byCat.get(cat) ?? "not_started"
        return (
          <div key={cat} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", sk.border200, sk.text600)}>
            <span className={cn("h-2 w-2 rounded-full", stateColor[state])} aria-hidden="true" />
            {GOAL_CATEGORY_LABEL[cat]}
            <span className="sr-only"> — {state.replace("_", " ")}</span>
          </div>
        )
      })}
    </div>
  )
}

function AlignmentBadge({ alignment }: { alignment: PrismAlignment }) {
  const sk = useDevSkin()
  const parts: string[] = []
  if (alignment.dimensions?.length) {
    parts.push(alignment.dimensions.map((d) => BEHAVIOUR_CONFIG[d]?.label ?? `Dim ${d}`).join(", "))
  }
  if (alignment.quadrant) parts.push(`${QUADRANT_CONFIG[alignment.quadrant].label} quadrant`)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="gap-1">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {PRISM_ALIGNMENT_LABEL[alignment.kind]}
      </Badge>
      {parts.length > 0 ? <span className={cn("text-xs", sk.text500)}>{parts.join(" · ")}</span> : null}
    </div>
  )
}

/** The reviews coaches have written on one goal — the same list the member sees. */
function ReviewList({ reviews }: { reviews: GoalReview[] }) {
  const sk = useDevSkin()
  if (reviews.length === 0) return null
  return (
    <ul className="space-y-2" aria-label="Reviews of this goal">
      {reviews.map((r) => (
        <li key={r.id} className={cn("rounded-lg border p-2.5 text-xs", sk.border200)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-semibold", sk.text700)}>{r.reviewerName || "A coach"}</span>
            <Badge variant={r.ratified ? "default" : "secondary"} className="gap-1">
              {r.ratified ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <CircleSlash className="h-3 w-3" aria-hidden="true" />}
              {r.ratified ? "Ratified" : "Not ratified"}
            </Badge>
            <span className={cn("ml-auto", sk.text400)}>{formatShareDate(r.createdAt)}</span>
          </div>
          {r.comment ? <p className={cn("mt-1", sk.text700)}>{r.comment}</p> : null}
        </li>
      ))}
    </ul>
  )
}

export type ReviewSubmit = (input: { goalId: string; ratified: boolean; comment: string }) => void

/**
 * Ratify + comment. Replaces the bare Co-ratify button: a review the member
 * cannot read is not coaching (D7). Success is only ever reported by the
 * caller, after the mutation settles — this form never toasts on its own.
 */
function ReviewForm({
  goalId,
  onSubmit,
  pending,
}: {
  goalId: string
  onSubmit: ReviewSubmit
  pending: boolean
}) {
  const sk = useDevSkin()
  const [ratified, setRatified] = useState(true)
  const [comment, setComment] = useState("")
  return (
    <form
      className={cn("space-y-2 rounded-lg border p-2.5", sk.border200)}
      aria-label="Review this goal"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ goalId, ratified, comment: comment.trim() })
        setComment("")
      }}
    >
      <label className={cn("flex items-center gap-2 text-xs font-medium", sk.text700)}>
        <Checkbox checked={ratified} onCheckedChange={(v) => setRatified(v === true)} aria-label="Ratify this goal" />
        Ratify this goal
      </label>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What you see in this goal, and what would make it stronger. The member reads this."
        rows={2}
        className="text-sm"
        aria-label="Review comment"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <MessageSquarePlus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {pending ? "Sending…" : "Send review"}
        </Button>
        <span className={cn("text-[11px]", sk.text400)}>Coaches co-sign — the member’s own ratification is never overwritten.</span>
      </div>
    </form>
  )
}

export type NoteSubmit = (input: { goalId: string; kind: CoachingNoteKind; body: string }) => void

/** The note-about-this-goal composer: opens the coaching-notes store with goalId set. */
function NoteComposer({
  goalId,
  onSubmit,
  pending,
}: {
  goalId: string
  onSubmit: NoteSubmit
  pending: boolean
}) {
  const sk = useDevSkin()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<CoachingNoteKind>("observation")
  const [body, setBody] = useState("")
  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <NotebookPen className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Note about this goal
      </Button>
    )
  }
  return (
    <form
      className={cn("space-y-2 rounded-lg border p-2.5", sk.border200)}
      aria-label="Note about this goal"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ goalId, kind, body: body.trim() })
        setBody("")
        setOpen(false)
      }}
    >
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Note kind">
        {NOTE_KINDS.map((k) => (
          <Button
            key={k.value}
            type="button"
            size="sm"
            variant={kind === k.value ? "default" : "outline"}
            role="radio"
            aria-checked={kind === k.value}
            onClick={() => setKind(k.value)}
          >
            {k.label}
          </Button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Your own note. Only you see coaching notes."
        rows={2}
        className="text-sm"
        aria-label="Note body"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || body.trim().length === 0}>
          {pending ? "Saving…" : "Save note"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

/**
 * The goal card a coach sees. Exported (Goals offering, Phase 3) so the
 * member's sharing panel can render "what they see" with THIS component —
 * a redrawn preview would drift from the real card within a release.
 *
 * `onReview` / `onNote` are the coach's controls (Phase 4). The preview
 * passes neither and gets the read-only card with the legacy Co-ratify
 * affordance, which is what the member is being shown "they see".
 */
export function CoachGoalCard({
  goal,
  onRatify,
  ratifying,
  reviews = [],
  onReview,
  reviewing = false,
  onNote,
  noting = false,
}: {
  goal: SummitGoal
  onRatify: (goalId: string) => void
  ratifying: boolean
  reviews?: GoalReview[]
  onReview?: ReviewSubmit
  reviewing?: boolean
  onNote?: NoteSubmit
  noting?: boolean
}) {
  const sk = useDevSkin()
  const confirmed = goal.status === "confirmed"
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={cn("text-base", sk.heading)}>{goal.title}</CardTitle>
          <Badge variant={confirmed ? "default" : "secondary"} className="shrink-0 gap-1">
            {confirmed ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : null}
            {confirmed ? "Confirmed" : "Provisional"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">{GOAL_CATEGORY_LABEL[goal.category]}</Badge>
          <Badge variant="outline">{GOAL_HORIZON_LABEL[goal.horizon]}</Badge>
          <Badge variant="outline">Coach: {goal.ownerCoach}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className={cn("text-xs font-semibold", sk.text500)}>Why it matters</div>
          <p className={sk.text700}>{goal.motivation}</p>
        </div>
        <AlignmentBadge alignment={goal.prismAlignment} />
        {goal.prismAlignment.note ? (
          <p className={cn("text-xs", sk.text500)}>{goal.prismAlignment.note}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className={cn("text-xs font-semibold", sk.text500)}>Execution style</div>
            <p className={sk.text700}>{goal.executionStyle}</p>
          </div>
          <div>
            <div className={cn("text-xs font-semibold", sk.text500)}>Success metric</div>
            <p className={sk.text700}>{goal.successMetric}</p>
          </div>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2.5">
          <div className="text-xs font-semibold text-emerald-700">Reward-framed first step</div>
          <p className="text-emerald-800">{goal.firstStep}</p>
        </div>
        {goal.provenanceQuotes.length > 0 ? (
          <details className={cn("text-xs", sk.text500)}>
            <summary className="cursor-pointer font-medium">Provenance ({goal.provenanceQuotes.length})</summary>
            <ul className="mt-1 space-y-1">
              {goal.provenanceQuotes.map((q, i) => (
                <li key={i} className="flex gap-1.5">
                  <Quote className={cn("mt-0.5 h-3 w-3 shrink-0", sk.text400)} aria-hidden="true" />
                  <span className="italic">“{q}”</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <ReviewList reviews={reviews} />
        {onReview ? (
          <ReviewForm goalId={goal.goalId} onSubmit={onReview} pending={reviewing} />
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => onRatify(goal.goalId)} disabled={ratifying}>
              <MessageSquarePlus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Co-ratify
            </Button>
            <span className={cn("text-[11px]", sk.text400)}>Managers co-sign — the member’s own ratification is never overwritten.</span>
          </div>
        )}
        {onNote ? <NoteComposer goalId={goal.goalId} onSubmit={onNote} pending={noting} /> : null}
      </CardContent>
    </Card>
  )
}

/** A dashed state card — the shape every non-list state on this tab takes. */
function StateCard({
  icon,
  title,
  body,
  children,
  testId,
}: {
  icon: React.ReactNode
  title: string
  body: string
  children?: React.ReactNode
  testId: string
}) {
  const sk = useDevSkin()
  return (
    <Card className="border-dashed" data-testid={testId}>
      <CardContent className="flex flex-col items-start gap-3 p-6">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className={cn("text-base font-semibold", sk.text800)}>{title}</h3>
        </div>
        <p className={cn("text-sm", sk.text500)}>{body}</p>
        {children}
      </CardContent>
    </Card>
  )
}

export type GoalsPanelProps = {
  memberId: string
  /** For the sentences in the not-shared states; "This member" when absent. */
  memberName?: string
}

export function GoalsPanel({ memberId, memberName }: GoalsPanelProps) {
  const sk = useDevSkin()
  const { data, isLoading } = useDevelopmentGoals(memberId)
  const session = useGoalSession(memberId)
  const ratify = useRatifyGoal(memberId)
  const note = useCreateCoachingNote(memberId)
  const goals = data?.goals ?? []
  const coverage = data?.coverage ?? []
  const shared = Boolean(data) && !data?.goalsNotShared
  const reviews = useGoalReviews(memberId, shared && goals.length > 0)
  const who = memberName?.trim() || "This member"

  if (isLoading) {
    return <div className={cn("py-10 text-center text-sm", sk.text400)}>Loading goals…</div>
  }

  // No IG account: a roster-only member cannot sign in, cannot offer.
  if (data?.goalsNotShared && data?.goalsNoAccount) {
    return (
      <StateCard
        testId="goals-state-no-account"
        icon={<UserX className={cn("h-5 w-5", sk.text400)} aria-hidden="true" />}
        title="No IG account yet"
        body={`${who} was added to the roster by hand and has no Inspires Genius account. Goals are shared by the person who owns them, so there is nothing to ask for until they have one.`}
      />
    )
  }

  // Not shared: nobody sees goals by rank (D6, D9).
  if (data?.goalsNotShared) {
    return (
      <StateCard
        testId="goals-state-not-shared"
        icon={<Lock className={cn("h-5 w-5", sk.text400)} aria-hidden="true" />}
        title="Not shared with you"
        body={`${who} has not shared their goals with you. Nobody sees goals by rank — they choose, person by person, from Goals › Sharing in their own workspace. Ask them directly.`}
      />
    )
  }

  // PRISM-needed gate
  if (data?.prismNeeded) {
    return (
      <StateCard
        testId="goals-state-prism-needed"
        icon={<Sparkles className={cn("h-5 w-5", sk.text400)} aria-hidden="true" />}
        title="PRISM needed"
        body="Set this member up with Aura to map their PRISM profile before goal discovery can begin."
      >
        <Button onClick={() => session.mutate("invite")} disabled={session.isPending}>
          Set up with Aura
        </Button>
      </StateCard>
    )
  }

  const sharedUntil = formatShareDate(data?.goalsSharedUntil)
  const shareLine = (
    <p className={cn("text-xs", sk.text500)} data-testid="goals-state-shared">
      <Lock className="mr-1 inline h-3 w-3" aria-hidden="true" />
      {sharedUntil ? `Shared with you until ${sharedUntil}.` : "Shared with you."} The member can take this back at any time.
    </p>
  )

  // Goals-pending gate
  if (data?.goalsPending || goals.length === 0) {
    return (
      <div className="space-y-4">
        {shareLine}
        <CoverageStrip coverage={coverage} />
        <StateCard
          testId="goals-state-pending"
          icon={<Sparkles className={cn("h-5 w-5", sk.text400)} aria-hidden="true" />}
          title="No goals discovered yet"
          body="Invite this member to a Goals Studio discovery session to formalize their goals."
        >
          <Button onClick={() => session.mutate("invite")} disabled={session.isPending}>
            Invite to Goals Studio session
          </Button>
        </StateCard>
      </div>
    )
  }

  const reviewsByGoal = new Map<string, GoalReview[]>()
  for (const r of reviews.data?.reviews ?? []) {
    reviewsByGoal.set(r.goalId, [...(reviewsByGoal.get(r.goalId) ?? []), r])
  }

  const submitReview: ReviewSubmit = ({ goalId, ratified, comment }) => {
    ratify.mutate(
      { goalId, ratified, comment },
      {
        onSuccess: () => toast.success(ratified ? "Review sent — goal ratified." : "Review sent."),
        onError: (err) => toast.error(err.message || "The review could not be saved."),
      },
    )
  }
  const submitNote: NoteSubmit = ({ goalId, kind, body }) => {
    note.mutate(
      { goalId, kind, body, source: "manual" },
      {
        onSuccess: () => toast.success("Note saved."),
        onError: (err) => toast.error(err.message || "The note could not be saved."),
      },
    )
  }

  return (
    <div className="space-y-4">
      {shareLine}
      {/* "Continue session" lives in the Meridian panel header now. */}
      <CoverageStrip coverage={coverage} />
      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => (
          <CoachGoalCard
            key={goal.goalId}
            goal={goal}
            onRatify={(goalId) => ratify.mutate({ goalId })}
            ratifying={ratify.isPending}
            reviews={reviewsByGoal.get(goal.goalId) ?? []}
            onReview={submitReview}
            reviewing={ratify.isPending}
            onNote={submitNote}
            noting={note.isPending}
          />
        ))}
      </div>
    </div>
  )
}
