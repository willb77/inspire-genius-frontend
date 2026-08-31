import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  ClipboardCheck,
  Loader2,
  Lock,
  Mic,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ROUTES } from "@/constants/routes"
import { useAdvanceJourney } from "@/hooks/direction-setting/useJourney"
import { useRehearsal } from "@/hooks/direction-setting/useRehearsal"
import type {
  RehearsalFeedback,
  RehearsalSession,
  RehearsalTurn,
} from "@/types/direction-setting"

/**
 * Stage 12 — "Can I practise?"
 *
 * The last stage, and the only optional one. Somebody may well arrive here
 * unemployed, rehearsing for a job they need, so the register throughout is
 * practice rather than assessment — and that is a contract, not a tone.
 *
 * ## Three things this page must never grow
 *
 * 1. **A number that reads as a quality.** No score, no star rating, no "4 of 6
 *    answered well", no progress-as-performance bar. A question counter is fine
 *    and expected. The backend deliberately composes no digit into any feedback
 *    sentence; a surface that adds one has rebuilt the evaluation tool this
 *    stage was carefully built not to be.
 * 2. **A rewritten self-advocacy line.** `feedback.youAlreadyHave` is one of the
 *    person's own lines, generated upstream to never name a PRISM dimension or
 *    quote a score. It is rendered verbatim, with no label in front of it —
 *    labelling it "Strength" turns the one plain sentence here back into a
 *    rubric.
 * 3. **A validation error on an empty answer.** "Nothing came out" is a real
 *    thing that happens, most often on the questions that matter, and it has its
 *    own kind response server-side. The submit button is never disabled for it.
 *
 * ## The wiring, and why it looks nothing like stages 6, 9 and 10
 *
 * Answering is **synchronous**: `POST .../answers` returns the feedback. Nothing
 * on this page waits on a job for the thing the person came for. `useRehearsal`
 * does poll one job — Nova re-saying that same feedback more warmly — but it is
 * a progressive enhancement that swaps the text in if it arrives and costs
 * nothing if it never does. No phase, no spinner and no button here depends on
 * it.
 *
 * The three presentational components below stay exported and prop-driven, as
 * they were built: they are the seams a voice input or a coach-side read-only
 * view would attach to.
 */

/** One rehearsal question, with the reason it's worth practising. */
export function QuestionPrompt({
  question,
  why,
  index,
  total,
}: {
  question: string
  why?: string | null
  index?: number
  total?: number
}) {
  return (
    <div>
      {typeof index === "number" && typeof total === "number" && (
        <p className="mb-1 text-xs text-muted-foreground">
          Question {index} of {total}
        </p>
      )}
      <p className="flex items-start gap-2 font-medium">
        <MessageSquareText
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          aria-hidden
        />
        <span>{question}</span>
      </p>
      {why && <p className="mt-1.5 text-sm text-muted-foreground">{why}</p>}
    </div>
  )
}

/**
 * The answer box.
 *
 * The submit button is **never disabled for an empty answer** — it changes what
 * it says instead. Blocking submit would turn the most common honest outcome
 * ("nothing came out") into a form error, which is the one register this stage
 * cannot afford.
 */
export function AnswerInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isSubmitting = false,
  placeholder = "Say it the way you'd actually say it — no need to polish.",
}: {
  value?: string
  onChange?: (next: string) => void
  onSubmit?: () => void
  disabled?: boolean
  isSubmitting?: boolean
  placeholder?: string
}) {
  const blank = !value?.trim()
  return (
    <div className="space-y-2">
      <Textarea
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        rows={5}
        aria-label="Your answer"
        placeholder={placeholder}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={disabled || isSubmitting}
        >
          {isSubmitting && (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
          )}
          {blank ? "Nothing came to mind" : "Try this answer"}
        </Button>
        {/* Voice is the obvious second input for a rehearsal — a spoken answer
            is the thing being practised. Still a placed affordance rather than a
            promise: there is no voice path for this stage yet. */}
        <Button type="button" variant="outline" size="sm" disabled>
          <Mic className="mr-1.5 h-4 w-4" aria-hidden />
          Answer out loud
        </Button>
      </div>
      {blank && !disabled && (
        <p className="text-xs text-muted-foreground">
          You can send this blank. Drawing one is an answer too, and it gets a
          reply rather than a complaint.
        </p>
      )}
    </div>
  )
}

/**
 * Feedback on one answer. Never a mark out of ten — what's there, one thing to
 * try, and one of the person's own lines to walk in with.
 *
 * When Nova's warmer wording landed (`phrasing: "specialist"`) it replaces the
 * two derived sentences, since it says the same finding. The self-advocacy line
 * is still rendered underneath unless that prose already quotes it — verbatim
 * either way.
 */
