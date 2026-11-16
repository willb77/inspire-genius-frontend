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
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
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
import JobDnaCandidatePicker, { type JobDnaCandidateLink } from "@/components/interview/JobDnaCandidatePicker"
import AnswerScorePanel from "@/components/interview/AnswerScorePanel"
import PastInterviewsPanel from "@/components/interview/PastInterviewsPanel"
import StudioQuestionBuilder from "@/components/interview/StudioQuestionBuilder"
import InterviewSubjectPicker from "@/components/interview/InterviewSubjectPicker"
import { useAuth } from "@/context/useAuth"
import {
  useCreateLiveSession,
  useFinalizeLiveSession,
  useScoreLiveAnswer,
  useSubmitLiveAnswer,
} from "@/hooks/interview/useLiveInterview"
import { SLOT, slotParts, slotSplit, type TFn } from "@/components/interview/tFallback"
import type { InterviewFrame } from "@/services/interview/practice.service"
import { liveInterviewService, normalizeSectionScores } from "@/services/interview/live.service"
import {
  finalizeResultFromDetail,
  rehydrateSession,
} from "@/services/interview/liveSessionResume"
import type {
  FinalizeResult,
  LiveAnswer,
  LiveCandidate,
  LiveConsent,
  LiveEmployerMeta,
  LivePlanQuestion,
  ScorecardDraftReport,
  LiveTailoringMeta,
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

const buildParticipantSchema = (t: TFn) =>
  z.object({
    displayName: z.string().min(1, t("studio.participant.nameRequired", "A name is required")).max(255),
    externalId: z.string().max(255).optional(),
  })
type ParticipantFormValues = z.infer<ReturnType<typeof buildParticipantSchema>>


/** One honest line about the Job Studio scorecard draft after finalise. */
function ScorecardDraftLine({ linked, report }: { linked: boolean; report?: ScorecardDraftReport | null }) {
  const { t } = useTranslation("interviewPages")
  if (!linked) return null
  if (report?.written) {
    return (
      <p className="text-sm text-emerald-700" data-testid="scorecard-draft-line">
        {typeof report.dimensions_scored === "number"
          ? t("live.scorecard.writtenDims", { defaultValue: "Scorecard draft written for the linked candidate ({{dimensions}} dimensions).", dimensions: report.dimensions_scored })
          : t("live.scorecard.written", "Scorecard draft written for the linked candidate.")}{" "}
        {t("studio.scorecard.review", "Review it under Job DNA → Scorecards before it counts.")}
      </p>
    )
  }
  return (
    <p className="text-sm text-amber-700" role="alert" data-testid="scorecard-draft-line">
      {report?.reason
        ? t("live.scorecard.noDraftReason", { defaultValue: "No scorecard draft was written for the linked candidate ({{reason}}).", reason: report.reason })
        : t("live.scorecard.noDraft", "No scorecard draft was written for the linked candidate (the backend did not report one).")}
    </p>
  )
}

function ParticipantForm({ onConfirm }: { onConfirm: (c: LiveCandidate) => void }) {
  const { t } = useTranslation("interviewPages")
  const participantSchema = useMemo(() => buildParticipantSchema(t), [t])
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    defaultValues: { displayName: "", externalId: "" },
  })
  const [link, setLink] = useState<JobDnaCandidateLink | null>(null)
  const pick = (l: JobDnaCandidateLink) => {
    setLink(l)
    form.setValue("displayName", l.display_name, { shouldValidate: true })
    form.setValue("externalId", l.external_id ?? "")
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-indigo-600" /> {t("studio.participant.title", "Who is this interview with?")}
        </CardTitle>
        <p className="text-sm text-slate-600">
          {t("studio.participant.intro", "The interviewee is not the signed-in user — identify them before the questions start.")}
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((v) =>
            onConfirm({
              display_name: v.displayName.trim(),
              external_id: v.externalId?.trim() ? v.externalId.trim() : undefined,
              candidate_id: link?.candidate_id,
              blueprint_id: link?.blueprint_id,
            }),
          )}
          className="space-y-4"
        >
          <JobDnaCandidatePicker value={link} onPick={pick} onClear={() => setLink(null)} />
          <div>
            <Label htmlFor="participant-name">{t("studio.participant.nameLabel", "Name")}</Label>
            <Input id="participant-name" {...form.register("displayName")} />
            {form.formState.errors.displayName && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.displayName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="participant-external-id">{t("studio.participant.refLabel", "Reference ID (optional)")}</Label>
            <Input id="participant-external-id" {...form.register("externalId")} placeholder={t("studio.participant.refPlaceholder", "Student ID, ATS ID, etc.")} />
          </div>
          <Button type="submit">{t("live.candidate.continue", "Continue")}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

type AnswerState = {
  suggestion: SubmitAnswerResult | null
  scored: LiveAnswer | null
}

export type StudioInterviewBodyProps = {
  /**
   * House style (interview area): a stored session to open once on mount —
   * a finished one read-only, an unfinished one where it stopped. Only the
   * switched-on workspace page passes it; absent, nothing here changes.
   */
  openSessionId?: string
}

export default function StudioInterviewBody({ openSessionId }: StudioInterviewBodyProps = {}) {
  const { t } = useTranslation("interviewPages")
  const { user } = useAuth()

  const [phase, setPhase] = useState<Phase>("setup")
  const [setupStep, setSetupStep] = useState<SetupStep>("consent")
  const [consent, setConsent] = useState<LiveConsent | null>(null)
  const [participant, setParticipant] = useState<LiveCandidate | null>(null)
  const [frame, setFrame] = useState<InterviewFrame | null>(null)
  // S-3: the development subject — chosen after the style, cleared the moment
  // the style becomes selection, and sent only on a development session.
  const [subject, setSubject] = useState<string | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  // Provenance for THIS run: which curated pack applied, and whether the role
  // rewrite actually happened. Surfaced so a silent fallback is visible.
  const [employer, setEmployer] = useState<LiveEmployerMeta | null>(null)
  const [tailoring, setTailoring] = useState<LiveTailoringMeta | null>(null)
  const [plan, setPlan] = useState<LivePlanQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResult | null>(null)
  const [exporting, setExporting] = useState<"word" | "pdf" | "save" | null>(null)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  /** A reopened session is REVIEW ONLY — never re-finalized, never re-rated. */
  const [readOnly, setReadOnly] = useState(false)
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null)

  const createSession = useCreateLiveSession()
  const submitAnswer = useSubmitLiveAnswer()
  const scoreAnswer = useScoreLiveAnswer()
  const finalizeSession = useFinalizeLiveSession()

  const overallParts = slotSplit(
    t("live.results.overall", { defaultValue: "Overall score: {{score}} / 5 · Mean: {{mean}}", score: SLOT, mean: SLOT }),
  )
  const [tailoringBefore, tailoringAfter] = slotParts(
    t("studio.tailoringNotice", { defaultValue: "These questions were {{slot}} rewritten for the role — the tailoring step was unavailable, so the standard wording is being used. The interview and its scoring are unaffected.", slot: SLOT }),
  )

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


  /**
   * Provenance + tailoring notice.
   *
   * Two independent things a run should never hide: which curated framework the
   * questions came from (with its disclaimer), and the fact that a requested
   * role rewrite did not happen.
   */
  const ProvenanceNotice = () => {
    const rewriteMissed =
      tailoring?.requested && !tailoring.applied &&
      (tailoring.reason === "tailoring_unavailable" || tailoring.reason === "tailoring_error")
    if (!employer && !rewriteMissed) return null
    return (
      <div className="space-y-2">
        {employer ? (
          <div
            className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
            data-testid="studio-employer-provenance"
          >
            <span className="font-semibold text-slate-800">
              {employer.framework
                ? t("studio.framedOnFramework", { defaultValue: "Framed on {{name}} — {{framework}}", name: employer.name, framework: employer.framework })
                : t("studio.framedOn", { defaultValue: "Framed on {{name}}", name: employer.name })}
            </span>
            <p className="mt-1 leading-snug">{employer.provenance}</p>
          </div>
        ) : null}
        {rewriteMissed ? (
          <div
            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
            role="status"
            data-testid="studio-tailoring-notice"
          >
            {tailoringBefore}
            <span className="font-semibold">{t("studio.tailoringNot", "not")}</span>
            {tailoringAfter}
          </div>
        ) : null}
      </div>
    )
  }

  const handleFrameConfirm = async (f: InterviewFrame) => {
    if (!participant || !consent) return
    setFrame(f)
    try {
      const result = await createSession.mutateAsync({
        frame: f,
        candidate: { display_name: participant.display_name, external_id: participant.external_id },
        consent,
        // Top-level, not inside the frame — that is where the backend reads it.
        requisitionId: f.requisitionId,
        requisitionLabel: f.requisitionLabel,
        // Job DNA link (IS-11c2): both ids or neither.
        candidate_id: participant.candidate_id,
        blueprint_id: participant.blueprint_id,
        // S-3 / D3: subject_sub only on a development session. Checked on the
        // frame being sent, not the picker state, so a selection session can
        // never carry one whatever the UI did.
        ...(f.kind === "general" && subject ? { subject_sub: subject } : {}),
      })
      setSessionId(result.session_id)
      setPlan(result.plan)
      setEmployer(result.employer ?? null)
      setTailoring(result.tailoring ?? null)
      setIdx(0)
      setAnswers({})
      setFinalizeResult(null)
      setPhase("interview")
    } catch {
      toast.error(t("live.startFailed", "Could not start the interview. Please try again."))
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
      toast.error(t("live.submitFailed", "Could not submit that answer. Please try again."))
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
      toast.error(t("live.saveFailed", "Could not save that rating. Please try again."))
    }
  }

  const next = () => {
    if (isLast) { void finish(); return }
    setIdx((i) => i + 1)
  }

  const finish = async () => {
    if (!sessionId) return
    // A reopened interview is a record, not a draft.
    //
    // This line is UNREACHABLE from the UI — the findings screen renders no
    // control that calls finish() once a result is present, which is asserted
    // by "offers no control that would re-score it". Mutation-testing it
    // confirms as much: deleting it fails nothing. It is kept deliberately, as
    // defence for a later edit that adds a re-score control to this screen, and
    // it is recorded here as UNCOVERED rather than left looking tested. The
    // enforcing guard is the backend's 409, which has its own test.
    if (readOnly) return
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
        e instanceof Error && e.message ? e.message : t("live.finalizeFailedDetail", "Could not finalize the interview.")
      setFinalizeError(detail)
      toast.error(t("live.finalizeFailed", "Could not finalize the interview. Please try again."))
    }
  }

  const guardedFinish = () => {
    const currentScored = current ? Boolean(answers[current.competency_id]?.scored) : true
    if (
      !currentScored &&
      !window.confirm(
        t("live.confirmEnd", "The current question hasn't been submitted and rated yet — its answer and notes won't be saved. End the interview anyway?"),
      )
    ) {
      return
    }
    void finish()
  }


  // ── Past interviews: resume + reopen ─────────────────────────────
  /**
   * Open a stored session. `resume` continues an in-progress interview at its
   * first unanswered question; `reopen` shows a finished one read-only.
   *
   * A reopened session is NEVER re-finalized. The roll-up is the record of a
   * decision already made about a real candidate, and re-running it against
   * today's answers could produce a different number for an interview that has
   * already been acted on. The backend refuses with a 409; this is the client
   * keeping the same rule rather than relying on being told.
   */
  const openSession = async (sid: string, mode: "resume" | "reopen") => {
    setOpeningSessionId(sid)
    try {
      const detail = await liveInterviewService.getSession(sid)
      const fallbackName =
        detail.candidate_ref?.display_name?.trim() ||
        (detail.candidate_ref?.candidate_hash
          ? t("past.candidateHash", { defaultValue: "Candidate {{hash}}", hash: detail.candidate_ref.candidate_hash.slice(0, 8) })
          : t("past.candidateNotRecorded", "Candidate not recorded"))

      setSessionId(sid)
      setFrame(detail.session.frame ?? null)
      setParticipant(
        detail.session.candidate ?? {
          display_name: fallbackName,
          external_id: detail.candidate_ref?.external_id,
        },
      )
      setConsent(detail.session.consent ?? null)
      setFinalizeError(null)

      if (mode === "reopen" || detail.status !== "in_progress") {
        setReadOnly(true)
        setFinalizeResult(finalizeResultFromDetail(detail))
        setPlan(detail.plan)
        setPhase("findings")
        return
      }

      const rehydrated = rehydrateSession(detail)
      if (rehydrated.plan.length === 0) {
        // The plan column is what makes an interview resumable. Empty means the
        // remaining questions are not recoverable, and dropping the interviewer
        // into an empty interview screen would look like a loading bug.
        toast.error(t("live.noPlan", "That interview has no recorded question plan, so it cannot be resumed."))
        return
      }
      setReadOnly(false)
      setPlan(rehydrated.plan)
      setAnswers(rehydrated.answers)
      setIdx(rehydrated.startIndex)
      setFinalizeResult(null)
      setPhase("interview")
      if (rehydrated.complete) {
        toast.info(t("live.allAnswered", "Every question in this interview has been answered — review and finish it."))
      }
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : t("live.openFailed", "Could not open that interview."),
      )
    } finally {
      setOpeningSessionId(null)
    }
  }

  const restart = () => {
    setPhase("setup"); setSetupStep("consent")
    setConsent(null); setParticipant(null); setFrame(null)
    setSessionId(null); setPlan([]); setIdx(0); setAnswers({}); setFinalizeResult(null)
    setFinalizeError(null); setReadOnly(false)
    setEmployer(null); setTailoring(null)
  }

  // House style — open the session the address names, once per id. Same rule
  // as Live Interview's `?session=`: the ref keeps a re-render from opening it
  // twice, and a finished interview opens read-only and is never re-finalized.
  const openedFromPropRef = useRef<string | null>(null)
  useEffect(() => {
    if (!openSessionId || openedFromPropRef.current === openSessionId) return
    openedFromPropRef.current = openSessionId
    void openSession(openSessionId, "resume")
    // openSession is recreated each render; the ref above makes this run once per id.
  }, [openSessionId])

  const doExport = async (kind: "word" | "pdf" | "save") => {
    if (!finalizeResult) return
    setExporting(kind)
    try {
      if (kind === "save") {
        await saveScoredInterviewToDocuments({ result: finalizeResult, userLabel: user?.name || user?.email })
        toast.success(t("live.savedToLibrary", "Saved to your Document Library."))
      } else {
        await downloadScoredInterview({ result: finalizeResult, userLabel: user?.name || user?.email }, kind)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("live.exportFailed", "Export failed."))
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
            <Sparkles className="h-6 w-6 text-indigo-600" /> {t("studio.title", "Interview Studio")}
          </h1>
          <p className="text-sm text-slate-600">
            {t("studio.subtitle", "Build a scored interview from your own questions — or generate a set for a topic like a student career discovery conversation. Advisory AI suggestions, your authoritative rating.")}
          </p>
        </header>
        {setupStep === "consent" && (
          <PastInterviewsPanel
            surface="studio"
            busySessionId={openingSessionId}
            onResume={(sid) => void openSession(sid, "resume")}
            onReopen={(sid) => void openSession(sid, "reopen")}
          />
        )}
        {setupStep === "consent" && <ConsentGate onProceed={handleConsent} />}
        {setupStep === "participant" && <ParticipantForm onConfirm={handleParticipant} />}
        {setupStep === "questions" && (
          <StudioQuestionBuilder
            submitting={createSession.isPending}
            onConfirm={(f) => void handleFrameConfirm(f)}
            onKindChange={(k) => {
              if (k !== "general") setSubject(null)
            }}
            developmentOnly={<InterviewSubjectPicker value={subject} onChange={setSubject} />}
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
            <h1 className="text-2xl font-semibold">{t("live.results.title", "Interview Results")}</h1>
            <p className="text-sm text-slate-600">{subtitle}</p>
            <div className="mt-2"><ProvenanceNotice /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {finalizeResult && (
              <>
                <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => void doExport("word")}>
                  {exporting === "word" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} {t("live.export.word", "Word")}
                </Button>
                <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => void doExport("pdf")}>
                  {exporting === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} {t("live.export.pdf", "PDF")}
                </Button>
                <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => void doExport("save")}>
                  {exporting === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {t("live.export.save", "Save")}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={restart}><RefreshCw className="mr-2 h-4 w-4" /> {t("live.newInterview", "New interview")}</Button>
          </div>
        </header>

        {!finalizeResult && finalizeError ? (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="space-y-3 py-6 text-sm">
              <p className="font-medium text-rose-900">{t("live.results.compileFailed", "The scored write-up could not be compiled.")}</p>
              <p className="text-rose-800">{finalizeError}</p>
              <p className="text-xs text-rose-700">
                {t("live.results.nothingLost", "Nothing was lost — the answers and ratings are saved. Try again.")}
              </p>
              <Button size="sm" variant="outline" onClick={() => void finish()}>
                <RefreshCw className="mr-2 h-4 w-4" /> {t("past.tryAgain", "Try again")}
              </Button>
            </CardContent>
          </Card>
        ) : !finalizeResult ? (
          <Card>
            <CardContent className="flex items-center py-8 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("live.results.compiling", "Compiling the scored write-up…")}
            </CardContent>
          </Card>
        ) : (
          <>
            {readOnly && (
              <Card className="border-slate-300 bg-slate-50">
                <CardContent className="py-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{t("live.results.reopened", "Reopened for review — read only.")}</p>
                  <p className="mt-1 text-xs">
                    {t("live.results.reopenedBody", "This is the interview as it was recorded. Its score is the one the decision was made on and is not recalculated; ratings cannot be changed and it cannot be finalized again. Exporting it again is fine.")}
                  </p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="text-base">{isHiring ? t("live.results.evidence", "What the evidence shows") : t("studio.results.overallAssessment", "Overall assessment")}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg font-semibold capitalize text-slate-900">{finalizeResult.recommendation}</p>
                <ScorecardDraftLine linked={!!participant?.candidate_id} report={finalizeResult.scorecard_draft} />
                <p className="text-sm text-slate-600">
                  {overallParts[0]}
                  <span className="font-medium">{fmtScore(finalizeResult.overall_score)}</span>
                  {overallParts[1]}
                  <span className="font-medium">{fmtScore(finalizeResult.overall_mean)}</span>
                  {overallParts[2]}
                </p>
              </CardContent>
            </Card>

            {feedback?.generated && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-indigo-600" /> {t("studio.results.feedback", "Feedback")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback.summary && <p className="text-sm text-slate-700">{feedback.summary}</p>}
                  {feedback.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t("studio.results.strengths", "Strengths")}</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                        {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {feedback.development_areas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t("studio.results.areasToDevelop", "Areas to develop")}</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                        {feedback.development_areas.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(finalizeResult.unrated?.length ?? 0) > 0 && (
              <Card className="border-amber-200 bg-amber-50/60">
                <CardContent className="space-y-2 py-4 text-sm">
                  <p className="font-medium text-amber-900">
                    {t("live.results.unrated", { defaultValue: "{{unrated}} of {{total}} answers were never rated and are NOT part of this score.", unrated: finalizeResult.unrated!.length, total: finalizeResult.answer_count ?? finalizeResult.answers.length })}
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
                    {finalizeResult.unrated!.map((u) => (
                      <li key={u.answer_id}>{u.question_text || u.competency_id}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-700">
                    {t("live.results.unratedNote", "They are still in the transcript below. A score that quietly dropped them would read as a complete scorecard.")}
                  </p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="text-base">{t("live.results.sectionScores", "Section scores")}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {normalizeSectionScores(finalizeResult.section_scores).map((s) => (
                  <div key={s.section} className="flex items-center justify-between border-b border-slate-100 py-1 text-sm last:border-0">
                    <span className="capitalize text-slate-700">{s.section.replace(/_/g, " ")}</span>
                    <span className="font-medium">
                      {t("live.results.scoreOfFive", { defaultValue: "{{score}} / 5", score: fmtScore(s.score) })}
                      {feedback?.per_section?.[s.section] && (
                        <span className="ml-2 font-normal text-slate-500">— {feedback.per_section[s.section]}</span>
                      )}
                    </span>
                  </div>
                ))}
                {normalizeSectionScores(finalizeResult.section_scores).length === 0 && (
                  <p className="text-sm text-slate-500">{t("live.results.noSectionScores", "No section scores were recorded.")}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t("live.results.answerByAnswer", "Answer-by-answer")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {finalizeResult.answers.map((a) => (
                  <div key={a.answer_id} className="border-b border-slate-100 pb-3 last:border-0">
                    {a.question_text && <p className="text-sm font-medium text-slate-900">{a.question_text}</p>}
                    <p className="mt-1 text-sm text-slate-700">{a.captured_answer}</p>
                    {/* Read `final_source`, never `final_score`. Every answer row is
                        SEEDED with a score at insert, so an answer nobody rated still
                        carries a number — printing it as "Score: 3 / 5" attributes to
                        the interviewer a judgement they never made. That is the whole
                        reason IS-4 added the column. Undecided answers say so, and are
                        never back-filled.

                        This landed in LiveInterviewBody with IS-C Lane B and was LOST
                        here: the patch that carried it also asserted a second anchor,
                        the assert failed, and the file was never written. The Live
                        suite asserted the label and the Studio suite did not, so the
                        fork stayed green while showing a seeded score as a decision.
                        The parity test below exists so that cannot recur. */}
                    {a.final_source ? (
                      <p className="mt-1 text-sm text-indigo-700">
                        {t("studio.results.score", { defaultValue: "Score: {{score}} / 5", score: a.final_score ?? "—" })}
                        {a.final_source === "model" && <span className="text-slate-500"> {t("live.results.aiAdopted", "(AI suggestion adopted)")}</span>}
                        {typeof a.suggested_score === "number" && <span className="text-slate-500"> {t("live.results.aiSuggested", { defaultValue: "(AI suggested {{score}})", score: a.suggested_score })}</span>}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">
                        {t("live.results.notDecided", "Not decided — this answer was not part of the score.")}
                        {typeof a.suggested_score === "number" && <span> {t("live.results.aiSuggestedSentence", { defaultValue: "The AI suggested {{score}}.", score: a.suggested_score })}</span>}
                      </p>
                    )}
                    {a.interviewer_notes && <p className="mt-1 text-xs text-slate-600">{t("live.results.notes", { defaultValue: "Notes: {{notes}}", notes: a.interviewer_notes })}</p>}
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
          <h1 className="text-2xl font-semibold">{t("studio.title", "Interview Studio")}</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={guardedFinish}>
          <Flag className="mr-1 h-3.5 w-3.5" /> {t("live.endInterview", "End interview")}
        </Button>
      </header>

      <ProvenanceNotice />

      {total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {current?.section
                ? t("answer.questionOf", { defaultValue: "Question {{number}} of {{total}} · {{section}}", number: current ? idx + 1 : 0, total, section: current.section.replace(/_/g, " ") })
                : t("studio.questionOf", { defaultValue: "Question {{number}} of {{total}}", number: current ? idx + 1 : 0, total })}
            </span>
            <span>
              {savedAvg != null
                ? t("live.tallyAvg", { defaultValue: "Running tally: {{saved}}/{{total}} scored · avg {{avg}}", saved: savedCount, total, avg: savedAvg.toFixed(2) })
                : t("live.tally", { defaultValue: "Running tally: {{saved}}/{{total}} scored", saved: savedCount, total })}
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
            developmentMode={!isHiring}
            onSubmitAnswer={(text) => handleSubmitAnswer(current.competency_id, current.question, text)}
            onSaveScore={(score, notes) => handleSaveScore(current.competency_id, score, notes)}
          />
          {currentAnswer?.scored && (
            <Button variant={isLast ? "default" : "ghost"} onClick={next}>
              {isLast ? <><CheckCircle2 className="mr-2 h-4 w-4" /> {t("live.finishView", "Finish & view results")}</> : <>{t("live.nextQuestion", "Next question")} <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
