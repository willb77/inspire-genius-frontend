/**
 * AnswerScorePanel — per-question capture + scoring UI for a REAL, scored
 * interview.
 *
 * Flow for one question:
 *   1. Interviewer captures the candidate's answer (typed, or by voice when
 *      consent mode is "audio") and submits it.
 *   2. The advisory AI read comes back — a suggested 1–5 and S/T/A/R evidence,
 *      clearly labelled as advisory. It is NEVER sent anywhere on its own.
 *   3. The interviewer sets the AUTHORITATIVE rating (defaults to the
 *      suggestion as a starting point, but is a fully independent, editable
 *      control) plus optional notes, and saves it — THAT is the value PATCHed
 *      as `final_score`.
 *
 * A `QuestionBankPanel`-style "what to listen for" reference is offered
 * collapsed alongside, reusing the evaluator bank the interviewer already
 * has loaded via `useQuestionBank`.
 */
import { useEffect, useState } from "react"
import { ChevronDown, Loader2, Mic, MicOff, Save, Sparkles, Target } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useSpeechDictation } from "@/hooks/interview/useSpeechDictation"
import type { ConsentMode } from "@/services/interview/live.service"
import type {
  LiveAnswer,
  LivePlanQuestion,
  StarEvidence,
  SubmitAnswerResult,
} from "@/services/interview/live.service"
import type { StarCompetency } from "@/services/interview/interview.service"

const STAR_LABELS: Record<keyof StarEvidence, string> = {
  S: "Situation",
  T: "Task",
  A: "Action",
  R: "Result",
}

const SCORES = [1, 2, 3, 4, 5] as const

export type AnswerScorePanelProps = {
  question: LivePlanQuestion
  number: number
  total: number
  /** Only offer the mic when the interview's consent mode allows audio. */
  consentMode: ConsentMode
  /** The advisory suggestion once the captured answer has been submitted. */
  suggestion: SubmitAnswerResult | null
  /** The saved authoritative answer, once the interviewer's rating has been PATCHed. */
  scored: LiveAnswer | null
  submitting?: boolean
  saving?: boolean
  /** The matching bank entry (rubric + exemplars), for the "what to listen for" reference. */
  bankEntry?: StarCompetency
  onSubmitAnswer: (capturedAnswer: string) => void | Promise<void>
  onSaveScore: (finalScore: number, interviewerNotes: string) => void | Promise<void>
}

