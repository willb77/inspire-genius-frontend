/**
 * RWO-8 §7 — the résumé interview (CSA option C, Bill's Q9–Q11).
 *
 * Step 3b asks at most four questions before the draft, one at a time; the review
 * step shows at most two follow-ups as cards. An answer is the person's own fact
 * for THIS draft — the server adds the answer (never the question) to what the
 * fabrication check accepts — so the page says plainly that a number they don't
 * give won't appear. "No", "Skip" and blank answers are never sent.
 */
import { Check, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { InterviewQuestion } from "@/types/resumeWriter"

const ANSWER_MAX = 300

export function StepQuestions({
  questions,
  answers,
  index,
  loading,
  error,
  onAnswer,
  onIndex,
  onExplain,
}: {
  questions: InterviewQuestion[]
  answers: Record<string, string>
  index: number
  loading: boolean
  error: string | null
  onAnswer: (id: string, text: string) => void
  onIndex: (i: number) => void
  /** "Not sure what you mean?" — opens the assistant with the question. */
  onExplain: (q: InterviewQuestion) => void
}) {
  const { t } = useTranslation("resumeUi")
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground" role="status" data-testid="guided-questions-loading">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t("interview.loading", "Comparing your résumé with the job…")}
      </div>
    )
  }
  if (error) {
    return (
      <div role="alert" data-testid="guided-questions-error" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </div>
    )
  }
  if (!questions.length) {
    return (
      <p role="status" data-testid="guided-questions-none" className="rounded-lg border p-4 text-sm text-muted-foreground">
        {t("interview.none", "No questions this time — your résumé already covers what the job asks for. Write your résumé when you're ready.")}
      </p>
    )
  }
  const done = index >= questions.length
  const q = questions[Math.min(index, questions.length - 1)]
  const value = answers[q.id] ?? ""
  return (
    <div className="space-y-4" data-testid="guided-step-questions">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">{t("interview.title", "A few questions to aim it better")}</h2>
        <span className="text-sm text-muted-foreground">
          {done
            ? t("interview.allDone", "All done")
            : t("interview.questionN", { defaultValue: "Question {{n}} of {{total}}", n: index + 1, total: questions.length })}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("interview.intro", "We found a few things the job asks for that your résumé doesn't show yet. Answer what you can. Skip anything.")}
      </p>
      <div className="h-1.5 rounded-full bg-muted" aria-hidden="true">
        <div className="h-1.5 rounded-full bg-teal-600" style={{ width: `${(Math.min(index, questions.length) / questions.length) * 100}%` }} />
      </div>

      {questions.slice(0, index).map((p, i) => (
        <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
          <div>
            <p className="font-medium text-teal-800">
              <Check className="mr-1 inline h-4 w-4" aria-hidden="true" />
              {i + 1} · {p.text}
            </p>
            <p className="text-muted-foreground">{answers[p.id]?.trim()
                ? t("interview.answerQuoted", { defaultValue: '"{{answer}}"', answer: answers[p.id].trim() })
                : t("interview.skipped", "Skipped")}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onIndex(i)}>
            {t("interview.edit", "Edit")}
          </Button>
        </div>
      ))}

      {done ? null : (
        <div className="space-y-3 rounded-lg border-2 border-teal-600 p-4" data-testid="guided-question-current">
          <p className="text-base font-semibold">
            {index + 1} · {q.text}
          </p>
          {q.why ? (
            <p className="rounded-md bg-muted/50 p-2 text-xs">
              <span className="font-semibold">{t("interview.whyAsking", "Why we're asking:")}</span> {q.why}
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t("interview.yourAnswer", "Your answer (in your own words)")}</span>
            <Textarea
              rows={3}
              maxLength={ANSWER_MAX}
              value={value}
              onChange={(e) => onAnswer(q.id, e.target.value)}
              aria-label={q.text}
            />
          </label>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {t("interview.numbersHint", "Give numbers only if you're sure of them. An honest estimate is fine — say \"about\".")}
            </span>
            <span>
              {value.length} / {ANSWER_MAX}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onIndex(index + 1)} disabled={!value.trim()}>
              {t("interview.saveNext", "Save and next")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onAnswer(q.id, "")
                onIndex(index + 1)
              }}
            >
              {t("interview.noHavent", "No, I haven't")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onAnswer(q.id, "")
                onIndex(index + 1)
              }}
            >
              {t("interview.skipThis", "Skip this one")}
            </Button>
            <Button variant="ghost" onClick={() => onExplain(q)}>
              {t("interview.notSure", "Not sure what you mean?")}
            </Button>
          </div>
        </div>
      )}

      {questions.slice(index + 1).length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">{t("interview.stillToCome", "Still to come")}</p>
          {questions.slice(index + 1).map((p, i) => (
            <p key={p.id} className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              {index + i + 2} · {p.text}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** The sidebar promise: what happens to the answers, and what is never asked. */
export function InterviewPromise() {
  const { t } = useTranslation("resumeUi")
  return (
    <div className="space-y-3 text-sm" data-testid="guided-interview-promise">
      <div className="rounded-lg border p-4">
        <p className="font-semibold">{t("promise.answersTitle", "What happens to your answers")}</p>
        <p className="mt-1 text-muted-foreground">
          {t(
            "promise.answersBody",
            "They're used for this draft, alongside your résumé. A number you give here can appear in a bullet. A number you don't give won't — we never make one up. You'll see every line before anything is downloaded.",
          )}
        </p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="font-semibold">{t("promise.wontAskTitle", "What we won't ask")}</p>
        <p className="mt-1 text-muted-foreground">
          {t(
            "promise.wontAskBody",
            "Age, health, family, religion, nationality or anything else an employer may not ask. Leave out anything you'd rather not share.",
          )}
        </p>
      </div>
    </div>
  )
}

/** The review step's follow-ups: answer a card, then Apply to use it. */
export function FollowUpCards({
  questions,
  answers,
  onAnswer,
}: {
  questions: InterviewQuestion[]
  answers: Record<string, string>
  onAnswer: (id: string, text: string) => void
}) {
  const { t } = useTranslation("resumeUi")
  if (!questions.length) return null
  return (
    <div className="space-y-2" data-testid="guided-followups">
      <p className="text-xs font-semibold text-muted-foreground">
        {t("followUps.title", "The assistant has a question about your draft")}
      </p>
      {questions.map((q) => (
        <div key={q.id} className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3 text-sm">
          <p className="font-medium">{q.text}</p>
          {q.requirement ? <p className="text-xs text-muted-foreground">{t("followUps.about", { defaultValue: "About: “{{requirement}}”", requirement: q.requirement })}</p> : null}
          <Textarea
            rows={2}
            maxLength={ANSWER_MAX}
            value={answers[q.id] ?? ""}
            onChange={(e) => onAnswer(q.id, e.target.value)}
            aria-label={q.text}
            placeholder={t("followUps.placeholder", "Your answer — it's used when you apply a change")}
          />
        </div>
      ))}
    </div>
  )
}
