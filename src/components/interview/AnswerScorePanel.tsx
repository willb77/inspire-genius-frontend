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
import { useTranslation } from "react-i18next"
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
import { SLOT, slotParts, type TFn } from "@/components/interview/tFallback"
import { useSpeechDictation } from "@/hooks/interview/useSpeechDictation"
import type { ConsentMode } from "@/services/interview/live.service"
import type {
  LiveAnswer,
  LivePlanQuestion,
  StarEvidence,
  SubmitAnswerResult,
} from "@/services/interview/live.service"
import type { StarCompetency } from "@/services/interview/interview.service"

const STAR_KEYS: (keyof StarEvidence)[] = ["S", "T", "A", "R"]

function starLabel(k: keyof StarEvidence, t: TFn): string {
  switch (k) {
    case "S":
      return t("answer.star.situation", "Situation")
    case "T":
      return t("answer.star.task", "Task")
    case "A":
      return t("answer.star.action", "Action")
    default:
      return t("answer.star.result", "Result")
  }
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
  /**
   * True for a Development / discovery conversation (`frame.kind === "general"`).
   *
   * Such a session is not assessed on the STAR arc — the server disables the
   * Result cap for it and frames the advisory prompt differently — so the S/T/A/R
   * row here must read as description, not as a checklist the person failed.
   */
  developmentMode?: boolean
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
  developmentMode = false,
  onSubmitAnswer,
  onSaveScore,
}: AnswerScorePanelProps) {
  const { t } = useTranslation("interviewPages")
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
  const [suggestedBefore, suggestedAfter] = slotParts(
    t("answer.suggestedScore", { defaultValue: "Suggested score: {{slot}} / 5", slot: SLOT }),
  )
  const evidence = scored?.star_evidence ?? suggestion?.star_evidence
  const capped = scored?.capped ?? suggestion?.capped
  const starPresentCount = evidence
    ? STAR_KEYS.filter((k) => evidence[k]?.present).length
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
              {t("answer.questionOf", { defaultValue: "Question {{number}} of {{total}} · {{section}}", number, total, section: question.section })}
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
          <Label htmlFor={`captured-answer-${question.competency_id}`}>{t("answer.capturedLabel", "Captured answer")}</Label>
          <Textarea
            id={`captured-answer-${question.competency_id}`}
            rows={5}
            placeholder={t("answer.capturedPlaceholder", "Type — or capture by voice — what the candidate says…")}
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
                    <><MicOff className="mr-2 h-4 w-4" /> {t("answer.stopCapture", "Stop capture")}</>
                  ) : (
                    <><Mic className="mr-2 h-4 w-4" /> {t("answer.captureByVoice", "Capture by voice")}</>
                  )}
                </Button>
              ) : (
                <span className="text-xs text-slate-500">{t("answer.voiceUnsupported", "Voice capture isn't supported in this browser — please type.")}</span>
              )}
              {dictation.listening && <span className="text-xs text-indigo-600">{t("answer.listening", "Listening…")}</span>}
            </div>
          )}
          {!hasSubmitted && (
            <div className="mt-2">
              <Button onClick={handleSubmit} disabled={submitting || !capturedAnswer.trim()}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("answer.submitting", "Submitting…")}</> : t("answer.submit", "Submit answer")}
              </Button>
            </div>
          )}
        </div>

        {hasSubmitted && evidence && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                {t("answer.aiSuggestion", "AI suggestion — you decide")}
              </p>
            </div>
            <p className="text-sm text-slate-700">
              {suggestedBefore}
              <span className="font-semibold">{suggestion?.suggested_score ?? "—"}</span>
              {suggestedAfter}
              {capped?.applied && (
                <span className="ml-1 text-xs text-amber-600">
                  {capped.reason === "no_measurable_result"
                    ? t("answer.cappedNoResult", "(capped at 3 — no measurable result yet)")
                    : t("answer.cappedSection", "(capped at the section limit)")}
                </span>
              )}
            </p>
            {developmentMode && (
              <p className="mt-2 text-xs text-slate-500">
                {t("answer.devNote", "Noted in the answer — descriptive only. A development conversation is not scored on the STAR arc.")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {STAR_KEYS.map((k) => (
                <span
                  key={k}
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    evidence[k]?.present ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {starLabel(k, t)} {evidence[k]?.present ? "✓" : "—"}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {t("answer.rubricTally", { defaultValue: "Rubric tally: {{present}} of 4 STAR elements confirmed present.", present: starPresentCount })}
            </p>
          </div>
        )}

        {hasSubmitted && (
          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("answer.yourRating", "Your rating (authoritative)")}
            </p>
            <div role="radiogroup" aria-label={t("answer.authoritativeScore", "Authoritative score")} className="flex gap-2">
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
              <Label htmlFor={`interviewer-notes-${question.competency_id}`}>{t("answer.notesLabel", "Interviewer notes")}</Label>
              <Textarea
                id={`interviewer-notes-${question.competency_id}`}
                rows={3}
                value={interviewerNotes}
                onChange={(e) => setInterviewerNotes(e.target.value)}
                placeholder={t("answer.notesPlaceholder", "Optional — anything that informed your rating.")}
              />
            </div>
            <Button onClick={handleSave} disabled={finalScore == null || saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("answer.saving", "Saving…")}</> : <><Save className="mr-2 h-4 w-4" /> {t("answer.saveRating", "Save rating")}</>}
            </Button>
            {/* `scored` alone is not enough: the row carries a seeded
                final_score from the moment the answer is submitted, so keying
                the label off a number would announce a "saved rating" nobody
                made. final_source is the fact that says somebody decided. */}
            {hasSubmitted && !scored?.final_source && (
              <p className="text-xs font-medium text-amber-700">
                {t("answer.notRated", "Not yet rated — this answer will be left out of the score until you rate it.")}
              </p>
            )}
            {scored?.final_source && typeof scored.final_score === "number" && (
              <p className="text-xs text-slate-500">{t("answer.savedRating", { defaultValue: "Saved rating: {{score}} / 5", score: scored.final_score })}</p>
            )}
          </div>
        )}

        {bankEntry?.exemplars && (
          <Collapsible open={refOpen} onOpenChange={setRefOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              <Target className="h-3.5 w-3.5" />
              {t("answer.listenFor", "What to listen for (scoring anchors)")}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", refOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5 text-xs">
              <p><span className="font-semibold text-emerald-600">{t("answer.strong", "Strong (5):")}</span> <span className="text-slate-600">{bankEntry.exemplars.strong}</span></p>
              <p><span className="font-semibold text-amber-600">{t("answer.baseline", "Baseline (3):")}</span> <span className="text-slate-600">{bankEntry.exemplars.baseline}</span></p>
              <p><span className="font-semibold text-rose-600">{t("answer.weak", "Weak (1):")}</span> <span className="text-slate-600">{bankEntry.exemplars.weak}</span></p>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
