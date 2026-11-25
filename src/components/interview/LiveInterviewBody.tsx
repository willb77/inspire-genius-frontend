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
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"
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
import JobDnaCandidatePicker, { type JobDnaCandidateLink } from "@/components/interview/JobDnaCandidatePicker"
import AnswerScorePanel from "@/components/interview/AnswerScorePanel"
import PastInterviewsPanel from "@/components/interview/PastInterviewsPanel"
import { useQuestionBank } from "@/hooks/interview/useQuestionBank"
import { useAuth } from "@/context/useAuth"
import { useDeepLinkedCandidate } from "@/hooks/interview/useDeepLinkedCandidate"
import { useSetInterviewStep } from "@/hooks/job-blueprint/useTriage"
import { ROUTES } from "@/constants/routes"
import type { InterviewStep } from "@/types/job-blueprint"
import {
  useCreateLiveSession,
  useFinalizeLiveSession,
  useScoreLiveAnswer,
  useSubmitLiveAnswer,
} from "@/hooks/interview/useLiveInterview"
import { SLOT, slotParts, slotSplit, type TFn } from "@/components/interview/tFallback"
import type { InterviewFrame } from "@/services/interview/practice.service"
import type { StarCompetency } from "@/services/interview/interview.service"
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
  LivePlanQuestion,
  ScorecardDraftReport,
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

const buildCandidateSchema = (t: TFn) =>
  z.object({
    displayName: z.string().min(1, t("live.candidate.nameRequired", "Candidate name is required")).max(255),
    externalId: z.string().max(255).optional(),
  })
type CandidateFormValues = z.infer<ReturnType<typeof buildCandidateSchema>>


