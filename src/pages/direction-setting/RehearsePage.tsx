import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  ClipboardCheck,
  Loader2,
  Mic,
  MessageSquareText,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ROUTES } from "@/constants/routes"
import { useAdvanceJourney } from "@/hooks/direction-setting/useJourney"

/**
 * Stage 12 — "Can I practise?"
 *
 * **The backend for this lands in Phase 6. Nothing here calls an endpoint, and
 * nothing here fabricates one.** What exists today is the real shell: the three
 * pieces a rehearsal is made of, rendered inert with an honest label, so that
 * when Phase 6 arrives the work is wiring data in rather than designing a page
 * from scratch.
 *
 * ## Notes for whoever builds Phase 6
 *
 * The obvious shortcut is to point this at **Maven** (`InterviewAgent`,
 * `services/agent-engine/app/agents/business/interview_agent.py`). Don't.
 * Maven is manager-gated and built to *evaluate* a candidate on someone else's
 * behalf — it produces a judgement about a person for a third party. A
 * rehearsal is the opposite transaction: it is the candidate's own private
 * practice, nobody is being assessed, and nothing said here should end up in a
 * record about them. Extending Maven would inherit both the role gate (which
 * locks out the exact users this stage is for) and the evaluative framing
 * (which makes practice feel like a test). This needs its own candidate-owned
 * path — most likely a Coaching-domain surface, with the same "never a verdict"
 * contract the rest of Direction Setting holds to.
 *
 * The seams below are deliberate:
 *   - `QuestionPrompt`  — one question, plus why it's being asked.
 *   - `AnswerInput`     — free text now; voice is the natural second input.
 *   - `FeedbackPanel`   — per-answer, arrives after an answer, never a score.
 * All three are pure presentational components taking props, so a Phase 6 hook
 * can drive them without touching their markup.
 */

/** One rehearsal question, with the reason it's worth practising. */
export function QuestionPrompt({
  question,
  why,
  index,
  total,
}: {
  question: string
  why?: string
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

/** The answer box. Controlled when a parent owns the value; inert when disabled. */
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
          disabled={disabled || isSubmitting || !value?.trim()}
        >
          {isSubmitting && (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
          )}
          Try this answer
        </Button>
        {/* Voice is the obvious second input for a rehearsal — a spoken answer
            is the thing being practised. Left visible and disabled so Phase 6
            has a placed affordance rather than a redesign. */}
        <Button type="button" variant="outline" size="sm" disabled>
          <Mic className="mr-1.5 h-4 w-4" aria-hidden />
          Answer out loud
        </Button>
      </div>
    </div>
  )
}

/**
 * Feedback on one answer. Never a mark out of ten — what landed, what to add,
 * and one thing to try next time. If this ever grows a score, that's the moment
 * it stopped being practice.
 */
export function FeedbackPanel({
  landed,
  missing,
  tryNext,
}: {
  landed?: string[]
  missing?: string[]
  tryNext?: string
}) {
  const empty = !landed?.length && !missing?.length && !tryNext
  if (empty) return null
  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          On that answer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!!landed?.length && (
          <div>
            <p className="font-medium">What came through</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {landed.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
        {!!missing?.length && (
          <div>
            <p className="font-medium">Worth adding</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {tryNext && (
          <div>
            <p className="font-medium">One thing to try next time</p>
            <p className="mt-1 text-muted-foreground">{tryNext}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function RehearsePage() {
  const navigate = useNavigate()
  const advance = useAdvanceJourney()

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

      {/* The honest state. No endpoint exists yet, so nothing here pretends to
          be live — the components below are shown for shape, not for use. */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <p className="text-sm font-medium">
            Rehearsal isn&apos;t switched on yet.
          </p>
          <p className="text-sm text-muted-foreground">
            We&apos;re building it now. When it&apos;s ready you&apos;ll answer a
            handful of questions drawn from your own prep sheet, and get a note
            back on each one — what came through, what was missing, one thing to
            try next time. It stays private to you.
          </p>
          <p className="text-sm text-muted-foreground">
            In the meantime, the prep sheet has the questions themselves. Reading
            an answer aloud to yourself gets you most of the way.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              onClick={() => navigate(ROUTES.DIRECTION_SETTING.INTERVIEW)}
            >
              <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden />
              Back to interview prep
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={advance.isPending}
              onClick={() =>
                advance.mutate(
                  // Marked "skipped", not "complete" — the journey should show
                  // this step as passed over, not as something they did.
                  { stageId: "12", state: "skipped" },
                  { onSuccess: () => navigate(ROUTES.DIRECTION_SETTING.JOURNEY) }
                )
              }
            >
              Skip this step
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shape preview — inert on purpose. See the file header for the Phase 6
          wiring notes. */}
      <section aria-labelledby="rehearse-preview">
        <h2
          id="rehearse-preview"
          className="mb-1 text-sm font-medium text-muted-foreground"
        >
          What it will look like
        </h2>
        <Card aria-describedby="rehearse-preview-note">
          <CardContent className="space-y-4 p-4 opacity-60">
            <QuestionPrompt
              index={1}
              total={5}
              question="Tell me about a time you had to get something done through people who didn't report to you."
              why="This role leans on coordinating across teams, and it's one of the areas your prep sheet flags."
            />
            <AnswerInput disabled />
            <FeedbackPanel
              landed={["A real situation, with your part in it clearly stated."]}
              missing={["What actually changed because of what you did."]}
              tryNext="Finish on the outcome rather than the effort — it's the part interviewers remember."
            />
          </CardContent>
        </Card>
        <p
          id="rehearse-preview-note"
          className="mt-2 text-xs text-muted-foreground"
        >
          Example only — not your answers, and not switched on yet.
        </p>
      </section>
    </div>
  )
}
