/**
 * /interview-practice — Candidate Interview Coach.
 *
 * 1) Set the interview frame (the seat you're practising for).
 * 2) Practice loop: pick a competency → read the STAR question + probes → answer
 *    (typed OR by voice) → get supportive coaching from Alex (interview-coach
 *    mode) inline → try again / next. NEVER a score, never evaluator exemplars.
 *
 * Voice mode uses the Meridian voice interface: useTTS speaks the question and
 * the coaching aloud; useSpeechDictation captures the spoken answer. Coaching
 * runs over the async-job chat path (useMeridianJob).
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, RefreshCw, ArrowRight, MessageSquareText, Mic, MicOff, Volume2, Pencil } from "lucide-react"

import UserLayout from "@/layouts/UserLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

import InterviewFrameForm from "@/components/interview/InterviewFrameForm"
import { usePracticeQuestions } from "@/hooks/interview/usePracticeQuestions"
import { useSpeechDictation } from "@/hooks/interview/useSpeechDictation"
import { useMeridianJob, type ChatJob } from "@/hooks/agents/useMeridianJob"
import { useTTS } from "@/hooks/useTTS"
import {
  buildCoachMessage,
  practiceJobContext,
  type InterviewFrame,
  type PracticeCompetency,
} from "@/services/interview/practice.service"

function newSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  } catch { /* ignore */ }
  return `practice-${Date.now()}`
}

