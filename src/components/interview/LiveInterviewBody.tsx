/**
 * LiveInterviewBody — shared body for a REAL, scored candidate interview.
 *
 * Mounted by both `/manager/interview-live` and `/practitioner/interview-live`
 * (the two role pages are thin layout wrappers around this component, mirroring
 * `InterviewPrepBody`). Forked from the candidate-side `InterviewPracticePage`
 * 3-phase shell (setup → interview → findings), but:
 *
 *   - The candidate is NOT the signed-in user — no own-PRISM/résumé
 *     personalization. Instead the interviewer identifies the candidate
 *     (display name + optional external id) up front.
 *   - A {@link ConsentGate} gates setup → interview: no capture happens until
 *     the interviewer has acknowledged the recording notice.
 *   - Uses the EVALUATOR question bank (`useQuestionBank`) for the "what to
 *     listen for" reference, but the actual question sequence for the
 *     interview comes from the backend's session plan
 *     (`POST /v1/agents/interview/live/session`), not the local bank.
 *   - Each answer is driven through {@link AnswerScorePanel} + the `/live/*`
 *     endpoints: submit the captured answer (advisory suggestion comes back),
 *     then PATCH the interviewer's own authoritative rating.
 *   - Findings phase shows the SCORED write-up from `/finalize` — section
 *     scores, overall score, and a banded recommendation — not a coaching
 *     summary.
 */
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, CheckCircle2, FileDown, FileText, Flag, Loader2, RefreshCw, Save, UserRound } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import InterviewFrameForm from "@/components/interview/InterviewFrameForm"
import ConsentGate from "@/components/interview/ConsentGate"
import AnswerScorePanel from "@/components/interview/AnswerScorePanel"
import { useQuestionBank } from "@/hooks/interview/useQuestionBank"
import { useAuth } from "@/context/useAuth"
import {
  useCreateLiveSession,
  useFinalizeLiveSession,
  useScoreLiveAnswer,
  useSubmitLiveAnswer,
} from "@/hooks/interview/useLiveInterview"
import type { InterviewFrame } from "@/services/interview/practice.service"
import type { StarCompetency } from "@/services/interview/interview.service"
import { normalizeSectionScores } from "@/services/interview/live.service"
import type {
  FinalizeResult,
  LiveAnswer,
  LiveCandidate,
  LiveConsent,
  LivePlanQuestion,
  SubmitAnswerResult,
} from "@/services/interview/live.service"

/** Format a score that may arrive as a number, a numeric string, or null. */
function fmtScore(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(2) : "—"
}
import { downloadScoredInterview, saveScoredInterviewToDocuments } from "@/services/interview/interviewExport"

type Phase = "setup" | "interview" | "findings"
type SetupStep = "consent" | "candidate" | "frame"

const candidateSchema = z.object({
  displayName: z.string().min(1, "Candidate name is required").max(255),
  externalId: z.string().max(255).optional(),
})
type CandidateFormValues = z.infer<typeof candidateSchema>

