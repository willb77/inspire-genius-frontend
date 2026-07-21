import { useEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessagesSquare,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ROUTES } from "@/constants/routes"
import { useCreateTaxonomyNode } from "@/hooks/knowledge-continuity/useCreateTaxonomyNode"
import { useStartCaptureSession } from "@/hooks/knowledge-continuity/useStartCaptureSession"
import { useNextQuestion } from "@/hooks/knowledge-continuity/useNextQuestion"
import { useRecordTurn } from "@/hooks/knowledge-continuity/useRecordTurn"
import { useExtractUnits } from "@/hooks/knowledge-continuity/useExtractUnits"
import { useSynthesizeUnits } from "@/hooks/knowledge-continuity/useSynthesizeUnits"
import type { ExtractedUnit, TranscriptExchange } from "@/types/knowledge-continuity"

// Capture sessions started from this front door are grouped under a stable
// org key — the AuthUser carries no organization, and the Reviewer Console's
// intake form likewise takes org_id as a plain field.
const CAPTURE_ORG_ID = "kce-capture"

type Step = "setup" | "interview" | "done"

/** Everything the interview + synthesis steps need, fixed once setup succeeds. */
type CaptureContext = {
  roleTitle: string
  captureArea: string
  sessionId: string
  taxonomyNodeId: string
}

// ── Step 1: setup form ────────────────────────────────────────────────────────

const setupSchema = z
  .object({
    role_title: z.string().min(1, "Tell us the role"),
    capture_area: z.string().min(1, "Name the task or responsibility to capture"),
    expert_name: z.string().min(1, "Who is sharing their know-how?"),
    real_expert: z.boolean(),
    consent_event_id: z.string().optional(),
  })
  .refine(
    (values) => !values.real_expert || (values.consent_event_id?.trim().length ?? 0) > 0,
    {
      message: "A consent record id is required for a real expert.",
      path: ["consent_event_id"],
    }
  )

type SetupFormValues = z.infer<typeof setupSchema>

