/**
 * /interview-practice — Candidate Interview Coach (structured interview).
 *
 * Three phases:
 *   1) SETUP  — confirm the interview frame (seat, weighting) + number of
 *      questions and length. This builds a BOUNDED, ordered question plan.
 *   2) RUN    — a real interview: "Question X of N — <Section>", answer (typed or
 *      by voice), get supportive coaching, advance. Ends after N questions or
 *      when the user clicks "End interview" — it never loops forever.
 *   3) FINDINGS — a developmental read-out (Key Strengths, Areas to Improve,
 *      Recommended Actions, Coverage, Confidence) — NO score — plus the full
 *      Q&A transcript and a Print button.
 *
 * Voice mode uses the Meridian voice (server OpenAI TTS via useTTS) to read
 * questions + coaching aloud, and useSpeechDictation to capture spoken answers.
 * Coaching + findings run over the async-job chat path (useMeridianJob).
 */
import { useEffect, useRef, useState } from "react"
import {
  Loader2, RefreshCw, ArrowRight, MessageSquareText, Mic, MicOff,
  Volume2, Pencil, Printer, Flag, CheckCircle2,
} from "lucide-react"

import UserLayout from "@/layouts/UserLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

import InterviewFrameForm from "@/components/interview/InterviewFrameForm"
import { usePracticeQuestions } from "@/hooks/interview/usePracticeQuestions"
import { useSpeechDictation } from "@/hooks/interview/useSpeechDictation"
import { useMeridianJob, type ChatJob } from "@/hooks/agents/useMeridianJob"
import { useMeridianVoice } from "@/hooks/interview/useMeridianVoice"
import {
  buildCoachMessage,
  buildFindingsMessage,
  buildInterviewPlan,
  practiceJobContext,
  frameQuestionCount,
  frameLengthMinutes,
  type InterviewExchange,
  type InterviewFrame,
  type PlannedQuestion,
} from "@/services/interview/practice.service"

type Phase = "setup" | "interview" | "findings"

function newSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  } catch { /* ignore */ }
  return `practice-${Date.now()}`
}