export function FeedbackPanel({
  feedback,
}: {
  feedback?: RehearsalFeedback | null
}) {
  if (!feedback) return null

  const warm = feedback.phrasing === "specialist" && !!feedback.statement.trim()
  const advocacy = feedback.youAlreadyHave?.trim() || null
  const advocacyInProse = !!(
    warm &&
    advocacy &&
    feedback.statement.includes(advocacy)
  )

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          On that answer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {warm ? (
          <p className="text-muted-foreground">{feedback.statement}</p>
        ) : (
          <>
            <p className="text-muted-foreground">{feedback.noticed}</p>
            <div>
              <p className="font-medium">One thing to try next time</p>
              <p className="mt-1 text-muted-foreground">{feedback.tryThis}</p>
            </div>
          </>
        )}

        {/* Their own words, unlabelled and unedited. */}
        {advocacy && !advocacyInProse && (
          <p className="border-l-2 border-primary/40 pl-3 text-muted-foreground italic">
            {advocacy}
          </p>
        )}

        {feedback.note && (
          <p className="text-xs text-muted-foreground/80">{feedback.note}</p>
        )}
      </CardContent>
    </Card>
  )
}

/** What has been answered so far, for someone who wants to look back over it. */
function Transcript({ turns }: { turns: RehearsalTurn[] }) {
  if (!turns.length) return null
  return (
    <section aria-labelledby="rehearse-transcript">
      <h2 id="rehearse-transcript" className="mb-2 text-sm font-medium">
        What you said
      </h2>
      <ul className="space-y-3">
        {turns.map((turn) => (
          <li key={turn.index}>
            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="text-sm font-medium">{turn.question.prompt}</p>
                {turn.answer ? (
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {turn.answer}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    You left this one blank.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {turn.feedback?.tryThis}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The privacy controls, stated rather than buried.
 *
 * All three promises the backend actually keeps, in the order somebody worries
 * about them: nobody sees this, it goes away on its own, and you can make it go
 * away now. Sharing renders **off unless the server says otherwise** — opting
 * out is never the action required.
 */
function PrivacyPanel({
  session,
  isSavingSharing,
  isDeleting,
  onSharingChange,
  onDelete,
}: {
  session: RehearsalSession
  isSavingSharing: boolean
  isDeleting: boolean
  onSharingChange: (shared: boolean) => void
  onDelete: () => void
}) {
  const shared = session.sharedWithCoach === true
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
          This transcript is yours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor="rehearse-sharing" className="font-medium">
              Share this with a coach
            </label>
            <p className="mt-0.5 text-muted-foreground">
              {shared
                ? "On. A coach you work with can read these answers. Turn it off whenever you like."
                : "Off. Nobody else can see these answers — not a coach, not your employer."}
            </p>
          </div>
          <Switch
            id="rehearse-sharing"
            checked={shared}
            disabled={isSavingSharing}
            onCheckedChange={onSharingChange}
            aria-label="Share this with a coach"
          />
        </div>

        <p className="text-muted-foreground">
          Kept for {session.retentionDays} days after you last use it, then
          deleted on its own. Coming back to it starts that clock again.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" disabled={isDeleting}>
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
              Delete this rehearsal
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this rehearsal?</AlertDialogTitle>
              <AlertDialogDescription>
                The questions, your answers and the feedback on them are removed —
                not hidden, not archived. Your journey still shows you did this
                step. There is no undo, which is the point.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete it</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

export default function RehearsePage() {
  const navigate = useNavigate()
  const advance = useAdvanceJourney()
  const {
    phase,
    session,
    currentQuestion,
    lastFeedback,
    note,
    justDeleted,
    isStarting,
    isAnswering,
    isFinishing,
    isDeleting,
    isSavingSharing,
    start,
    answer,
    finish,
    setSharing,
    remove,
    actionError,
  } = useRehearsal()

  const [draft, setDraft] = useState("")

  /* Clear the box once the server has moved the cursor on — never before. A
     draft cleared optimistically is a draft lost when the write fails. */
  const cursor = session?.questionIndex ?? -1
  const rehearsalId = session?.rehearsalId ?? null
  useEffect(() => {
    setDraft("")
  }, [cursor, rehearsalId])

  const skip = () =>
    advance.mutate(
      // Marked "skipped", not "complete" — the journey should show this step as
      // passed over, not as something they did.
      { stageId: "12", state: "skipped" },
      { onSuccess: () => navigate(ROUTES.DIRECTION_SETTING.JOURNEY) }
    )

  const toPrep = () => navigate(ROUTES.DIRECTION_SETTING.INTERVIEW)

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Practising out loud</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Knowing what you want to say and being able to say it under mild
          pressure are two different skills. This step is for the second one —
          answering a few likely questions and getting a read on how the answer
          lands, in private, with nobody keeping score.
        </p>
        <p className="mt-3 max-w-2xl rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">This step is optional.</span>{" "}
          Plenty of people go straight from the prep sheet to the interview and do
          just fine. Skipping it doesn&apos;t leave a hole in anything.
        </p>
      </header>

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {phase === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Looking for anything you&apos;ve already practised…
        </div>
      )}

      {phase === "failed" && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t load your rehearsal just now. Refresh to try again —
              nothing you&apos;ve answered has been lost.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Deleted, or aged out. Nothing to recover and nothing to apologise for. */}
      {phase === "gone" && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm font-medium">
              That rehearsal isn&apos;t there any more.
            </p>
            <p className="text-sm text-muted-foreground">
              It was either deleted or it aged out. There&apos;s nothing to recover
              — and starting a new one takes a minute.
            </p>
            <Button type="button" onClick={() => start(true)} disabled={isStarting}>
              {isStarting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              )}
              Start a new one
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No interview guide yet. Not an error, and not something they did wrong. */}
      {phase === "unavailable" && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm font-medium">Nothing to rehearse against yet.</p>
            <p className="text-sm text-muted-foreground">
              {note ??
                "There is no interview guide on file yet, so there is nothing to rehearse against. Stage 11 builds one out of your own gaps against the role you are targeting."}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={toPrep}>
                <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden />
                Build my prep sheet
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={advance.isPending}
                onClick={skip}
              >
                Skip this step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "idle" && (
        <Card>
          <CardContent className="space-y-3 p-6">
            {justDeleted && (
              <p className="text-sm font-medium">
                Deleted. Your answers and the feedback on them are gone.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              You&apos;ll get a handful of questions drawn from your own prep sheet,
              one at a time. Answer each one the way you&apos;d actually say it, and
              you&apos;ll get a note back — what&apos;s there, and one thing to try
              next time. Nothing is scored, and you can stop after any question.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={() => start()} disabled={isStarting}>
                {isStarting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                )}
                Start rehearsing
              </Button>
              <Button type="button" variant="outline" onClick={toPrep}>
                <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden />
                Back to interview prep
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={advance.isPending}
                onClick={skip}
              >
                Skip this step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "active" && session && (
        <>
          <Card>
            <CardContent className="space-y-4 p-4">
              {session.roleTitle && (
                <p className="text-xs text-muted-foreground">
                  Practising for {session.roleTitle}
                </p>
              )}

              {currentQuestion ? (
                <QuestionPrompt
                  index={currentQuestion.index + 1}
                  total={session.questionCount}
                  question={currentQuestion.prompt}
                  why={currentQuestion.note}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  That&apos;s every question in this set.
                </p>
              )}

              {currentQuestion && (
                <AnswerInput
                  value={draft}
                  onChange={setDraft}
                  onSubmit={() => answer(draft)}
                  isSubmitting={isAnswering}
                />
              )}

              <p className="text-xs text-muted-foreground">{session.note}</p>
            </CardContent>
          </Card>

          <FeedbackPanel feedback={lastFeedback} />

          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={finish}
              disabled={isFinishing}
            >
              Stop here — keep what I&apos;ve done
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Stopping counts as done. This step can&apos;t be failed, and the ones
              you answered still count.
            </p>
          </div>

          <PrivacyPanel
            session={session}
            isSavingSharing={isSavingSharing}
            isDeleting={isDeleting}
            onSharingChange={setSharing}
            onDelete={remove}
          />
        </>
      )}

      {phase === "complete" && session && (
        <>
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-medium">That&apos;s the practice done.</p>
              <p className="text-sm text-muted-foreground">
                You answered {session.answered} of the {session.questionCount}{" "}
                questions{session.roleTitle ? ` for ${session.roleTitle}` : ""}.
              </p>
              <p className="text-sm text-muted-foreground">{session.note}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  onClick={() => start(true)}
                  disabled={isStarting}
                >
                  {isStarting ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                  )}
                  Go again
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(ROUTES.DIRECTION_SETTING.JOURNEY)}
                >
                  Back to the journey
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>

          <FeedbackPanel feedback={lastFeedback} />

          <Transcript turns={session.turns} />

          <PrivacyPanel
            session={session}
            isSavingSharing={isSavingSharing}
            isDeleting={isDeleting}
            onSharingChange={setSharing}
            onDelete={remove}
          />
        </>
      )}
    </div>
  )
}