function SetupStep({ onReady }: { onReady: (ctx: CaptureContext) => void }) {
  const createTaxonomy = useCreateTaxonomyNode()
  const startSession = useStartCaptureSession()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      role_title: "",
      capture_area: "",
      expert_name: "",
      real_expert: false,
      consent_event_id: "",
    },
  })

  const realExpert = watch("real_expert")
  const isSettingUp = createTaxonomy.isPending || startSession.isPending

  async function onSubmit(values: SetupFormValues) {
    try {
      // 1) Create the taxonomy node (the task being mined) …
      const node = await createTaxonomy.mutateAsync({
        org_id: CAPTURE_ORG_ID,
        role_title: values.role_title.trim(),
        name: values.capture_area.trim(),
        node_type: "task",
      })
      // 2) … then open the capture session against it. A real expert without a
      // consent id is rejected server-side (403) — the hook toasts that clearly.
      const session = await startSession.mutateAsync({
        org_id: CAPTURE_ORG_ID,
        expert_user_id: values.expert_name.trim(),
        role_title: values.role_title.trim(),
        is_synthetic: !values.real_expert,
        consent_event_id: values.real_expert
          ? values.consent_event_id?.trim() || undefined
          : undefined,
        taxonomy_id: node.id,
      })
      onReady({
        roleTitle: values.role_title.trim(),
        captureArea: values.capture_area.trim(),
        sessionId: session.id,
        taxonomyNodeId: node.id,
      })
    } catch {
      // Errors already surfaced by the mutation hooks — stay on the setup step.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Set up the capture</CardTitle>
        <CardDescription>
          Tell us whose know-how we&apos;re capturing and which task to focus on. Then Maven
          interviews the expert one question at a time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="capture-role-title">Role</Label>
            <Input
              id="capture-role-title"
              placeholder="e.g. Senior Water Treatment Operator"
              {...register("role_title")}
            />
            {errors.role_title && (
              <p className="text-xs text-red-600">{errors.role_title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capture-area">Task or responsibility to capture</Label>
            <Input
              id="capture-area"
              placeholder="e.g. Recover the plant after a power failure"
              {...register("capture_area")}
            />
            {errors.capture_area && (
              <p className="text-xs text-red-600">{errors.capture_area.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capture-expert-name">Expert</Label>
            <Input
              id="capture-expert-name"
              placeholder="Name of the person sharing their know-how"
              {...register("expert_name")}
            />
            {errors.expert_name && (
              <p className="text-xs text-red-600">{errors.expert_name.message}</p>
            )}
          </div>

          <Controller
            control={control}
            name="real_expert"
            render={({ field }) => (
              <div className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id="capture-real-expert"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="capture-real-expert" className="font-medium">
                    This is a real expert (not a practice run)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Real captures need a consent record on file before they can start. Leave
                    this off for a practice or volunteer run.
                  </p>
                </div>
              </div>
            )}
          />

          {realExpert && (
            <div className="space-y-1.5">
              <Label htmlFor="capture-consent-id">Consent record id</Label>
              <Input
                id="capture-consent-id"
                placeholder="The id of the signed consent on file"
                {...register("consent_event_id")}
              />
              {errors.consent_event_id && (
                <p className="text-xs text-red-600">{errors.consent_event_id.message}</p>
              )}
            </div>
          )}

          <Button type="submit" disabled={isSettingUp} className="gap-1.5">
            {isSettingUp ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Start the interview
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 2: interview ─────────────────────────────────────────────────────────

function InterviewStep({
  ctx,
  onFinish,
  isFinishing,
}: {
  ctx: CaptureContext
  onFinish: (transcript: TranscriptExchange[]) => void
  isFinishing: boolean
}) {
  const nextQuestion = useNextQuestion()
  const recordTurn = useRecordTurn()

  const [transcript, setTranscript] = useState<TranscriptExchange[]>([])
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [coverageNote, setCoverageNote] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState("")

  // Guard against React 18 StrictMode double-invoking the first-question effect.
  const firstRequested = useRef(false)

  function applyQuestion(data: { question: string; coverage_note: string | null }) {
    setPendingQuestion(data.question)
    setCoverageNote(data.coverage_note)
  }

  const node = { name: ctx.captureArea, node_type: "task" }

  // Ask Maven to open the interview once, on entry.
  useEffect(() => {
    if (firstRequested.current) return
    firstRequested.current = true
    nextQuestion.mutate(
      { role_title: ctx.roleTitle, node, transcript: [], is_first: true },
      { onSuccess: applyQuestion }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submitAnswer() {
    const answer = answerText.trim()
    if (!pendingQuestion || answer.length === 0 || nextQuestion.isPending) return

    const exchange: TranscriptExchange = { question: pendingQuestion, answer }
    const nextTranscript = [...transcript, exchange]
    setTranscript(nextTranscript)
    setPendingQuestion(null)
    setCoverageNote(null)
    setAnswerText("")

    // Persist the exchange so nothing is lost if the expert stops here.
    recordTurn.mutate({
      sessionId: ctx.sessionId,
      body: {
        taxonomy_node_id: ctx.taxonomyNodeId,
        question: exchange.question,
        response: exchange.answer,
      },
    })

    nextQuestion.mutate(
      { role_title: ctx.roleTitle, node, transcript: nextTranscript, is_first: false },
      { onSuccess: applyQuestion }
    )
  }

  function retryQuestion() {
    nextQuestion.mutate(
      {
        role_title: ctx.roleTitle,
        node,
        transcript,
        is_first: transcript.length === 0,
      },
      { onSuccess: applyQuestion }
    )
  }

  const waitingForQuestion = nextQuestion.isPending
  const questionFailed = nextQuestion.isError && !pendingQuestion && !waitingForQuestion
  const canFinish = transcript.length >= 1 && !isFinishing

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{ctx.captureArea}</CardTitle>
          <CardDescription>
            {ctx.roleTitle} · Answer in your own words. Maven follows up on what you say.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Running transcript */}
          {transcript.length > 0 && (
            <ul className="space-y-4">
              {transcript.map((exchange, i) => (
                <li key={i} className="space-y-2">
                  <div className="flex gap-2">
                    <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#127A8A]" />
                    <p className="text-sm font-medium text-foreground">{exchange.question}</p>
                  </div>
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-foreground">
                    {exchange.answer}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {/* Current question / thinking / retry */}
          {waitingForQuestion && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Maven is thinking…
            </div>
          )}

          {questionFailed && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">
                Something went wrong getting the next question.
              </p>
              <Button size="sm" variant="outline" onClick={retryQuestion} className="gap-1.5">
                <RotateCcw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          )}

          {pendingQuestion && !waitingForQuestion && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#127A8A]" />
                <p className="text-sm font-medium text-foreground">{pendingQuestion}</p>
              </div>
              {coverageNote && (
                <p className="pl-6 text-xs italic text-muted-foreground">{coverageNote}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="capture-answer" className="sr-only">
                  Your answer
                </Label>
                <Textarea
                  id="capture-answer"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer…"
                  rows={4}
                />
                <Button
                  onClick={submitAnswer}
                  disabled={answerText.trim().length === 0}
                  className="gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  Send answer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finish — v1 captures a single task node; multi-node switching is a
          later build. */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => onFinish(transcript)}
          disabled={!canFinish}
          className="gap-1.5"
        >
          {isFinishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Finish capture
        </Button>
        {transcript.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Answer at least one question to finish.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Step 3: synthesized summary ───────────────────────────────────────────────

function DoneStep({
  units,
  onRestart,
}: {
  units: ExtractedUnit[]
  onRestart: () => void
}) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-[#127A8A]" />
          Capture complete
        </CardTitle>
        <CardDescription>
          {units.length === 1
            ? "1 knowledge unit was captured and sent for review."
            : `${units.length} knowledge units were captured and sent for review.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {units.length > 0 && (
          <ul className="space-y-2">
            {units.map((unit, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                  {unit.category}
                </Badge>
                <span className="text-foreground">{unit.title}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => navigate(ROUTES.KNOWLEDGE_CONTINUITY.REVIEW)}
            className="gap-1.5"
          >
            <ArrowRight className="h-4 w-4" />
            Go to the Reviewer Console
          </Button>
          <Button variant="outline" onClick={onRestart} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Start another capture
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Knowledge Continuity vertical — the "Start a capture" front door. A guided,
 * three-step flow: set up the capture (creates the taxonomy node + session),
 * run a Maven-led interview (persisting each turn), then synthesize the
 * transcript into knowledge units and hand them to the Reviewer Console.
 *
 * Renders inside the shared AppShell via KceLayout, which already gates the
 * vertical on entitlement — no extra access check needed here. Deliberately
 * plain language: no raw PRISM dimension names surfaced.
 */
export default function KceCapturePage() {
  const [step, setStep] = useState<Step>("setup")
  const [ctx, setCtx] = useState<CaptureContext | null>(null)
  const [units, setUnits] = useState<ExtractedUnit[]>([])

  const extractUnits = useExtractUnits()
  const synthesize = useSynthesizeUnits()
  const isFinishing = extractUnits.isPending || synthesize.isPending

  async function handleFinish(transcript: TranscriptExchange[]) {
    if (!ctx) return
    try {
      const extracted = await extractUnits.mutateAsync({
        role_title: ctx.roleTitle,
        node: { name: ctx.captureArea, node_type: "task" },
        taxonomy_node_id: ctx.taxonomyNodeId,
        transcript,
      })
      await synthesize.mutateAsync({ sessionId: ctx.sessionId, units: extracted.units })
      setUnits(extracted.units)
      toast.success(
        extracted.units.length === 1
          ? "1 knowledge unit captured and sent for review"
          : `${extracted.units.length} knowledge units captured and sent for review`
      )
      setStep("done")
    } catch {
      // Errors already surfaced by the mutation hooks — stay on the interview.
    }
  }

  function handleRestart() {
    setCtx(null)
    setUnits([])
    setStep("setup")
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <MessagesSquare className="h-5 w-5 text-[#127A8A]" />
          Start a capture
        </h1>
        <p className="text-sm text-muted-foreground">
          Sit an expert down with Maven and turn what they know into knowledge units your
          successors can learn from.
        </p>
      </div>

      {step === "setup" && (
        <SetupStep
          onReady={(readyCtx) => {
            setCtx(readyCtx)
            setStep("interview")
          }}
        />
      )}

      {step === "interview" && ctx && (
        <InterviewStep ctx={ctx} onFinish={handleFinish} isFinishing={isFinishing} />
      )}

      {step === "done" && <DoneStep units={units} onRestart={handleRestart} />}
    </div>
  )
}