function CandidateIdentityForm({ onConfirm }: { onConfirm: (c: LiveCandidate) => void }) {
  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: { displayName: "", externalId: "" },
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-indigo-600" /> Who are you interviewing?
        </CardTitle>
        <p className="text-sm text-slate-600">
          This is a real, scored interview — the candidate is not the signed-in user.
          Identify them before the questions start.
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
            <Label htmlFor="candidate-name">Candidate name</Label>
            <Input id="candidate-name" {...form.register("displayName")} />
            {form.formState.errors.displayName && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.displayName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="candidate-external-id">External / candidate ID (optional)</Label>
            <Input id="candidate-external-id" {...form.register("externalId")} placeholder="ATS ID, req #, etc." />
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

export default function LiveInterviewBody() {
  const { data: bank } = useQuestionBank({ includeExemplars: true })
  const { user } = useAuth()

  const [phase, setPhase] = useState<Phase>("setup")
  const [setupStep, setSetupStep] = useState<SetupStep>("consent")
  const [consent, setConsent] = useState<LiveConsent | null>(null)
  const [candidate, setCandidate] = useState<LiveCandidate | null>(null)
  const [frame, setFrame] = useState<InterviewFrame | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [plan, setPlan] = useState<LivePlanQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResult | null>(null)
  const [exporting, setExporting] = useState<"word" | "pdf" | "save" | null>(null)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)

  const createSession = useCreateLiveSession()
  const submitAnswer = useSubmitLiveAnswer()
  const scoreAnswer = useScoreLiveAnswer()
  const finalizeSession = useFinalizeLiveSession()

  const bankByCompetency = useMemo(() => {
    const map = new Map<string, StarCompetency>()
    bank?.sections.forEach((s) => s.competencies.forEach((c) => map.set(c.id, c)))
    return map
  }, [bank])

  const current = plan[idx] ?? null
  const total = plan.length
  const isLast = idx === total - 1
  const currentAnswer = current ? answers[current.competency_id] : undefined

  const savedCount = Object.values(answers).filter((a) => a.scored && typeof a.scored.final_score === "number").length
  const savedAvg =
    savedCount > 0
      ? Object.values(answers).reduce((sum, a) => sum + (a.scored?.final_score ?? 0), 0) / savedCount
      : null

  // ── Setup handlers ──────────────────────────────────────────────
  const handleConsent = (c: LiveConsent) => {
    setConsent(c)
    setSetupStep("candidate")
  }

  const handleCandidate = (c: LiveCandidate) => {
    setCandidate(c)
    setSetupStep("frame")
  }

  const handleFrameConfirm = async (f: InterviewFrame) => {
    if (!candidate || !consent) return
    setFrame(f)
    try {
      // The requisition travels TOP-LEVEL, not inside the frame — that is
      // where _CreateLiveSessionBody reads it. It stays on the frame too so
      // the form can be reopened with what was entered.
      const result = await createSession.mutateAsync({
        frame: f,
        candidate,
        consent,
        requisitionId: f.requisitionId,
        requisitionLabel: f.requisitionLabel,
      })
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
    setFinalizeError(null)
    try {
      const result = await finalizeSession.mutateAsync({ sessionId })
      setFinalizeResult(result)
    } catch (e) {
      // IS-F13. The phase is already "findings" by this point, so without an
      // error state the render falls to the !finalizeResult branch and spins
      // "Compiling the scored write-up…" FOREVER — the interviewer watching a
      // progress indicator for work that already failed, answers gone from the
      // screen, no way back but "New interview". A toast that vanishes is not
      // a state. This is pinned by a test in BOTH bodies; it was forked
      // verbatim, so fixing only one leaves the other stuck and green.
      const detail =
        e instanceof Error && e.message ? e.message : "Could not finalize the interview."
      setFinalizeError(detail)
      toast.error("Could not finalize the interview. Please try again.")
    }
  }

  /**
   * Guarded end: the current question's answer + notes are only saved once the
   * interviewer submits + rates it. Ending while that's unsaved silently loses
   * it, so confirm first. (Only saved-to-server answers are ever in the record.)
   */
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
    setConsent(null); setCandidate(null); setFrame(null)
    setSessionId(null); setPlan([]); setIdx(0); setAnswers({}); setFinalizeResult(null)
    setFinalizeError(null)
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

  // ── SETUP ────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold">Live Scored Interview</h1>
          <p className="text-sm text-slate-600">
            A real, scored interview of a candidate — advisory AI suggestions, your
            authoritative rating.
          </p>
        </header>
        {setupStep === "consent" && <ConsentGate onProceed={handleConsent} />}
        {setupStep === "candidate" && <CandidateIdentityForm onConfirm={handleCandidate} />}
        {setupStep === "frame" && (
          <InterviewFrameForm
            title="Set up a live interview"
            description="Confirm the seat you're interviewing for so the STAR questions and scoring fit the actual role, reporting line, and scope."
            submitLabel="Confirm & start the live interview"
            showRequisition
            onConfirm={(f) => void handleFrameConfirm(f)}
          />
        )}
      </div>
    )
  }

  // ── FINDINGS ─────────────────────────────────────────────────────
  if (phase === "findings") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Interview Results</h1>
            <p className="text-sm text-slate-600">
              {candidate?.display_name} · {frame?.roleTitle} · {frame?.company}
            </p>
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

        {!finalizeResult && finalizeError ? (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="space-y-3 py-6 text-sm">
              <p className="font-medium text-rose-900">The scored write-up could not be compiled.</p>
              <p className="text-rose-800">{finalizeError}</p>
              <p className="text-xs text-rose-700">
                Nothing was lost — the answers and ratings are saved. Try again.
              </p>
              <Button size="sm" variant="outline" onClick={() => void finish()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try again
              </Button>
            </CardContent>
          </Card>
        ) : !finalizeResult ? (
          <Card>
            <CardContent className="flex items-center py-8 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Compiling the scored write-up…
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Recommendation</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg font-semibold text-slate-900">{finalizeResult.recommendation}</p>
                <p className="text-sm text-slate-600">
                  Overall score: <span className="font-medium">{fmtScore(finalizeResult.overall_score)}</span> / 5
                  {" · "}Mean: <span className="font-medium">{fmtScore(finalizeResult.overall_mean)}</span>
                </p>
              </CardContent>
            </Card>

            {(finalizeResult.unrated?.length ?? 0) > 0 && (
              <Card className="border-amber-200 bg-amber-50/60">
                <CardContent className="space-y-2 py-4 text-sm">
                  <p className="font-medium text-amber-900">
                    {finalizeResult.unrated!.length} of {finalizeResult.answer_count ?? finalizeResult.answers.length}{" "}
                    answers were never rated and are NOT part of this score.
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
                    {finalizeResult.unrated!.map((u) => (
                      <li key={u.answer_id}>{u.question_text || u.competency_id}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-700">
                    They are still in the transcript below. A score that quietly dropped them
                    would read as a complete scorecard.
                  </p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="text-base">Section scores</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {normalizeSectionScores(finalizeResult.section_scores).map((s) => (
                  <div key={s.section} className="flex items-center justify-between border-b border-slate-100 py-1 text-sm last:border-0">
                    <span className="text-slate-700">{s.section}</span>
                    <span className="font-medium">{fmtScore(s.score)} / 5</span>
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{a.competency_id}</p>
                    {a.question_text && <p className="mt-1 text-sm font-medium text-slate-900">{a.question_text}</p>}
                    <p className="mt-1 text-sm text-slate-700">{a.captured_answer}</p>
                    <p className="mt-1 text-sm text-indigo-700">
                      Final score: {a.final_score ?? "—"} / 5
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
          <h1 className="text-2xl font-semibold">Live Scored Interview</h1>
          <p className="text-sm text-slate-600">
            {candidate?.display_name} · {frame?.roleTitle} · {frame?.company}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={guardedFinish}>
          <Flag className="mr-1 h-3.5 w-3.5" /> End interview
        </Button>
      </header>

      {total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Question {current ? idx + 1 : 0} of {total} · {current?.section}</span>
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
            bankEntry={bankByCompetency.get(current.competency_id)}
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