export default function AnswerScorePanel({
  question,
  number,
  total,
  consentMode,
  suggestion,
  scored,
  submitting = false,
  saving = false,
  bankEntry,
  onSubmitAnswer,
  onSaveScore,
}: AnswerScorePanelProps) {
  const [capturedAnswer, setCapturedAnswer] = useState("")
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [interviewerNotes, setInterviewerNotes] = useState("")
  const [refOpen, setRefOpen] = useState(false)

  const dictation = useSpeechDictation({
    onFinal: (chunk) => setCapturedAnswer((prev) => (prev ? `${prev} ${chunk}` : chunk)),
  })

  // Seed the authoritative control from the advisory suggestion ONCE per
  // answer, as a starting point — the interviewer can immediately overwrite
  // it. Re-seeds only when a fresh suggestion/scored answer arrives for THIS
  // question (keyed on the question's competency id) so it never clobbers an
  // edit the interviewer has already made.
  useEffect(() => {
    if (scored) {
      setFinalScore(typeof scored.final_score === "number" ? scored.final_score : null)
      setInterviewerNotes(scored.interviewer_notes ?? "")
    } else if (suggestion) {
      setFinalScore((prev) => prev ?? suggestion.suggested_score ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.competency_id, suggestion?.suggested_score, scored?.final_score])

  const hasSubmitted = Boolean(suggestion) || Boolean(scored)
  const evidence = scored?.star_evidence ?? suggestion?.star_evidence
  const capped = scored?.capped ?? suggestion?.capped
  const starPresentCount = evidence
    ? (Object.keys(STAR_LABELS) as (keyof StarEvidence)[]).filter((k) => evidence[k]?.present).length
    : 0

  const handleSubmit = () => {
    if (!capturedAnswer.trim() || submitting) return
    dictation.stop()
    void onSubmitAnswer(capturedAnswer.trim())
  }

  const handleSave = () => {
    if (finalScore == null || saving) return
    void onSaveScore(finalScore, interviewerNotes)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500">
              Question {number} of {total} · {question.section}
            </p>
            <Badge variant="secondary" className="my-1 w-fit">
              {question.competency_label ?? question.competency_id}
            </Badge>
            <CardTitle className="text-base font-medium leading-snug">{question.question}</CardTitle>
          </div>
        </div>
        {question.star_probes && question.star_probes.length > 0 && (
          <ul className="mt-1 space-y-1">
            {question.star_probes.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-500">
                <span aria-hidden>↳</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`captured-answer-${question.competency_id}`}>Captured answer</Label>
          <Textarea
            id={`captured-answer-${question.competency_id}`}
            rows={5}
            placeholder="Type — or capture by voice — what the candidate says…"
            value={capturedAnswer}
            onChange={(e) => setCapturedAnswer(e.target.value)}
            disabled={hasSubmitted}
          />
          {consentMode === "audio" && !hasSubmitted && (
            <div className="mt-2 flex items-center gap-2">
              {dictation.supported ? (
                <Button
                  type="button"
                  size="sm"
                  variant={dictation.listening ? "default" : "outline"}
                  onClick={dictation.toggle}
                >
                  {dictation.listening ? (
                    <><MicOff className="mr-2 h-4 w-4" /> Stop capture</>
                  ) : (
                    <><Mic className="mr-2 h-4 w-4" /> Capture by voice</>
                  )}
                </Button>
              ) : (
                <span className="text-xs text-slate-500">Voice capture isn't supported in this browser — please type.</span>
              )}
              {dictation.listening && <span className="text-xs text-indigo-600">Listening…</span>}
            </div>
          )}
          {!hasSubmitted && (
            <div className="mt-2">
              <Button onClick={handleSubmit} disabled={submitting || !capturedAnswer.trim()}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : "Submit answer"}
              </Button>
            </div>
          )}
        </div>

        {hasSubmitted && evidence && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                AI suggestion — you decide
              </p>
            </div>
            <p className="text-sm text-slate-700">
              Suggested score:{" "}
              <span className="font-semibold">{suggestion?.suggested_score ?? "—"}</span> / 5
              {capped && <span className="ml-1 text-xs text-amber-600">(capped — evidence incomplete)</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {(Object.keys(STAR_LABELS) as (keyof StarEvidence)[]).map((k) => (
                <span
                  key={k}
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    evidence[k]?.present ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {STAR_LABELS[k]} {evidence[k]?.present ? "✓" : "—"}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Rubric tally: {starPresentCount} of 4 STAR elements confirmed present.
            </p>
          </div>
        )}

        {hasSubmitted && (
          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Your rating (authoritative)
            </p>
            <div role="radiogroup" aria-label="Authoritative score" className="flex gap-2">
              {SCORES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={finalScore === s}
                  onClick={() => setFinalScore(s)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                    finalScore === s
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 text-slate-700 hover:border-indigo-400",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div>
              <Label htmlFor={`interviewer-notes-${question.competency_id}`}>Interviewer notes</Label>
              <Textarea
                id={`interviewer-notes-${question.competency_id}`}
                rows={3}
                value={interviewerNotes}
                onChange={(e) => setInterviewerNotes(e.target.value)}
                placeholder="Optional — anything that informed your rating."
              />
            </div>
            <Button onClick={handleSave} disabled={finalScore == null || saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save rating</>}
            </Button>
            {scored && typeof scored.final_score === "number" && (
              <p className="text-xs text-slate-500">Saved rating: {scored.final_score} / 5</p>
            )}
          </div>
        )}

        {bankEntry?.exemplars && (
          <Collapsible open={refOpen} onOpenChange={setRefOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              <Target className="h-3.5 w-3.5" />
              What to listen for (scoring anchors)
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", refOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5 text-xs">
              <p><span className="font-semibold text-emerald-600">Strong (5):</span> <span className="text-slate-600">{bankEntry.exemplars.strong}</span></p>
              <p><span className="font-semibold text-amber-600">Baseline (3):</span> <span className="text-slate-600">{bankEntry.exemplars.baseline}</span></p>
              <p><span className="font-semibold text-rose-600">Weak (1):</span> <span className="text-slate-600">{bankEntry.exemplars.weak}</span></p>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
