import { useMemo, useState } from "react"
import { Navigate } from "react-router-dom"
import { FileDown, Loader2, Pause, Play, UserRound } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ROUTES } from "@/constants/routes"
import {
  currentSession,
  useCareerExerciseSwitch,
  useMyAgeStep,
  useMyExerciseSessions,
  usePauseExercise,
  useRefreshMyExercise,
  useResumeExercise,
  useRoleFactReads,
  useStartExercise,
} from "@/hooks/career-exercise/useCareerExercise"
import { downloadBlob } from "@/lib/exportTranscript"
import { renderHtmlToPdf } from "@/lib/exportTranscript/renderPdf"
import type { AgeStep, ExerciseSession, RoleFactCells } from "@/types/career-exercise/student"
import { BirthYearStep } from "./BirthYearStep"
import { ExerciseChat } from "./ExerciseChat"
import { exerciseErrorMessage } from "./exerciseErrors"
import { roleCells } from "./factCells"
import { Worksheet } from "./Worksheet"
import { STAGE_LABELS, STATUS_LABELS, buildWorksheetHtml, worksheetFileBase } from "./worksheetModel"

/**
 * CX-5 — the Career Exploration exercise, for the student: the worksheet on one
 * side, filling in live from the session the server keeps, and the chat beside
 * it. Pause, resume where you left off, and download the worksheet as a PDF.
 *
 * Behind the `career_exercise` switch: until the server says it is on for the
 * signed-in person nothing else is asked, and off (or a failed read) the page
 * is not shown — the person is sent to the vertical's home, so every existing
 * route behaves exactly as before. The switch read is presentation, not
 * security: every exercise route refuses itself while the switch is off.
 */
export default function CareerExercisePage() {
  const sw = useCareerExerciseSwitch()
  if (sw === "loading") {
    return (
      <div className="space-y-3 p-6" aria-busy="true" aria-label="Checking the career exercise">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (sw !== "on") return <Navigate to={ROUTES.CAREER_DISCOVERY.BASE} replace />
  return <ExerciseHome />
}

function Alert({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm">
      {message}
    </div>
  )
}

/**
 * CX-AGE — said after the birth-year step when the exercise is still not open
 * to the person. The same words the chat's counselor notice uses; nothing
 * about why, so no cut-off can be read from it.
 */
function CounselorNotice() {
  return (
    <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-medium">
        <UserRound className="h-4 w-4" aria-hidden />
        Talk to your counselor
      </p>
      <p className="mt-1">The exercise has stopped here for now and your counselor is the next step.</p>
    </div>
  )
}

function ExerciseHome() {
  const sessions = useMyExerciseSessions(true)
  const start = useStartExercise()
  // CX-AGE: a failed read of the step is not a block — the exercise's own
  // guardrails still decide every turn, exactly as before the step existed.
  const ageStep = useMyAgeStep(true)
  const [stepAnswer, setStepAnswer] = useState<AgeStep | null>(null)

  if (sessions.isPending || ageStep.isPending) {
    return (
      <div className="space-y-3 p-6" aria-busy="true" aria-label="Loading your exercise">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const header = (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold">Career exploration</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Work out how you work best, what matters to you, and which careers are worth a closer look — then test them
        in the real world. Nothing here is a verdict: every option is a hypothesis to test.
      </p>
    </header>
  )

  if (sessions.isError) {
    return (
      <div className="space-y-6 p-6">
        {header}
        <Alert message={exerciseErrorMessage(sessions.error, "Your exercise could not be loaded. Try again shortly.")} />
      </div>
    )
  }

  if (ageStep.data?.needsBirthYear) {
    return (
      <div className="space-y-6 p-6">
        {header}
        <BirthYearStep onDone={setStepAnswer} />
      </div>
    )
  }

  const counselorNotice = stepAnswer?.next === "counselor" ? <CounselorNotice /> : null
  const session = currentSession(sessions.data?.sessions)
  const startButton = (label: string) => (
    <div className="space-y-2">
      <Button type="button" onClick={() => start.mutate()} disabled={start.isPending}>
        {start.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
        {label}
      </Button>
      {start.isError && (
        <Alert message={exerciseErrorMessage(start.error, "The exercise could not be started. Try again shortly.")} />
      )}
    </div>
  )

  if (!session) {
    return (
      <div className="space-y-6 p-6">
        {header}
        {counselorNotice}
        <div className="rounded-xl border bg-card p-6 text-sm">
          <p className="mb-4">
            It takes a few short sessions. You can stop whenever you like and pick up exactly where you left off.
          </p>
          {startButton("Start the exercise")}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {header}
      {counselorNotice}
      <SessionView session={session} />
      {session.status === "closed" && (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="mb-3">You finished this exercise. Your worksheet is above; you can start a fresh one at any time.</p>
          {startButton("Start a new exercise")}
        </div>
      )}
    </div>
  )
}

function SessionView({ session }: { session: ExerciseSession }) {
  const pause = usePauseExercise()
  const resume = useResumeExercise()
  const refresh = useRefreshMyExercise()
  const reads = useRoleFactReads(session.roles)
  const [pdfBusy, setPdfBusy] = useState(false)

  const cells = useMemo(() => {
    const out: Record<string, RoleFactCells> = {}
    for (const r of session.roles) out[r.onet_soc] = roleCells(r, reads[r.onet_soc])
    return out
  }, [session.roles, reads])

  // Always the version on screen: a stale one is refused by the server (409).
  const versioned = { sessionId: session.session_id, version: session.version }
  const actionError = pause.error ?? resume.error

  async function downloadPdf() {
    setPdfBusy(true)
    try {
      const blob = await renderHtmlToPdf(buildWorksheetHtml(session, cells))
      downloadBlob(`${worksheetFileBase(session)}.pdf`, blob)
      toast.success("Worksheet downloaded.")
    } catch {
      toast.error("Could not generate the PDF.")
    } finally {
      setPdfBusy(false)
    }
  }

  const disabledReason =
    session.status === "paused"
      ? "Your exercise is paused. Resume it to carry on."
      : session.status === "closed"
        ? "You finished this exercise."
        : undefined

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">
          <span className="font-medium">{STATUS_LABELS[session.status]}</span>
          <span className="text-muted-foreground"> · step: {STAGE_LABELS[session.stage]}</span>
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          {session.status === "active" && (
            <Button type="button" variant="outline" size="sm" disabled={pause.isPending} onClick={() => pause.mutate(versioned)}>
              <Pause className="mr-1 h-4 w-4" aria-hidden /> Pause
            </Button>
          )}
          {session.status === "paused" && (
            <Button type="button" size="sm" disabled={resume.isPending} onClick={() => resume.mutate(versioned)}>
              <Play className="mr-1 h-4 w-4" aria-hidden /> Resume where I left off
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={pdfBusy} onClick={() => void downloadPdf()}>
            {pdfBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="mr-1 h-4 w-4" aria-hidden />}
            Download worksheet (PDF)
          </Button>
        </div>
      </div>
      {actionError && (
        <Alert message={exerciseErrorMessage(actionError, "That didn't work. Try again shortly.")} />
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Worksheet session={session} cells={cells} />
        <div className="lg:sticky lg:top-4 lg:self-start">
          <ExerciseChat
            sessionId={session.session_id}
            canSend={session.status === "active"}
            disabledReason={disabledReason}
            onTurnSettled={refresh}
          />
        </div>
      </div>
    </>
  )
}