export default function InterviewPracticePage() {
  const { data, isLoading, isError } = usePracticeQuestions()
  const [sessionId] = useState(newSessionId)

  const [phase, setPhase] = useState<Phase>("setup")
  const [frame, setFrame] = useState<InterviewFrame | null>(null)
  const [plan, setPlan] = useState<PlannedQuestion[]>([])
  const [idx, setIdx] = useState(0)

  const [answer, setAnswer] = useState("")
  const [coaching, setCoaching] = useState<Record<number, string>>({})
  const [exchanges, setExchanges] = useState<InterviewExchange[]>([])
  const [busy, setBusy] = useState(false)
  const [findings, setFindings] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState(false)

  const pendingRef = useRef<{ kind: "coach"; number: number } | { kind: "findings" } | null>(null)

  const { speak, stop: stopSpeaking } = useMeridianVoice("nova")
  const dictation = useSpeechDictation({
    onFinal: (chunk) => setAnswer((prev) => (prev ? `${prev} ${chunk}` : chunk)),
  })

  const { startJob } = useMeridianJob({
    onJobSettled: (job: ChatJob) => {
      setBusy(false)
      const pending = pendingRef.current
      pendingRef.current = null
      if (job.status === "error") {
        toast.error(job.error || "Something went wrong — please try again.")
        return
      }
      const content = job.content || ""
      if (pending?.kind === "findings") {
        setFindings(content)
        if (voiceMode && content) void speak(content)
      } else if (pending?.kind === "coach") {
        setCoaching((prev) => ({ ...prev, [pending.number]: content }))
        if (voiceMode && content) void speak(content)
      }
    },
  })

  const current = plan[idx] ?? null
  const total = plan.length
  const isLast = idx === total - 1
  const currentCoaching = current ? coaching[current.number] : undefined

  // Read each new question aloud in voice mode.
  const spokenRef = useRef<number | null>(null)
  useEffect(() => {
    if (voiceMode && phase === "interview" && current && spokenRef.current !== current.number) {
      spokenRef.current = current.number
      void speak(`Question ${current.number} of ${total}. ${current.question}`)
    }
  }, [voiceMode, phase, current, total, speak])

  // ── Actions ──────────────────────────────────────────────────
  const startInterview = (f: InterviewFrame) => {
    if (!data) return
    setFrame(f)
    setPlan(buildInterviewPlan(data, f))
    setIdx(0)
    setAnswer("")
    setCoaching({})
    setExchanges([])
    setFindings(null)
    setPhase("interview")
  }

  const submitAnswer = async () => {
    if (!current || !answer.trim() || busy) return
    dictation.stop(); stopSpeaking()
    setBusy(true)
    // Record the exchange (idempotent per question number).
    setExchanges((prev) => {
      const rest = prev.filter((e) => e.number !== current.number)
      return [...rest, {
        number: current.number,
        sectionTitle: current.sectionTitle,
        competency: current.competency,
        question: current.question,
        answer: answer.trim(),
      }].sort((a, b) => a.number - b.number)
    })
    pendingRef.current = { kind: "coach", number: current.number }
    try {
      await startJob({
        message: buildCoachMessage(current.question, answer.trim(), frame),
        sessionId,
        context: practiceJobContext(frame),
      })
    } catch (e) {
      setBusy(false); pendingRef.current = null
      toast.error(e instanceof Error ? e.message : "Could not get coaching.")
    }
  }

  const next = () => {
    if (isLast) { void finish(); return }
    setIdx((i) => i + 1)
    setAnswer("")
  }

  const finish = async (endedEarly = false) => {
    if (!frame) return
    dictation.stop(); stopSpeaking()
    setPhase("findings")
    // Compile findings from whatever was answered.
    const answered = exchanges
    if (answered.length === 0) {
      setFindings("You ended the interview before answering any questions, so there's nothing to summarize yet. Start again whenever you're ready — even one full answer gives us something to work with.")
      return
    }
    setBusy(true)
    pendingRef.current = { kind: "findings" }
    try {
      await startJob({
        message: buildFindingsMessage(frame, answered),
        sessionId,
        context: practiceJobContext(frame),
      })
    } catch (e) {
      setBusy(false); pendingRef.current = null
      toast.error(e instanceof Error ? e.message : "Could not compile findings.")
    }
    void endedEarly
  }

  const restart = () => {
    setPhase("setup"); setFrame(null); setPlan([]); setIdx(0)
    setAnswer(""); setCoaching({}); setExchanges([]); setFindings(null)
    spokenRef.current = null
  }

  // ── Render: SETUP ────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <UserLayout>
        <div className="mx-auto max-w-3xl py-8 space-y-4">
          <header>
            <h1 className="text-2xl font-semibold">Interview Practice</h1>
            <p className="text-sm text-slate-600">
              A structured practice interview with supportive coaching — no scores,
              just tips to help your story land. You choose how many questions.
            </p>
          </header>
          {isLoading && <div className="flex items-center py-16 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>}
          {isError && <Card><CardContent className="py-8 text-sm text-rose-600">Couldn't load the question bank. Please try again later.</CardContent></Card>}
          {data && <InterviewFrameForm onConfirm={startInterview} />}
        </div>
      </UserLayout>
    )
  }

  // ── Render: FINDINGS ─────────────────────────────────────────
  if (phase === "findings" && frame) {
    const planned = frameQuestionCount(frame)
    return (
      <UserLayout>
        <div className="mx-auto max-w-3xl py-8 space-y-4 print:max-w-none print:py-0">
          <header className="flex items-start justify-between gap-4 print:block">
            <div>
              <h1 className="text-2xl font-semibold">Interview Findings</h1>
              <p className="text-sm text-slate-600">
                {frame.roleTitle} · {frame.company} — {exchanges.length} of {planned} questions answered
                {" · "}{frameLengthMinutes(frame)} min target
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={restart}>
                <RefreshCw className="mr-2 h-4 w-4" /> New interview
              </Button>
            </div>
          </header>

          <Card>
            <CardHeader><CardTitle className="text-base">Coaching summary</CardTitle></CardHeader>
            <CardContent>
              {busy && !findings ? (
                <div className="flex items-center py-6 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Compiling your findings…</div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-slate-700">{findings}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Full transcript ({exchanges.length} answered)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {exchanges.map((e) => (
                <div key={e.number} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Question {e.number} · {e.sectionTitle} · {e.competency}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{e.question}</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Your answer:</span> {e.answer}</p>
                  {coaching[e.number] && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-indigo-700"><span className="font-semibold">Coaching:</span> {coaching[e.number]}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </UserLayout>
    )
  }

  // ── Render: INTERVIEW ────────────────────────────────────────
  return (
    <UserLayout>
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Interview Practice</h1>
            <p className="text-sm text-slate-600">{frame?.roleTitle} · {frame?.company}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-slate-500" />
              <Label htmlFor="voice-mode" className="text-xs text-slate-600">Voice mode</Label>
              <Switch id="voice-mode" checked={voiceMode}
                onCheckedChange={(v) => { setVoiceMode(v); if (!v) { stopSpeaking(); dictation.stop() } }} />
            </div>
            <Button variant="ghost" size="sm" onClick={restart}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit setup
            </Button>
          </div>
        </header>

        {/* Progress */}
        {total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Question {current?.number} of {total} · {current?.sectionTitle}</span>
              <Button variant="ghost" size="sm" className="h-6 text-rose-600 hover:text-rose-700" onClick={() => void finish(true)}>
                <Flag className="mr-1 h-3.5 w-3.5" /> End interview
              </Button>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${((current?.number ?? 1) / total) * 100}%` }} />
            </div>
          </div>
        )}

        {current && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="secondary" className="mb-1 w-fit">{current.competency}</Badge>
                  <CardTitle className="text-base font-medium leading-snug">{current.question}</CardTitle>
                </div>
                {voiceMode && (
                  <Button variant="ghost" size="sm" title="Read question aloud"
                    onClick={() => void speak(current.question)}>
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {current.starProbes.length > 0 && (
                <ul className="space-y-1">
                  {current.starProbes.map((p, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-500"><span aria-hidden>↳</span><span>{p}</span></li>
                  ))}
                </ul>
              )}

              <Textarea rows={6} placeholder="Tell your story — Situation, Task, Action, Result…"
                value={answer} onChange={(e) => setAnswer(e.target.value)} />

              {voiceMode && (
                <div className="flex items-center gap-2">
                  {dictation.supported ? (
                    <Button type="button" size="sm"
                      variant={dictation.listening ? "default" : "outline"} onClick={dictation.toggle}>
                      {dictation.listening
                        ? <><MicOff className="mr-2 h-4 w-4" /> Stop recording</>
                        : <><Mic className="mr-2 h-4 w-4" /> Answer by voice</>}
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500">Voice input isn't supported in this browser — please type.</span>
                  )}
                  {dictation.listening && <span className="text-xs text-indigo-600">Listening…</span>}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={submitAnswer} disabled={busy || !answer.trim()}>
                  {busy
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Coaching…</>
                    : <><MessageSquareText className="mr-2 h-4 w-4" /> Submit answer</>}
                </Button>
                {currentCoaching && (
                  <Button variant="outline" onClick={() => { setAnswer(""); setCoaching((c) => { const n = { ...c }; delete n[current.number]; return n }) }}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Try again
                  </Button>
                )}
                {currentCoaching && (
                  <Button variant={isLast ? "default" : "ghost"} onClick={next} disabled={busy}>
                    {isLast ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Finish &amp; view findings</> : <>Next question <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                )}
              </div>

              {currentCoaching && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Coaching</p>
                    {voiceMode && (
                      <Button variant="ghost" size="sm" title="Read coaching aloud" onClick={() => void speak(currentCoaching)}>
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{currentCoaching}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </UserLayout>
  )
}
