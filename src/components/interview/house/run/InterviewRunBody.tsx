/**
 * House style S4b — ONE interview build with three kinds.
 *
 * Replaces, behind `isHouseStyleOn("interview")` only, the two forks
 * LiveInterviewBody (Hiring) and StudioInterviewBody (Your own questions,
 * Development conversation). Those two files are not edited and render
 * whenever the switch is off.
 *
 * What is ONE here: the state machine, the session service calls, resume and
 * reopen, the guarded finish, the finalize-error state, export. A fix to any of
 * them is now made once.
 *
 * What is held identical to today, per source (`star` = Live, `custom` =
 * Studio), and proved by side-by-side tests on today's session shapes:
 *   - every request body (create / answer / rate / finalize) — in particular
 *     `subject_sub` is sent ONLY on a custom development session and NEVER on
 *     a hiring one (S-3 / D3: a selection interview never reaches anyone's
 *     development record);
 *   - the write-up (findings screen) and the export payload;
 *   - the Job Blueprint pipeline-step writes (star only, as today).
 *
 * Setup order is today's (consent → who → questions). Changing it is S4c.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowRight, CheckCircle2, Flag } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import ConsentGate from "@/components/interview/ConsentGate"
import AnswerScorePanel from "@/components/interview/AnswerScorePanel"
import PastInterviewsPanel from "@/components/interview/PastInterviewsPanel"
import InterviewFrameForm from "@/components/interview/InterviewFrameForm"
import StudioQuestionBuilder from "@/components/interview/StudioQuestionBuilder"
import InterviewSubjectPicker from "@/components/interview/InterviewSubjectPicker"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { useAuth } from "@/context/useAuth"
import { useQuestionBank } from "@/hooks/interview/useQuestionBank"
import { useDeepLinkedCandidate } from "@/hooks/interview/useDeepLinkedCandidate"
import { useSetInterviewStep } from "@/hooks/job-blueprint/useTriage"
import {
  useCreateLiveSession,
  useFinalizeLiveSession,
  useScoreLiveAnswer,
  useSubmitLiveAnswer,
} from "@/hooks/interview/useLiveInterview"
import type { InterviewFrame } from "@/services/interview/practice.service"
import type { StarCompetency } from "@/services/interview/interview.service"
import { liveInterviewService } from "@/services/interview/live.service"
import { finalizeResultFromDetail, rehydrateSession } from "@/services/interview/liveSessionResume"
import type {
  FinalizeResult,
  LiveAnswer,
  LiveCandidate,
  LiveConsent,
  LiveEmployerMeta,
  LivePlanQuestion,
  LiveTailoringMeta,
  SubmitAnswerResult,
} from "@/services/interview/live.service"
import { downloadScoredInterview, saveScoredInterviewToDocuments } from "@/services/interview/interviewExport"
import type { InterviewStep } from "@/types/job-blueprint"

import InterviewWriteUp, { type ExportKind } from "./InterviewWriteUp"
import {
  CandidateIdentityForm,
  DeepLinkNotice,
  KindPicker,
  ParticipantForm,
  PipelineStepLines,
  ProvenanceNotice,
} from "./runParts"
import {
  KIND_OPTIONS,
  builderKindOf,
  kindOfFrame,
  sourceOf,
  stepFailureReason,
  type PipelineStepOutcome,
  type RunKind,
} from "./runFormat"

type Phase = "setup" | "interview" | "findings"
type SetupStep = "consent" | "who" | "questions"

type AnswerState = {
  suggestion: SubmitAnswerResult | null
  scored: LiveAnswer | null
}

export type InterviewRunBodyProps = {
  /** The kind the page starts on: Live's address starts on Hiring, Studio's on Your own questions. */
  initialKind: RunKind
}

