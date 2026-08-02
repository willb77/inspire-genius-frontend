/**
 * /interview-practice — Candidate Interview Coach (build-plan Phase 3).
 *
 * A practice surface where the user drills their OWN STAR answers and gets
 * supportive, rubric-anchored coaching from Alex (interview-coach mode) — never
 * a score, never the evaluator's exemplars. Pick a competency → read the
 * question + probes → write an answer → get coaching feedback inline → try
 * again or move on. Coaching runs over the async-job chat path (useMeridianJob).
 */
import { useMemo, useState } from "react"
import { Loader2, RefreshCw, ArrowRight, MessageSquareText } from "lucide-react"

import UserLayout from "@/layouts/UserLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

import { usePracticeQuestions } from "@/hooks/interview/usePracticeQuestions"
import { useMeridianJob, type ChatJob } from "@/hooks/agents/useMeridianJob"
import {
  buildCoachMessage,
  PRACTICE_JOB_CONTEXT,
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [answer, setAnswer] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [coaching, setCoaching] = useState(false)
  const [practiced, setPracticed] = useState<Set<string>>(new Set())

  const { startJob } = useMeridianJob({
    onJobSettled: (job: ChatJob) => {
      setCoaching(false)
      if (job.status === "error") {
        toast.error(job.error || "Coaching failed — please try again.")
        return
      }
      setFeedback(job.content || "")
    },
  })

  const flatCompetencies = useMemo<PracticeCompetency[]>(
    () => (data?.sections ?? []).flatMap((s) => s.competencies),
    [data],
  )
  const selected = flatCompetencies.find((c) => c.id === selectedId) ?? null

  const pick = (c: PracticeCompetency) => {
    setSelectedId(c.id)
    setAnswer("")
    setFeedback(null)
  }

  const submit = async () => {
    if (!selected || !answer.trim()) return
    setCoaching(true)
    setFeedback(null)
    try {
      await startJob({
        message: buildCoachMessage(selected.question, answer.trim()),
        sessionId,
        context: { ...PRACTICE_JOB_CONTEXT },
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
    const next = flatCompetencies[(idx + 1) % flatCompetencies.length]
    pick(next)
  }

  return (
    <UserLayout>
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Interview Practice</h1>
          <p className="text-sm text-slate-600">
            Rehearse your answers and get supportive coaching. This is practice —
            there are no scores, just tips to help your story land.
          </p>
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
                value={selected ? data.sections.find((s) => s.competencies.some((c) => c.id === selected.id))?.key : data.sections[0]?.key}
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
                {(data.sections.find((s) => selected
                  ? s.competencies.some((c) => c.id === selected.id)
                  : s.key === data.sections[0]?.key)?.competencies ?? []
                ).map((c) => (
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
              <Badge variant="secondary" className="mb-1 w-fit">{selected.competency}</Badge>
              <CardTitle className="text-base font-medium leading-snug">{selected.question}</CardTitle>
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

              <div className="flex gap-2">
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
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Coaching feedback
                  </p>
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
