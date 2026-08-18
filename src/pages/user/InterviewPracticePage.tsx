/**
 * /interview-practice — Candidate Interview Coach (structured interview).
 *
 *   1) SETUP    — frame (seat + weighting) + number of questions & length.
 *   2) RUN      — "Question X of N", answer (typed or by voice), coaching over the
 *                 async-job path (same as Meridian chat here), advance. Bounded.
 *   3) FINDINGS — developmental read-out (no score) + full Q&A transcript, with
 *                 audio controls and Word / PDF / Save-to-My-Documents export.
 *
 * Voice mode reads questions + coaching aloud in the real Meridian voice
 * (useMeridianVoice → /v1/agents/voice/synthesize) with full transport controls,
 * and useSpeechDictation captures spoken answers. Latency matches Meridian via
 * the backend RAG-skip for interview turns + a tight async-job poll.
 */
import { useEffect, useRef, useState } from "react"
import {
  Loader2, RefreshCw, ArrowRight, MessageSquareText, Mic, MicOff,
  Volume2, Pencil, Printer, Flag, CheckCircle2, FileText, FileDown, Save, Sparkles,
  Building2,
} from "lucide-react"

import UserLayout from "@/layouts/UserLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

import { Link, useLocation } from "react-router-dom"

import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"
import type { PracticeRoleSeed } from "@/types/interviewRolePage"
import InterviewFrameForm from "@/components/interview/InterviewFrameForm"
import AudioControls from "@/components/interview/AudioControls"
import { usePracticeQuestions } from "@/hooks/interview/usePracticeQuestions"
import { useSpeechDictation } from "@/hooks/interview/useSpeechDictation"
import { useMeridianJob, type ChatJob } from "@/hooks/agents/useMeridianJob"
import { useMeridianVoice } from "@/hooks/interview/useMeridianVoice"
import {
  buildCoachMessage,
  buildFindingsMessage,
  buildInterviewPlan,
  getTailoredPracticeQuestions,
  practiceJobContext,
  practiceService,
  frameQuestionCount,
  frameLengthMinutes,
  type InterviewExchange,
  type InterviewFrame,
  type PlannedQuestion,
  type PracticeQuestions,
  type EmployerPackMatch,
} from "@/services/interview/practice.service"
import {
  downloadInterview,
  saveInterviewToDocuments,
  type InterviewSession,
} from "@/services/interview/interviewExport"

type Phase = "setup" | "interview" | "findings"

function newSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  } catch { /* ignore */ }
  return `practice-${Date.now()}`
}

