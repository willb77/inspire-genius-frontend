/**
 * StudioInterviewBody — shared body for the Interview Studio: a flexible,
 * scored interview an interviewer (manager / super-admin / practitioner) runs
 * with their OWN question set rather than the fixed STAR competency bank.
 *
 * Mounted by the three role pages (`/{manager,super-admin,practitioner}/
 * interview-studio`), which are thin layout wrappers. Forked from
 * {@link LiveInterviewBody}: same consent → capture → per-answer score →
 * finalize → export pipeline and the same `/live/*` endpoints, but the setup
 * step is {@link StudioQuestionBuilder} (custom / topic-generated questions,
 * `frame.mode = "custom"`), the scorer bands per `frame.kind`, and the findings
 * add the advisory narrative feedback the backend now returns.
 */
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowRight,
  CheckCircle2,
  FileDown,
  FileText,
  Flag,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import ConsentGate from "@/components/interview/ConsentGate"
import AnswerScorePanel from "@/components/interview/AnswerScorePanel"
import StudioQuestionBuilder from "@/components/interview/StudioQuestionBuilder"
import { useAuth } from "@/context/useAuth"
import {
  useCreateLiveSession,
  useFinalizeLiveSession,
  useScoreLiveAnswer,
  useSubmitLiveAnswer,
} from "@/hooks/interview/useLiveInterview"
import type { InterviewFrame } from "@/services/interview/practice.service"
import { normalizeSectionScores } from "@/services/interview/live.service"
import type {
  FinalizeResult,
  LiveAnswer,
  LiveCandidate,
  LiveConsent,
  LivePlanQuestion,
  SubmitAnswerResult,
} from "@/services/interview/live.service"
import { downloadScoredInterview, saveScoredInterviewToDocuments } from "@/services/interview/interviewExport"

/** Format a score that may arrive as a number, a numeric string, or null. */
function fmtScore(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(2) : "—"
}

type Phase = "setup" | "interview" | "findings"
type SetupStep = "consent" | "participant" | "questions"

const participantSchema = z.object({
  displayName: z.string().min(1, "A name is required").max(255),
  externalId: z.string().max(255).optional(),
})
type ParticipantFormValues = z.infer<typeof participantSchema>

function ParticipantForm({ onConfirm }: { onConfirm: (c: LiveCandidate) => void }) {
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    defaultValues: { displayName: "", externalId: "" },
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-indigo-600" /> Who is this interview with?
        </CardTitle>
        <p className="text-sm text-slate-600">
          The interviewee is not the signed-in user — identify them before the
          questions start.
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((v) =>
            onConfirm({
              display_name: v.displayName.trim(),
              external_id: v.externalId?.trim() ? v.externalId.trim() : undefined,
            }),
          )}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="participant-name">Name</Label>
            <Input id="participant-name" {...form.register("displayName")} />
            {form.formState.errors.displayName && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.displayName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="participant-external-id">Reference ID (optional)</Label>
            <Input id="participant-external-id" {...form.register("externalId")} placeholder="Student ID, ATS ID, etc." />
          </div>
          <Button type="submit">Continue</Button>
        </form>
      </CardContent>
    </Card>
  )
}

type AnswerState = {
  suggestion: SubmitAnswerResult | null
  scored: LiveAnswer | null
}