/** One honest line about the Job Studio scorecard draft after finalise. */
function ScorecardDraftLine({ linked, report }: { linked: boolean; report?: ScorecardDraftReport | null }) {
  const { t } = useTranslation("interviewPages")
  if (!linked) return null
  if (report?.written) {
    const [reviewBefore, reviewAfter] = slotParts(
      t("live.scorecard.review", { defaultValue: "{{slot}} before it counts.", slot: SLOT }),
    )
    return (
      <p className="text-sm text-emerald-700" data-testid="scorecard-draft-line">
        {typeof report.dimensions_scored === "number"
          ? t("live.scorecard.writtenDims", { defaultValue: "Scorecard draft written for the linked candidate ({{dimensions}} dimensions).", dimensions: report.dimensions_scored })
          : t("live.scorecard.written", "Scorecard draft written for the linked candidate.")}
        {reviewBefore}
        <Link to={ROUTES.JOB_DNA.SCORECARDS} className="underline underline-offset-2">
          {t("live.scorecard.reviewLink", "Review it under Role Blueprints → Scorecards")}
        </Link>
        {reviewAfter}
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

/**
 * JS-12 — what happened to the linked candidate's pipeline step. Recorded as
 * state and rendered, never only toasted: the interviewer must be able to see
 * afterwards whether the pipeline moved, and if not, why.
 */
type PipelineStepOutcome = {
  step: InterviewStep
  outcome: "moved" | "unchanged" | "failed"
  /** The status the server holds (unchanged), or the failure reason. */
  detail?: string
}

function stepLabel(step: InterviewStep, t: TFn): string {
  return step === "interview-scheduled"
    ? t("live.step.scheduled", "interview scheduled")
    : t("live.step.completed", "interview completed")
}

function PipelineStepLines({ outcomes }: { outcomes: PipelineStepOutcome[] }) {
  const { t } = useTranslation("interviewPages")
  if (outcomes.length === 0) return null
  return (
    <ul className="space-y-0.5" data-testid="pipeline-step-lines">
      {outcomes.map((o) => (
        <li
          key={o.step}
          className={o.outcome === "failed" ? "text-sm text-amber-700" : "text-sm text-slate-600"}
          role={o.outcome === "failed" ? "alert" : undefined}
        >
          {o.outcome === "moved"
            ? t("live.step.moved", { defaultValue: "Pipeline step set to {{step}}.", step: stepLabel(o.step, t) })
            : o.outcome === "unchanged"
              ? t("live.step.unchanged", { defaultValue: "Pipeline step unchanged ({{detail}}) — {{step}} was not applied.", detail: o.detail ?? t("live.step.alreadyThere", "already there"), step: stepLabel(o.step, t) })
              : t("live.step.failed", { defaultValue: "Pipeline step not updated to {{step}}: {{detail}}.", step: stepLabel(o.step, t), detail: o.detail ?? t("live.step.unknownError", "unknown error") })}
        </li>
      ))}
    </ul>
  )
}

/** Turn the step write's failure into one sentence the interviewer can act on. */
function stepFailureReason(e: unknown, t: TFn): string {
  const status = (e as { response?: { status?: number } } | undefined)?.response?.status
  if (status === 404) return t("live.failure.notFound", "the pipeline service does not have the interview-step route yet")
  if (status === 403) return t("live.failure.forbidden", "this account is not entitled to write the candidate pipeline")
  if (status === 422) return t("live.failure.rejected", "the pipeline service rejected the step")
  return e instanceof Error && e.message ? e.message : t("live.failure.requestFailed", "the request failed")
}

/** JS-10 — say what the URL asked for, in every state, before consent. */
function DeepLinkNotice({ deepLink }: { deepLink: ReturnType<typeof useDeepLinkedCandidate> }) {
  const { t } = useTranslation("interviewPages")
  if (deepLink.state === "loading") {
    return <p className="text-sm text-slate-600" data-testid="deep-link-notice">{t("live.deepLink.loading", "Loading the candidate from Role Blueprints…")}</p>
  }
  if (deepLink.state === "ready" && deepLink.link) {
    const [before, after] = slotParts(
      deepLink.link.external_id
        ? t("live.deepLink.readyWithId", { defaultValue: "Interviewing {{slot}} ({{externalId}}) from Role Blueprints — the candidate will be linked once you confirm consent.", slot: SLOT, externalId: deepLink.link.external_id })
        : t("live.deepLink.ready", { defaultValue: "Interviewing {{slot}} from Role Blueprints — the candidate will be linked once you confirm consent.", slot: SLOT }),
    )
    return (
      <p className="text-sm text-indigo-900" data-testid="deep-link-notice">
        {before}
        <span className="font-medium">{deepLink.link.display_name}</span>
        {after}
      </p>
    )
  }
  if (deepLink.state === "missing") {
    return (
      <p className="text-sm text-amber-700" role="alert" data-testid="deep-link-notice">
        {t("live.deepLink.missing", "The candidate in this link is not in that Job DNA's pipeline. You can still pick one on the next step; otherwise this interview will not be linked.")}
      </p>
    )
  }
  if (deepLink.state === "error") {
    return (
      <p className="text-sm text-amber-700" role="alert" data-testid="deep-link-notice">
        {t("live.deepLink.error", "Could not load the candidate from Role Blueprints. You can still pick one on the next step; otherwise this interview will not be linked.")}
      </p>
    )
  }
  return null
}

function CandidateIdentityForm({
  onConfirm,
  initialLink = null,
}: {
  onConfirm: (c: LiveCandidate) => void
  /** JS-10 — a link resolved from the URL, applied once as if picked. */
  initialLink?: JobDnaCandidateLink | null
}) {
  const { t } = useTranslation("interviewPages")
  const candidateSchema = useMemo(() => buildCandidateSchema(t), [t])
  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: { displayName: "", externalId: "" },
  })
  const [link, setLink] = useState<JobDnaCandidateLink | null>(null)
  const pick = (l: JobDnaCandidateLink) => {
    setLink(l)
    form.setValue("displayName", l.display_name, { shouldValidate: true })
    form.setValue("externalId", l.external_id ?? "")
  }
  const appliedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!initialLink || appliedRef.current === initialLink.candidate_id) return
    appliedRef.current = initialLink.candidate_id
    pick(initialLink)
    // pick() is stable for this component's lifetime; the effect keys on the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLink])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-indigo-600" /> {t("live.candidate.title", "Who are you interviewing?")}
        </CardTitle>
        <p className="text-sm text-slate-600">
          {t("live.candidate.intro", "This is a real, scored interview — the candidate is not the signed-in user. Identify them before the questions start.")}
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
            <Label htmlFor="candidate-name">{t("live.candidate.nameLabel", "Candidate name")}</Label>
            <Input id="candidate-name" {...form.register("displayName")} />
            {form.formState.errors.displayName && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.displayName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="candidate-external-id">{t("live.candidate.externalIdLabel", "External / candidate ID (optional)")}</Label>
            <Input id="candidate-external-id" {...form.register("externalId")} placeholder={t("live.candidate.externalIdPlaceholder", "ATS ID, req #, etc.")} />
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

export default function LiveInterviewBody() {
  const { t } = useTranslation("interviewPages")
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
  /** A reopened session is REVIEW ONLY — never re-finalized, never re-rated. */
  const [readOnly, setReadOnly] = useState(false)
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null)
  /** JS-12 — outcome of each pipeline-step write for the linked candidate. */
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStepOutcome[]>([])

  // JS-10 / JS-11 — the URL can name a candidate to pre-link or a session to open.
  const [params] = useSearchParams()
  const deepLinkBlueprintId = params.get("blueprintId") ?? ""
  const deepLinkCandidateId = params.get("candidateId") ?? ""
  const deepLinkSessionId = params.get("session") ?? ""
  const deepLink = useDeepLinkedCandidate(deepLinkBlueprintId, deepLinkCandidateId)

  const createSession = useCreateLiveSession()
  const submitAnswer = useSubmitLiveAnswer()
  const scoreAnswer = useScoreLiveAnswer()
  const finalizeSession = useFinalizeLiveSession()
  const setInterviewStep = useSetInterviewStep()

  /**
   * JS-12 — move the linked candidate's pipeline step, and record what
   * happened. Never blocks the interview: a failure is a line on screen, the
   * session is unaffected. Only the two interview steps exist on this path;
   * a verdict is the recruiter's.
   */
  const recordPipelineStep = async (step: InterviewStep, sid: string) => {
    const candidateId = candidate?.candidate_id
    if (!candidateId) return
    let outcome: PipelineStepOutcome
    try {
      const updated = await setInterviewStep.mutateAsync({ candidateId, step, interviewSessionId: sid })
      outcome =
        updated?.status === step
          ? { step, outcome: "moved" }
          : { step, outcome: "unchanged", detail: updated?.status ? t("live.step.at", { defaultValue: "at {{status}}", status: updated.status }) : t("live.step.noStatus", "no status returned") }
    } catch (e) {
      outcome = { step, outcome: "failed", detail: stepFailureReason(e, t) }
    }
    setPipelineSteps((prev) => [...prev.filter((o) => o.step !== step), outcome])
  }

  const bankByCompetency = useMemo(() => {
    const map = new Map<string, StarCompetency>()
    bank?.sections.forEach((s) => s.competencies.forEach((c) => map.set(c.id, c)))
    return map
  }, [bank])

  const overallParts = slotSplit(
    t("live.results.overall", { defaultValue: "Overall score: {{score}} / 5 · Mean: {{mean}}", score: SLOT, mean: SLOT }),
  )

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
        candidate: { display_name: candidate.display_name, external_id: candidate.external_id },
        consent,
        requisitionId: f.requisitionId,
        requisitionLabel: f.requisitionLabel,
        // Job DNA link (IS-11c2): both ids or neither — finalise writes the
        // scorecard draft only when both are present.
        candidate_id: candidate.candidate_id,
        blueprint_id: candidate.blueprint_id,
        // S-3 / D3: NO subject_sub, ever. A Live scored interview is a
        // selection record; it must never reach anyone's development record.
        // interviewBodyForkParity.test.ts holds this line in place.
      })
      setSessionId(result.session_id)
      setPlan(result.plan)
      setIdx(0)
      setAnswers({})
      setFinalizeResult(null)
      setPipelineSteps([])
      setPhase("interview")
      // JS-12 — linking a candidate to a live interview schedules it.
      await recordPipelineStep("interview-scheduled", result.session_id)
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
    // Nothing rated means nothing to score; the server would answer 409.
    if (!Object.values(answers).some((a) => a.scored)) {
      toast.error(t("live.nothingRated", "Rate at least one answer before finishing the interview."))
      return
    }
    setPhase("findings")
    setFinalizeError(null)
    try {
      const result = await finalizeSession.mutateAsync({ sessionId })
      setFinalizeResult(result)
      // JS-12 — a finalised interview is a completed one. Never past this.
      await recordPipelineStep("interview-completed", sessionId)
    } catch (e) {
      // IS-F13. The phase is already "findings" by this point, so without an
      // error state the render falls to the !finalizeResult branch and spins
      // "Compiling the scored write-up…" FOREVER — the interviewer watching a
      // progress indicator for work that already failed, answers gone from the
      // screen, no way back but "New interview". A toast that vanishes is not
      // a state. This is pinned by a test in BOTH bodies; it was forked
      // verbatim, so fixing only one leaves the other stuck and green.
      const detail = apiErrorMessage(e, t("live.finalizeFailedDetail", "Could not finalize the interview."))
      setFinalizeError(detail)
      toast.error(t("live.finalizeFailed", "Could not finalize the interview. Please try again."))
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
      setCandidate(
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
        apiErrorMessage(e, t("live.openFailed", "Could not open that interview.")),
      )
    } finally {
      setOpeningSessionId(null)
    }
  }

  const restart = () => {
    setPhase("setup"); setSetupStep("consent")
    setConsent(null); setCandidate(null); setFrame(null)
    setSessionId(null); setPlan([]); setIdx(0); setAnswers({}); setFinalizeResult(null)
    setFinalizeError(null); setReadOnly(false); setPipelineSteps([])
  }

  // JS-11 — `?session=<id>` opens a stored session once (finished ones open
  // read-only; an in-progress one resumes). The ref keeps a re-render from
  // opening it twice.
  const openedFromUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (!deepLinkSessionId || openedFromUrlRef.current === deepLinkSessionId) return
    openedFromUrlRef.current = deepLinkSessionId
    void openSession(deepLinkSessionId, "resume")
    // openSession is recreated each render; the ref above makes this run once per id.
  }, [deepLinkSessionId])

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

  // ── SETUP ────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold">{t("live.title", "Live Scored Interview")}</h1>
          <p className="text-sm text-slate-600">
            {t("live.subtitle", "A real, scored interview of a candidate — advisory AI suggestions, your authoritative rating.")}
          </p>
        </header>
        {deepLink.state !== "idle" && <DeepLinkNotice deepLink={deepLink} />}
        {setupStep === "consent" && (
          <PastInterviewsPanel
            surface="live"
            busySessionId={openingSessionId}
            onResume={(sid) => void openSession(sid, "resume")}
            onReopen={(sid) => void openSession(sid, "reopen")}
          />
        )}
        {setupStep === "consent" && <ConsentGate onProceed={handleConsent} />}
        {setupStep === "candidate" && (
          <CandidateIdentityForm onConfirm={handleCandidate} initialLink={deepLink.link} />
        )}
        {setupStep === "frame" && (
          <InterviewFrameForm
            title={t("live.frame.title", "Set up a live interview")}
            description={t("live.frame.description", "Confirm the seat you're interviewing for so the STAR questions and scoring fit the actual role, reporting line, and scope.")}
            submitLabel={t("live.frame.submit", "Confirm & start the live interview")}
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
            <h1 className="text-2xl font-semibold">{t("live.results.title", "Interview Results")}</h1>
            <p className="text-sm text-slate-600">
              {candidate?.display_name} · {frame?.roleTitle} · {frame?.company}
            </p>
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
              <CardHeader><CardTitle className="text-base">{t("live.results.evidence", "What the evidence shows")}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg font-semibold text-slate-900">{finalizeResult.recommendation}</p>
                <ScorecardDraftLine linked={!!candidate?.candidate_id} report={finalizeResult.scorecard_draft} />
                <PipelineStepLines outcomes={pipelineSteps} />
                <p className="text-sm text-slate-600">
                  {overallParts[0]}
                  <span className="font-medium">{fmtScore(finalizeResult.overall_score)}</span>
                  {overallParts[1]}
                  <span className="font-medium">{fmtScore(finalizeResult.overall_mean)}</span>
                  {overallParts[2]}
                </p>
              </CardContent>
            </Card>

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
                    <span className="text-slate-700">{s.section}</span>
                    <span className="font-medium">{t("live.results.scoreOfFive", { defaultValue: "{{score}} / 5", score: fmtScore(s.score) })}</span>
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{a.competency_id}</p>
                    {a.question_text && <p className="mt-1 text-sm font-medium text-slate-900">{a.question_text}</p>}
                    <p className="mt-1 text-sm text-slate-700">{a.captured_answer}</p>
                    {/* Read `final_source`, never `final_score`. Every answer row is
                        SEEDED with a score at insert, so a legacy answer nobody rated
                        still carries a number — printing it as "Final score: 3 / 5"
                        attributes to the interviewer a judgement they never made. That
                        is the whole reason IS-4 added the column. Pre-IS-4 answers say
                        so, and are never back-filled. */}
                    {a.final_source ? (
                      <p className="mt-1 text-sm text-indigo-700">
                        {t("live.results.finalScore", { defaultValue: "Final score: {{score}} / 5", score: a.final_score ?? "—" })}
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
          <h1 className="text-2xl font-semibold">{t("live.title", "Live Scored Interview")}</h1>
          <p className="text-sm text-slate-600">
            {candidate?.display_name} · {frame?.roleTitle} · {frame?.company}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={guardedFinish}>
          <Flag className="mr-1 h-3.5 w-3.5" /> {t("live.endInterview", "End interview")}
        </Button>
      </header>
      <PipelineStepLines outcomes={pipelineSteps} />

      {total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t("answer.questionOf", { defaultValue: "Question {{number}} of {{total}} · {{section}}", number: current ? idx + 1 : 0, total, section: current?.section ?? "" })}</span>
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
            // A Live scored interview is always a hiring interview — there is no
            // kind selector on this surface. Passed explicitly rather than left to
            // the default so the fork parity test can see both sides.
            developmentMode={false}
            bankEntry={bankByCompetency.get(current.competency_id)}
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