export default function InterviewPracticePage() {
  const { data, isLoading, isError } = usePracticeQuestions()
  const [sessionId] = useState(newSessionId)
  const [frame, setFrame] = useState<InterviewFrame | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [answer, setAnswer] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [coaching, setCoaching] = useState(false)
  const [practiced, setPracticed] = useState<Set<string>>(new Set())
  const [voiceMode, setVoiceMode] = useState(false)

  const { speak, stop: stopSpeaking } = useTTS({ voice: "coral" })
  const dictation = useSpeechDictation({
    onFinal: (chunk) => setAnswer((prev) => (prev ? `${prev} ${chunk}` : chunk)),
  })

  const { startJob } = useMeridianJob({
    onJobSettled: (job: ChatJob) => {
      setCoaching(false)
      if (job.status === "error") {
        toast.error(job.error || "Coaching failed — please try again.")
        return
      }
      const content = job.content || ""
      setFeedback(content)
      if (voiceMode && content) void speak(content)
    },
  })

  const flatCompetencies = useMemo<PracticeCompetency[]>(
    () => (data?.sections ?? []).flatMap((s) => s.competencies),
    [data],
  )
  const selected = flatCompetencies.find((c) => c.id === selectedId) ?? null

  // In voice mode, read each newly-selected question aloud.
  const spokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (voiceMode && selected && spokenRef.current !== selected.id) {
      spokenRef.current = selected.id
      void speak(selected.question)
    }
  }, [voiceMode, selected, speak])

  const pick = (c: PracticeCompetency) => {
    setSelectedId(c.id)
    setAnswer("")
    setFeedback(null)
    dictation.stop()
  }

  const submit = async () => {
    if (!selected || !answer.trim()) return
    dictation.stop()
    stopSpeaking()
    setCoaching(true)
    setFeedback(null)
    try {
      await startJob({
        message: buildCoachMessage(selected.question, answer.trim(), frame),
        sessionId,
        context: practiceJobContext(frame),
      })
      setPracticed((prev) => new Set(prev).add(selected.id))
    } catch (e) {
      setCoaching(false)
      toast.error(e instanceof Error ? e.message : "Could not start coaching.")
    }
  }

  const nextQuestion = () => {
    if (!selected) return
    const idx = flatCompetencies.findIndex((c) => c.id === selected.id)
    pick(flatCompetencies[(idx + 1) % flatCompetencies.length])
  }

  // ── Step 1: frame setup ──────────────────────────────────────
  if (!frame) {
    return (
      <UserLayout>
        <div className="mx-auto max-w-3xl py-8 space-y-4">
          <header>
            <h1 className="text-2xl font-semibold">Interview Practice</h1>
            <p className="text-sm text-slate-600">
              Rehearse your answers and get supportive coaching — no scores, just
              tips to help your story land.
            </p>
          </header>
          <InterviewFrameForm onConfirm={setFrame} />
        </div>
      </UserLayout>
    )
  }

  // ── Step 2: practice loop ────────────────────────────────────
  const currentSectionKey = selected
    ? data?.sections.find((s) => s.competencies.some((c) => c.id === selected.id))?.key
    : data?.sections[0]?.key

  return (
    <UserLayout>
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Interview Practice</h1>
            <p className="text-sm text-slate-600">
              {frame.roleTitle} · {frame.company}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-slate-500" />
              <Label htmlFor="voice-mode" className="text-xs text-slate-600">Voice mode</Label>
              <Switch
                id="voice-mode"
                checked={voiceMode}
                onCheckedChange={(v) => { setVoiceMode(v); if (!v) { stopSpeaking(); dictation.stop() } }}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFrame(null)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit setup
            </Button>
          </div>
        </header>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading questions…
          </div>
        )}
        {isError && (
          <Card><CardContent className="py-8 text-sm text-rose-600">
            Couldn't load practice questions. Please try again later.
          </CardContent></Card>
        )}

        {data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pick a competency to practice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={currentSectionKey}
                onValueChange={(k) => {
                  const sec = data.sections.find((s) => s.key === k)
                  if (sec?.competencies[0]) pick(sec.competencies[0])
                }}
              >
                <TabsList>
                  {data.sections.map((s) => (
                    <TabsTrigger key={s.key} value={s.key}>{s.title}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex flex-wrap gap-2">
                {(data.sections.find((s) => s.key === currentSectionKey)?.competencies ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pick(c)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selected?.id === c.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {c.competency}{practiced.has(c.id) ? " ✓" : ""}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selected && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="secondary" className="mb-1 w-fit">{selected.competency}</Badge>
                  <CardTitle className="text-base font-medium leading-snug">{selected.question}</CardTitle>
                </div>
                {voiceMode && (
                  <Button variant="ghost" size="sm" onClick={() => void speak(selected.question)} title="Read question aloud">
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected.starProbes.length > 0 && (
                <ul className="space-y-1">
                  {selected.starProbes.map((p, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-500">
                      <span aria-hidden>↳</span><span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}

              <Textarea
                rows={6}
                placeholder="Tell your story — Situation, Task, Action, Result…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />

              {voiceMode && (
                <div className="flex items-center gap-2">
                  {dictation.supported ? (
                    <Button
                      type="button"
                      variant={dictation.listening ? "default" : "outline"}
                      size="sm"
                      onClick={dictation.toggle}
                    >
                      {dictation.listening
                        ? <><MicOff className="mr-2 h-4 w-4" /> Stop recording</>
                        : <><Mic className="mr-2 h-4 w-4" /> Answer by voice</>}
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Voice input isn't supported in this browser — please type your answer.
                    </span>
                  )}
                  {dictation.listening && <span className="text-xs text-indigo-600">Listening…</span>}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={submit} disabled={coaching || !answer.trim()}>
                  {coaching
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Coaching…</>
                    : <><MessageSquareText className="mr-2 h-4 w-4" /> Get coaching</>}
                </Button>
                {feedback && (
                  <Button variant="outline" onClick={() => { setAnswer(""); setFeedback(null) }}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Try again
                  </Button>
                )}
                <Button variant="ghost" onClick={nextQuestion} disabled={coaching}>
                  Next question <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {feedback && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Coaching feedback</p>
                    {voiceMode && (
                      <Button variant="ghost" size="sm" onClick={() => void speak(feedback)} title="Read coaching aloud">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{feedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </UserLayout>
  )
}