export default function InterviewRunBody({ initialKind }: InterviewRunBodyProps) {
  const { user } = useAuth()

  // JS-10 / JS-11 — the address can name a candidate to pre-link (a hiring
  // interview) or a stored session to open.
  const [params] = useSearchParams()
  const deepLinkBlueprintId = params.get("blueprintId") ?? ""
  const deepLinkCandidateId = params.get("candidateId") ?? ""
  const deepLinkSessionId = params.get("session") ?? ""
  const deepLink = useDeepLinkedCandidate(deepLinkBlueprintId, deepLinkCandidateId)

  const [kind, setKind] = useState<RunKind>(
    deepLinkBlueprintId && deepLinkCandidateId ? "hiring" : initialKind,
  )
  const source = sourceOf(kind)

  // The standard bank is the "what to listen for" reference on a hiring
  // interview only — not fetched for the other kinds, as Studio never did.
  const { data: bank } = useQuestionBank({ includeExemplars: true, enabled: source === "star" })

  const [phase, setPhase] = useState<Phase>("setup")
  const [setupStep, setSetupStep] = useState<SetupStep>("consent")
  const [consent, setConsent] = useState<LiveConsent | null>(null)
  const [person, setPerson] = useState<LiveCandidate | null>(null)
  const [frame, setFrame] = useState<InterviewFrame | null>(null)
  // S-3: the development subject — cleared the moment the style is not development.
  const [subject, setSubject] = useState<string | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [employer, setEmployer] = useState<LiveEmployerMeta | null>(null)
  const [tailoring, setTailoring] = useState<LiveTailoringMeta | null>(null)
  const [plan, setPlan] = useState<LivePlanQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResult | null>(null)
  const [exporting, setExporting] = useState<ExportKind | null>(null)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  /** A reopened session is REVIEW ONLY — never re-finalized, never re-rated. */
  const [readOnly, setReadOnly] = useState(false)
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null)
  /** JS-12 — outcome of each pipeline-step write for the linked candidate (hiring only). */
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStepOutcome[]>([])

  const createSession = useCreateLiveSession()
  const submitAnswer = useSubmitLiveAnswer()
  const scoreAnswer = useScoreLiveAnswer()
  const finalizeSession = useFinalizeLiveSession()
  const setInterviewStep = useSetInterviewStep()

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

  /** JS-12 — never blocks the interview; hiring (star) only, exactly as Live. */
  const recordPipelineStep = async (step: InterviewStep, sid: string) => {
    if (source !== "star") return
    const candidateId = person?.candidate_id
    if (!candidateId) return
    let outcome: PipelineStepOutcome
    try {
      const updated = await setInterviewStep.mutateAsync({ candidateId, step, interviewSessionId: sid })
      outcome =
        updated?.status === step
          ? { step, outcome: "moved" }
          : { step, outcome: "unchanged", detail: updated?.status ? `at ${updated.status}` : "no status returned" }
    } catch (e) {
      outcome = { step, outcome: "failed", detail: stepFailureReason(e) }
    }
    setPipelineSteps((prev) => [...prev.filter((o) => o.step !== step), outcome])
  }

  // ── Setup ───────────────────────────────────────────────────────
  const handleConsent = (c: LiveConsent) => {
    setConsent(c)
    setSetupStep("who")
  }

  const handleWho = (c: LiveCandidate) => {
    setPerson(c)
    setSetupStep("questions")
  }

  /** Byte-for-byte Live's create body: S-3 / D3, NO subject_sub, ever. */
  const createStar = (f: InterviewFrame, p: LiveCandidate, c: LiveConsent) =>
    createSession.mutateAsync({
      frame: f,
      candidate: { display_name: p.display_name, external_id: p.external_id },
      consent: c,
      requisitionId: f.requisitionId,
      requisitionLabel: f.requisitionLabel,
      candidate_id: p.candidate_id,
      blueprint_id: p.blueprint_id,
    })

  /** Byte-for-byte Studio's create body: subject_sub only on a development frame. */
  const createCustom = (f: InterviewFrame, p: LiveCandidate, c: LiveConsent) =>
    createSession.mutateAsync({
      frame: f,
      candidate: { display_name: p.display_name, external_id: p.external_id },
      consent: c,
      requisitionId: f.requisitionId,
      requisitionLabel: f.requisitionLabel,
      candidate_id: p.candidate_id,
      blueprint_id: p.blueprint_id,
      ...(f.kind === "general" && subject ? { subject_sub: subject } : {}),
    })

  const handleFrameConfirm = async (f: InterviewFrame) => {
    if (!person || !consent) return
    setFrame(f)
    try {
      const result = source === "star" ? await createStar(f, person, consent) : await createCustom(f, person, consent)
      setSessionId(result.session_id)
      setPlan(result.plan)
      if (source === "custom") {
        setEmployer(result.employer ?? null)
        setTailoring(result.tailoring ?? null)
      }
      setIdx(0)
      setAnswers({})
      setFinalizeResult(null)
      setPipelineSteps([])
      setPhase("interview")
      // JS-12 — linking a candidate to a hiring interview schedules it.
      await recordPipelineStep("interview-scheduled", result.session_id)
    } catch {
      toast.error("Could not start the interview. Please try again.")
    }
  }

  // ── Interview ───────────────────────────────────────────────────
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
    // A reopened interview is a record, not a draft. Unreachable from the UI
    // (no control calls finish() once a result is shown); kept as defence. The
    // enforcing guard is the server's 409.
    if (readOnly) return
    setPhase("findings")
    setFinalizeError(null)
    try {
      const result = await finalizeSession.mutateAsync({ sessionId })
      setFinalizeResult(result)
      // JS-12 — a finalised hiring interview is a completed one.
      await recordPipelineStep("interview-completed", sessionId)
    } catch (e) {
      // IS-F13 — a failed finalize is a state on screen, never a forever-spinner.
      const detail =
        e instanceof Error && e.message ? e.message : "Could not finalize the interview."
      setFinalizeError(detail)
      toast.error("Could not finalize the interview. Please try again.")
    }
  }

  /** Ending with the current answer unsaved loses it, so confirm first. */
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

  // ── Past interviews: resume + reopen ─────────────────────────────
  /**
   * Open a stored session in the kind it was run as. A reopened (or finished)
   * session is NEVER re-finalized: its roll-up is the record of a decision
   * already made.
   */
  const openSession = async (sid: string, mode: "resume" | "reopen") => {
    setOpeningSessionId(sid)
    try {
      const detail = await liveInterviewService.getSession(sid)
      const fallbackName =
        detail.candidate_ref?.display_name?.trim() ||
        (detail.candidate_ref?.candidate_hash
          ? `Candidate ${detail.candidate_ref.candidate_hash.slice(0, 8)}`
          : "Candidate not recorded")

      setKind(kindOfFrame(detail.session.frame as { mode?: string; kind?: string } | null))
      setSessionId(sid)
      setFrame(detail.session.frame ?? null)
      setPerson(
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
        toast.error("That interview has no recorded question plan, so it cannot be resumed.")
        return
      }
      setReadOnly(false)
      setPlan(rehydrated.plan)
      setAnswers(rehydrated.answers)
      setIdx(rehydrated.startIndex)
      setFinalizeResult(null)
      setPhase("interview")
      if (rehydrated.complete) {
        toast.info("Every question in this interview has been answered — review and finish it.")
      }
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : "Could not open that interview.",
      )
    } finally {
      setOpeningSessionId(null)
    }
  }

  const restart = () => {
    setPhase("setup"); setSetupStep("consent")
    setConsent(null); setPerson(null); setFrame(null); setSubject(null)
    setSessionId(null); setPlan([]); setIdx(0); setAnswers({}); setFinalizeResult(null)
    setFinalizeError(null); setReadOnly(false); setPipelineSteps([])
    setEmployer(null); setTailoring(null)
  }

  // JS-11 — `?session=<id>` opens a stored session once per id.
  const openedFromUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (!deepLinkSessionId || openedFromUrlRef.current === deepLinkSessionId) return
    openedFromUrlRef.current = deepLinkSessionId
    void openSession(deepLinkSessionId, "resume")
    // openSession is recreated each render; the ref above makes this run once per id.
  }, [deepLinkSessionId])

  /** Same payload as both old bodies: the finalize result and the interviewer label. */
  const doExport = async (k: ExportKind) => {
    if (!finalizeResult) return
    setExporting(k)
    try {
      if (k === "save") {
        await saveScoredInterviewToDocuments({ result: finalizeResult, userLabel: user?.name || user?.email })
        toast.success("Saved to your Document Library.")
      } else {
        await downloadScoredInterview({ result: finalizeResult, userLabel: user?.name || user?.email }, k)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.")
    } finally {
      setExporting(null)
    }
  }

  const kindLabel = KIND_OPTIONS.find((o) => o.value === kind)?.label ?? ""

  // ── SETUP ──────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <PageHeader title="Interviews" description="Run a scored interview, or look back at one." />
        {setupStep === "consent" ? (
          // The subject is chosen later, inside the builder, so nothing to clear here.
          <KindPicker value={kind} onChange={setKind} />
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="run-kind">
            {kindLabel}
            {" · "}
            <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={restart}>
              Change
            </button>
          </p>
        )}
        {source === "star" && deepLink.state !== "idle" && <DeepLinkNotice deepLink={deepLink} />}
        {setupStep === "consent" && (
          <PastInterviewsPanel
            surface={source === "star" ? "live" : "studio"}
            busySessionId={openingSessionId}
            onResume={(sid) => void openSession(sid, "resume")}
            onReopen={(sid) => void openSession(sid, "reopen")}
          />
        )}
        {setupStep === "consent" && <ConsentGate onProceed={handleConsent} />}
        {setupStep === "who" &&
          (source === "star" ? (
            <CandidateIdentityForm onConfirm={handleWho} initialLink={deepLink.link} />
          ) : (
            <ParticipantForm onConfirm={handleWho} />
          ))}
        {setupStep === "questions" &&
          (source === "star" ? (
            <InterviewFrameForm
              title="Set up a live interview"
              description="Confirm the seat you're interviewing for so the STAR questions and scoring fit the actual role, reporting line, and scope."
              submitLabel="Confirm & start the live interview"
              showRequisition
              onConfirm={(f) => void handleFrameConfirm(f)}
            />
          ) : (
            <StudioQuestionBuilder
              initialKind={builderKindOf(kind)}
              submitting={createSession.isPending}
              onConfirm={(f) => void handleFrameConfirm(f)}
              onKindChange={(k) => {
                setKind(k === "general" ? "development" : "own")
                if (k !== "general") setSubject(null)
              }}
              developmentOnly={<InterviewSubjectPicker value={subject} onChange={setSubject} />}
            />
          ))}
      </div>
    )
  }

  // ── FINDINGS (the write-up: identical to today's, per source) ───
  if (phase === "findings") {
    return (
      <InterviewWriteUp
        source={source}
        finalizeResult={finalizeResult}
        finalizeError={finalizeError}
        readOnly={readOnly}
        exporting={exporting}
        onExport={(k) => void doExport(k)}
        onRestart={restart}
        onRetry={() => void finish()}
        person={person}
        frame={frame}
        pipelineSteps={pipelineSteps}
        employer={employer}
        tailoring={tailoring}
      />
    )
  }

  // ── INTERVIEW ──────────────────────────────────────────────────
  const isHiringFrame = frame?.kind === "hiring"
  const subtitle =
    source === "star"
      ? `${person?.display_name ?? ""} · ${frame?.roleTitle ?? ""} · ${frame?.company ?? ""}`
      : [person?.display_name, frame?.topic].filter(Boolean).join(" · ")
  const sectionLabel =
    source === "star"
      ? ` · ${current?.section ?? ""}`
      : current?.section ? ` · ${current.section.replace(/_/g, " ")}` : ""

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{kindLabel}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={guardedFinish}>
          <Flag className="mr-1 h-3.5 w-3.5" /> End interview
        </Button>
      </header>
      {source === "star" ? (
        <PipelineStepLines outcomes={pipelineSteps} />
      ) : (
        <ProvenanceNotice employer={employer} tailoring={tailoring} />
      )}

      {total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Question {current ? idx + 1 : 0} of {total}{sectionLabel}</span>
            <span>
              Running tally: {savedCount}/{total} scored{savedAvg != null ? ` · avg ${savedAvg.toFixed(2)}` : ""}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
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
            // Hiring (Live) is always a hiring interview; Studio bands by its frame.
            developmentMode={source === "star" ? false : !isHiringFrame}
            bankEntry={source === "star" ? bankByCompetency.get(current.competency_id) : undefined}
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