export default function StudioInterviewBody() {
  const { user } = useAuth()

  const [phase, setPhase] = useState<Phase>("setup")
  const [setupStep, setSetupStep] = useState<SetupStep>("consent")
  const [consent, setConsent] = useState<LiveConsent | null>(null)
  const [participant, setParticipant] = useState<LiveCandidate | null>(null)
  const [frame, setFrame] = useState<InterviewFrame | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [plan, setPlan] = useState<LivePlanQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResult | null>(null)
  const [exporting, setExporting] = useState<"word" | "pdf" | "save" | null>(null)

  const createSession = useCreateLiveSession()
  const submitAnswer = useSubmitLiveAnswer()
  const scoreAnswer = useScoreLiveAnswer()
  const finalizeSession = useFinalizeLiveSession()

  const current = plan[idx] ?? null
  const total = plan.length
  const isLast = idx === total - 1
  const currentAnswer = current ? answers[current.competency_id] : undefined
  const isHiring = frame?.kind === "hiring"

  const savedCount = Object.values(answers).filter((a) => a.scored && typeof a.scored.final_score === "number").length
  const savedAvg =
    savedCount > 0
      ? Object.values(answers).reduce((sum, a) => sum + (a.scored?.final_score ?? 0), 0) / savedCount
      : null

  // ── Setup handlers ──────────────────────────────────────────────
  const handleConsent = (c: LiveConsent) => {
    setConsent(c)
    setSetupStep("participant")
  }

  const handleParticipant = (c: LiveCandidate) => {
    setParticipant(c)
    setSetupStep("questions")
  }

  const handleFrameConfirm = async (f: InterviewFrame) => {
    if (!participant || !consent) return
    setFrame(f)
    try {
      const result = await createSession.mutateAsync({ frame: f, candidate: participant, consent })
      setSessionId(result.session_id)
      setPlan(result.plan)
      setIdx(0)
      setAnswers({})
      setFinalizeResult(null)
      setPhase("interview")
    } catch {
      toast.error("Could not start the interview. Please try again.")
    }
  }

  // ── Interview handlers ───────────────────────────────────────────
  const handleSubmitAnswer = async (competencyId: string, question: string, capturedAnswer: string) => {
    if (!sessionId) return
    try {
      const result = await submitAnswer.mutateAsync({
        sessionId,
        payload: { competency_id: competencyId, captured_answer: capturedAnswer, question_text: question },
      })
      setAnswers((prev) => ({ ...prev, [competencyId]: { suggestion: result, scored: prev[competencyId]?.scored ?? null } }))
    } catch {
      toast.error("Could not submit that answer. Please try again.")
    }
  }

  const handleSaveScore = async (competencyId: string, finalScore: number, interviewerNotes: string) => {
    const answerId = answers[competencyId]?.suggestion?.answer_id
    if (!sessionId || !answerId) return
    try {
      const result = await scoreAnswer.mutateAsync({
        sessionId,
        answerId,
        payload: { final_score: finalScore, interviewer_notes: interviewerNotes },
      })
      setAnswers((prev) => ({ ...prev, [competencyId]: { suggestion: prev[competencyId]?.suggestion ?? null, scored: result } }))
    } catch {
      toast.error("Could not save that rating. Please try again.")
    }
  }

  const next = () => {
    if (isLast) { void finish(); return }
    setIdx((i) => i + 1)
  }

  const finish = async () => {
    if (!sessionId) return
    setPhase("findings")
    try {
      const result = await finalizeSession.mutateAsync({ sessionId })
      setFinalizeResult(result)
    } catch {
      toast.error("Could not finalize the interview. Please try again.")
    }
  }

  const guardedFinish = () => {
    const currentScored = current ? Boolean(answers[current.competency_id]?.scored) : true
    if (
      !currentScored &&
      !window.confirm(
        "The current question hasn't been submitted and rated yet — its answer and notes won't be saved. End the interview anyway?",
      )
    ) {
      return
    }
    void finish()
  }

  const restart = () => {
    setPhase("setup"); setSetupStep("consent")
    setConsent(null); setParticipant(null); setFrame(null)
    setSessionId(null); setPlan([]); setIdx(0); setAnswers({}); setFinalizeResult(null)
  }

  const doExport = async (kind: "word" | "pdf" | "save") => {
    if (!finalizeResult) return
    setExporting(kind)
    try {
      if (kind === "save") {
        await saveScoredInterviewToDocuments({ result: finalizeResult, userLabel: user?.name || user?.email })
        toast.success("Saved to your Document Library.")
      } else {
        await downloadScoredInterview({ result: finalizeResult, userLabel: user?.name || user?.email }, kind)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.")
    } finally {
      setExporting(null)
    }
  }

  const subtitle = [participant?.display_name, frame?.topic].filter(Boolean).join(" · ")

  // ── SETUP ────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-indigo-600" /> Interview Studio
          </h1>
          <p className="text-sm text-slate-600">
            Build a scored interview from your own questions — or generate a set
            for a topic like a student career discovery conversation. Advisory AI
            suggestions, your authoritative rating.
          </p>
        </header>
        {setupStep === "consent" && <ConsentGate onProceed={handleConsent} />}
        {setupStep === "participant" && <ParticipantForm onConfirm={handleParticipant} />}
        {setupStep === "questions" && (
          <StudioQuestionBuilder
            submitting={createSession.isPending}
            onConfirm={(f) => void handleFrameConfirm(f)}
          />
        )}
      </div>
    )
  }

  // ── FINDINGS ─────────────────────────────────────────────────────
  if (phase === "findings") {
    const feedback = finalizeResult?.feedback
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Interview Results</h1>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {finalizeResult && (
              <>
                <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => void doExport("word")}>
                  {exporting === "word" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Word
                </Button>
                <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => void doExport("pdf")}>
                  {exporting === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} PDF
                </Button>
                <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => void doExport("save")}>
                  {exporting === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={restart}><RefreshCw className="mr-2 h-4 w-4" /> New interview</Button>
          </div>
        </header>

        {!finalizeResult ? (
          <Card>
            <CardContent className="flex items-center py-8 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Compiling the scored write-up…
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">{isHiring ? "Recommendation" : "Overall assessment"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg font-semibold capitalize text-slate-900">{finalizeResult.recommendation}</p>
                <p className="text-sm text-slate-600">
                  Overall score: <span className="font-medium">{fmtScore(finalizeResult.overall_score)}</span> / 5
                  {" · "}Mean: <span className="font-medium">{fmtScore(finalizeResult.overall_mean)}</span>
                </p>
              </CardContent>
            </Card>

            {feedback?.generated && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-indigo-600" /> Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback.summary && <p className="text-sm text-slate-700">{feedback.summary}</p>}
                  {feedback.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                        {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {feedback.development_areas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Areas to develop</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                        {feedback.development_areas.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Section scores</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {normalizeSectionScores(finalizeResult.section_scores).map((s) => (
                  <div key={s.section} className="flex items-center justify-between border-b border-slate-100 py-1 text-sm last:border-0">
                    <span className="capitalize text-slate-700">{s.section.replace(/_/g, " ")}</span>
                    <span className="font-medium">
                      {fmtScore(s.score)} / 5
                      {feedback?.per_section?.[s.section] && (
                        <span className="ml-2 font-normal text-slate-500">— {feedback.per_section[s.section]}</span>
                      )}
                    </span>
                  </div>
                ))}
                {normalizeSectionScores(finalizeResult.section_scores).length === 0 && (
                  <p className="text-sm text-slate-500">No section scores were recorded.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Answer-by-answer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {finalizeResult.answers.map((a) => (
                  <div key={a.answer_id} className="border-b border-slate-100 pb-3 last:border-0">
                    {a.question_text && <p className="text-sm font-medium text-slate-900">{a.question_text}</p>}
                    <p className="mt-1 text-sm text-slate-700">{a.captured_answer}</p>
                    <p className="mt-1 text-sm text-indigo-700">
                      Score: {a.final_score ?? "—"} / 5
                      {typeof a.suggested_score === "number" && <span className="text-slate-500"> (AI suggested {a.suggested_score})</span>}
                    </p>
                    {a.interviewer_notes && <p className="mt-1 text-xs text-slate-600">Notes: {a.interviewer_notes}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    )
  }

  // ── INTERVIEW ────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Interview Studio</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={guardedFinish}>
          <Flag className="mr-1 h-3.5 w-3.5" /> End interview
        </Button>
      </header>

      {total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Question {current ? idx + 1 : 0} of {total}{current?.section ? ` · ${current.section.replace(/_/g, " ")}` : ""}</span>
            <span>
              Running tally: {savedCount}/{total} scored{savedAvg != null ? ` · avg ${savedAvg.toFixed(2)}` : ""}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
          </div>
        </div>
      )}

      {current && (
        <>
          <AnswerScorePanel
            key={current.competency_id}
            question={current}
            number={idx + 1}
            total={total}
            consentMode={consent?.mode ?? "no_audio"}
            suggestion={currentAnswer?.suggestion ?? null}
            scored={currentAnswer?.scored ?? null}
            submitting={submitAnswer.isPending}
            saving={scoreAnswer.isPending}
            onSubmitAnswer={(text) => handleSubmitAnswer(current.competency_id, current.question, text)}
            onSaveScore={(score, notes) => handleSaveScore(current.competency_id, score, notes)}
          />
          {currentAnswer?.scored && (
            <Button variant={isLast ? "default" : "ghost"} onClick={next}>
              {isLast ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Finish &amp; view results</> : <>Next question <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