export default function InterviewPracticePage() {
  const { data, isLoading, isError } = usePracticeQuestions()
  const { user } = useAuth()
  const [sessionId] = useState(newSessionId)

  // A role page ("Practice a {role} interview") navigates here with the role
  // title + a job-description seed; pre-fill the setup form from it.
  const location = useLocation()
  const roleSeed = (location.state as PracticeRoleSeed | null) ?? null
  const initialFrame: InterviewFrame | null = roleSeed?.roleTitle
    ? {
        company: "",
        industry: "",
        roleTitle: roleSeed.roleTitle,
        reportingLine: "",
        scope: "",
        jobDescription: roleSeed.jobDescription ?? "",
      }
    : null

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
  const [exporting, setExporting] = useState<"word" | "pdf" | "save" | null>(null)
  // Personalization: ground coaching in the user's OWN PRISM + ambient résumé,
  // fetched ONCE at interview start and replayed into each turn's job context.
  // On by default (their own data); a privacy-conscious user can turn it off.
  const [personalize, setPersonalize] = useState(true)
  const [personalContext, setPersonalContext] = useState("")
  const [personalizedApplied, setPersonalizedApplied] = useState(false)
  const [starting, setStarting] = useState(false)
  // Job-aware tailoring: when the frame has a role/job title, questions are
  // fetched from the LLM-backed tailored endpoint instead of the static bank.
  const [tailoredApplied, setTailoredApplied] = useState(false)
  // The curated employer/sector pack the backend matched from the frame, or
  // null when the company/industry are ones we do not cover.
  const [employerPack, setEmployerPack] = useState<EmployerPackMatch | null>(null)

  const pendingRef = useRef<{ kind: "coach"; number: number } | { kind: "findings" } | null>(null)

  const voice = useMeridianVoice("nova")
  const dictation = useSpeechDictation({
    onFinal: (chunk) => setAnswer((prev) => (prev ? `${prev} ${chunk}` : chunk)),
  })

  const finalize = (content: string) => {
    setBusy(false)
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending?.kind === "findings") {
      setFindings(content)
      if (voiceMode && content) void voice.speak(content)
    } else if (pending?.kind === "coach") {
      setCoaching((prev) => ({ ...prev, [pending.number]: content }))
      if (voiceMode && content) void voice.speak(content)
    }
  }

  // SSE streaming is disabled on this environment (chat/stream 404s), so the
  // coaching runs over the async-job path — the same path Meridian chat uses
  // here. A tighter poll interval trims the perceived lag; the big latency win
  // is the backend skipping the personal-RAG backfill for interview turns.
  const { startJob } = useMeridianJob({
    pollIntervalMs: 700,
    onJobSettled: (job: ChatJob) => {
      if (job.status === "error") {
        setBusy(false); pendingRef.current = null
        toast.error(job.error || "Something went wrong — please try again.")
        return
      }
      finalize(job.content ?? "")
    },
  })

  const current = plan[idx] ?? null
  const total = plan.length
  const isLast = idx === total - 1
  const currentCoaching = current ? coaching[current.number] : undefined

  const spokenRef = useRef<number | null>(null)
  useEffect(() => {
    if (voiceMode && phase === "interview" && current && spokenRef.current !== current.number) {
      spokenRef.current = current.number
      void voice.speak(`Question ${current.number} of ${total}. ${current.question}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode, phase, current, total])

  // ── Actions ──────────────────────────────────────────────────
  const startInterview = async (f: InterviewFrame) => {
    if (!data || starting) return
    setStarting(true)

    // Job-aware tailoring: when the candidate gave a role/job title, fetch
    // questions tailored to it (+ description, if pasted) instead of using
    // the static 12-competency bank. Falls back to the static bank server-side
    // (and again client-side via getTailoredPracticeQuestions) on any failure,
    // so the interview never breaks.
    // The frame already collects company + industry; passing them lets the
    // backend swap in a curated employer/sector pack for the competencies it
    // covers (verbatim, never model-rewritten) and tailor only the rest. An
    // employer we do not cover returns exactly the previous behaviour.
    const jobTitle = f.roleTitle?.trim()
    const company = f.company?.trim()
    const industry = f.industry?.trim()
    let bank: PracticeQuestions = data
    let tailored = false
    let pack: EmployerPackMatch | null = null
    if (jobTitle || company || industry) {
      bank = await getTailoredPracticeQuestions(
        jobTitle || "",
        f.jobDescription?.trim() || undefined,
        undefined,
        { company, industry },
      )
      tailored = Boolean(bank.tailored)
      pack = bank.employer ?? null
    }
    setTailoredApplied(tailored)
    setEmployerPack(pack)

    // ONE-TIME personalization fetch (cheap SQL, no pgvector). The result is
    // replayed into every turn's job context, so the per-turn path never pays a
    // retrieval cost. Degrades to empty when the backend flag is off or the user
    // has no PRISM/résumé on file — the coach then runs on bank + frame only.
    let pctx = ""
    if (personalize) {
      try {
        const res = await practiceService.getPracticeContext()
        pctx = res.enabled ? (res.personalContext || "") : ""
      } catch {
        pctx = "" // never block the interview on the personalization fetch
      }
    }
    setPersonalContext(pctx)
    setPersonalizedApplied(Boolean(pctx))
    setFrame(f); setPlan(buildInterviewPlan(bank, f)); setIdx(0)
    setAnswer(""); setCoaching({}); setExchanges([]); setFindings(null)
    setPhase("interview"); setStarting(false)
  }

  const submitAnswer = async () => {
    if (!current || !answer.trim() || busy) return
    dictation.stop(); voice.stop()
    setBusy(true)
    setExchanges((prev) => {
      const rest = prev.filter((e) => e.number !== current.number)
      return [...rest, {
        number: current.number, sectionTitle: current.sectionTitle,
        competency: current.competency, question: current.question, answer: answer.trim(),
      }].sort((a, b) => a.number - b.number)
    })
    pendingRef.current = { kind: "coach", number: current.number }
    try {
      await startJob({
        message: buildCoachMessage(current.question, answer.trim(), frame),
        sessionId, context: practiceJobContext(frame, personalContext),
      })
    } catch {
      setBusy(false); pendingRef.current = null; toast.error("Could not get coaching.")
    }
  }

  const next = () => {
    if (isLast) { void finish(); return }
    setIdx((i) => i + 1); setAnswer("")
  }

  const finish = async () => {
    if (!frame) return
    dictation.stop(); voice.stop(); setPhase("findings")
    if (exchanges.length === 0) {
      setFindings("You ended the interview before answering any questions, so there's nothing to summarize yet. Start again whenever you're ready.")
      return
    }
    setBusy(true)
    pendingRef.current = { kind: "findings" }
    try {
      await startJob({
        message: buildFindingsMessage(frame, exchanges),
        sessionId, context: practiceJobContext(frame, personalContext),
      })
    } catch {
      setBusy(false); pendingRef.current = null; toast.error("Could not compile findings.")
    }
  }

  const restart = () => {
    setPhase("setup"); setFrame(null); setPlan([]); setIdx(0)
    setAnswer(""); setCoaching({}); setExchanges([]); setFindings(null); spokenRef.current = null
    setPersonalContext(""); setPersonalizedApplied(false); setTailoredApplied(false)
    voice.stop()
  }

  const session = (): InterviewSession => ({
    frame: frame!, exchanges, coaching, findings, planned: frame ? frameQuestionCount(frame) : exchanges.length,
    userLabel: user?.name || user?.email,
  })

  const doExport = async (kind: "word" | "pdf" | "save") => {
    if (!frame) return
    setExporting(kind)
    try {
      if (kind === "save") {
        await saveInterviewToDocuments(session())
        toast.success("Saved to your Document Library.")
      } else {
        await downloadInterview(session(), kind)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.")
    } finally {
      setExporting(null)
    }
  }

  const audioBar = (
    <AudioControls
      loading={voice.loading} ready={voice.ready} playing={voice.playing}
      currentTime={voice.currentTime} duration={voice.duration}
      onPlayPause={voice.toggle} onStop={voice.stop} onSeek={voice.seek}
      className="mt-2"
    />
  )

  // ── SETUP ────────────────────────────────────────────────────
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
            <p className="mt-1 text-sm">
              <Link to={ROUTES.INTERVIEW_PRACTICE_ROLES} className="text-indigo-600 hover:underline">
                Preparing for a specific role? Browse role guides →
              </Link>
            </p>
          </header>
          {isLoading && <div className="flex items-center py-16 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>}
          {isError && <Card><CardContent className="py-8 text-sm text-rose-600">Couldn't load the question bank. Please try again later.</CardContent></Card>}
          {data && (
            <>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                  <div>
                    <Label htmlFor="personalize" className="text-sm font-medium">Personalize coaching to my profile</Label>
                    <p className="text-xs text-slate-500">
                      Uses your own PRISM summary and résumé to ground tips in your real experience —
                      your data, never a score. Turn off to practise without it.
                    </p>
                  </div>
                </div>
                <Switch id="personalize" checked={personalize} onCheckedChange={setPersonalize} />
              </div>
              {initialFrame && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                  Prefilled for <span className="font-semibold">{initialFrame.roleTitle}</span> — edit anything
                  before you start, or clear the role to practise generally.
                </div>
              )}
              <InterviewFrameForm initial={initialFrame} onConfirm={startInterview} showEmployerPacks />
            </>
          )}
        </div>
      </UserLayout>
    )
  }

  // ── FINDINGS ─────────────────────────────────────────────────
  if (phase === "findings" && frame) {
    const planned = frameQuestionCount(frame)
    return (
      <UserLayout>
        <div className="mx-auto max-w-3xl py-8 space-y-4 print:max-w-none print:py-0">
          <header className="flex items-start justify-between gap-4 print:block">
            <div>
              <h1 className="text-2xl font-semibold">Interview Findings</h1>
              <p className="text-sm text-slate-600">
                {frame.roleTitle} · {frame.company} — {exchanges.length} of {planned} answered · {frameLengthMinutes(frame)} min target
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => doExport("word")}>
                {exporting === "word" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Word
              </Button>
              <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => doExport("pdf")}>
                {exporting === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} PDF
              </Button>
              <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => doExport("save")}>
                {exporting === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
              <Button variant="ghost" size="sm" onClick={restart}><RefreshCw className="mr-2 h-4 w-4" /> New</Button>
            </div>
          </header>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Coaching summary</CardTitle>
              {findings && (
                <Button variant="ghost" size="sm" className="print:hidden" title="Read aloud" onClick={() => void voice.speak(findings)}>
                  <Volume2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {busy && !findings ? (
                <span className="flex items-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Compiling your findings…</span>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-slate-700">{findings}</p>
              )}
              <div className="print:hidden">{audioBar}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Full transcript ({exchanges.length} answered)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {exchanges.map((e) => (
                <div key={e.number} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {e.number} · {e.sectionTitle} · {e.competency}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{e.question}</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Your answer:</span> {e.answer}</p>
                  {coaching[e.number] && <p className="mt-1 whitespace-pre-wrap text-sm text-indigo-700"><span className="font-semibold">Coaching:</span> {coaching[e.number]}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </UserLayout>
    )
  }

  // ── INTERVIEW ────────────────────────────────────────────────
  const currentSectionKey = current?.sectionTitle

  return (
    <UserLayout>
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Interview Practice</h1>
            <p className="text-sm text-slate-600">{frame?.roleTitle} · {frame?.company}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {tailoredApplied && (
                <p className="flex items-center gap-1 text-xs text-emerald-600">
                  <Sparkles className="h-3 w-3" /> Tailored to {frame?.roleTitle}
                </p>
              )}
              {employerPack && (
                <p className="flex items-center gap-1 text-xs text-amber-700">
                  <Building2 className="h-3 w-3" />
                  {employerPack.kind === "employer"
                    ? `${employerPack.questionCount} questions in ${employerPack.name}'s style`
                    : `${employerPack.questionCount} sector-style questions`}
                </p>
              )}
              {personalizedApplied && (
                <p className="flex items-center gap-1 text-xs text-indigo-600">
                  <Sparkles className="h-3 w-3" /> Personalized to your profile
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-slate-500" />
              <Label htmlFor="voice-mode" className="text-xs text-slate-600">Voice mode</Label>
              <Switch id="voice-mode" checked={voiceMode}
                onCheckedChange={(v) => { setVoiceMode(v); if (!v) voice.stop(); if (!v) dictation.stop() }} />
            </div>
            <Button variant="ghost" size="sm" onClick={restart}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit setup</Button>
          </div>
        </header>

        {total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Question {current?.number} of {total} · {currentSectionKey}</span>
              <Button variant="ghost" size="sm" className="h-6 text-rose-600 hover:text-rose-700" onClick={() => void finish()}>
                <Flag className="mr-1 h-3.5 w-3.5" /> End interview
              </Button>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((current?.number ?? 1) / total) * 100}%` }} />
            </div>
          </div>
        )}

        {employerPack && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="space-y-2 py-4 text-xs text-amber-900">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Building2 className="h-4 w-4" />
                {employerPack.kind === "employer"
                  ? `Practising in ${employerPack.name}'s style`
                  : employerPack.name}
              </p>
              {employerPack.framework && (
                <p><span className="font-semibold">Their framework: </span>{employerPack.framework}</p>
              )}
              {employerPack.howTheyInterview && (
                <p><span className="font-semibold">How they interview: </span>{employerPack.howTheyInterview}</p>
              )}
              {employerPack.optimizesFor && (
                <p><span className="font-semibold">What it rewards: </span>{employerPack.optimizesFor}</p>
              )}
              {employerPack.typicalEmployers && (
                <p><span className="font-semibold">Typically: </span>{employerPack.typicalEmployers}</p>
              )}
              <p><span className="font-semibold">Watch out for: </span>{employerPack.coachingNote}</p>
              {/* The disclaimer travels with the content, by contract. */}
              <p className="border-t border-amber-200 pt-2 italic text-amber-800">
                {employerPack.provenance}
              </p>
            </CardContent>
          </Card>
        )}

        {current && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="w-fit">{current.competency}</Badge>
                    {current.source === "employer" && employerPack && (
                      <Badge variant="outline" className="w-fit border-amber-300 text-amber-700">
                        {employerPack.name} style
                      </Badge>
                    )}
                    {current.source === "sector" && (
                      <Badge variant="outline" className="w-fit border-slate-300 text-slate-600">
                        Sector style
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base font-medium leading-snug">{current.question}</CardTitle>
                </div>
                {voiceMode && (
                  <Button variant="ghost" size="sm" title="Read question aloud" onClick={() => void voice.speak(current.question)}>
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {voiceMode && <div>{audioBar}</div>}
            </CardHeader>
            <CardContent className="space-y-4">
              {current.starProbes.length > 0 && (
                <ul className="space-y-1">
                  {current.starProbes.map((p, i) => <li key={i} className="flex gap-2 text-xs text-slate-500"><span aria-hidden>↳</span><span>{p}</span></li>)}
                </ul>
              )}

              {current.strongAnswerCovers && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span className="font-semibold">What a strong answer covers: </span>
                  {current.strongAnswerCovers}
                </p>
              )}

              <Textarea rows={6} placeholder="Tell your story — Situation, Task, Action, Result…"
                value={answer} onChange={(e) => setAnswer(e.target.value)} />

              {voiceMode && (
                <div className="flex items-center gap-2">
                  {dictation.supported ? (
                    <Button type="button" size="sm" variant={dictation.listening ? "default" : "outline"} onClick={dictation.toggle}>
                      {dictation.listening ? <><MicOff className="mr-2 h-4 w-4" /> Stop recording</> : <><Mic className="mr-2 h-4 w-4" /> Answer by voice</>}
                    </Button>
                  ) : <span className="text-xs text-slate-500">Voice input isn't supported in this browser — please type.</span>}
                  {dictation.listening && <span className="text-xs text-indigo-600">Listening…</span>}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={submitAnswer} disabled={busy || !answer.trim()}>
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Coaching…</> : <><MessageSquareText className="mr-2 h-4 w-4" /> Submit answer</>}
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
                      <Button variant="ghost" size="sm" title="Read coaching aloud" onClick={() => void voice.speak(currentCoaching)}>
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
