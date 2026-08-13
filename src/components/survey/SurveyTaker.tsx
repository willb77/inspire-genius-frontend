/**
 * SurveyTaker — renders a selected survey and captures the taker's answers.
 *
 * One card per question, input keyed to the question type:
 *   text   → Textarea
 *   single → a radio-style button group (exactly one)
 *   multi  → checkboxes (any number)
 *   rating → 1..scaleMax button scale
 *
 * Required questions are validated on submit; the first unanswered one is
 * surfaced with a toast and inline note. On submit the answers are handed to
 * `onSubmit` (the page persists via the store) and a thank-you state shows.
 */
import { useMemo, useState } from "react"
import { CheckCircle2, RotateCcw, Send } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Survey, SurveyAnswerValue } from "@/types/survey"
import { DEFAULT_RATING_SCALE_MAX } from "@/types/survey"

export interface SurveyTakerProps {
  survey: Survey
  onSubmit: (answers: Record<string, SurveyAnswerValue>) => void
  /** Called when the taker chooses to take another survey after finishing. */
  onDone?: () => void
}

function isAnswered(value: SurveyAnswerValue): boolean {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "number") return true
  return false
}

export default function SurveyTaker({
  survey,
  onSubmit,
  onDone,
}: SurveyTakerProps) {
  const [answers, setAnswers] = useState<Record<string, SurveyAnswerValue>>({})
  const [submitted, setSubmitted] = useState(false)
  const [invalidId, setInvalidId] = useState<string | null>(null)

  const setAnswer = (id: string, value: SurveyAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }))
    if (invalidId === id) setInvalidId(null)
  }

  const toggleMulti = (id: string, option: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : []
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return { ...prev, [id]: next }
    })
    if (invalidId === id) setInvalidId(null)
  }

  const firstMissingRequired = useMemo(() => {
    return survey.questions.find(
      (q) => q.required && !isAnswered(answers[q.id] ?? null),
    )
  }, [survey.questions, answers])

  const handleSubmit = () => {
    if (firstMissingRequired) {
      setInvalidId(firstMissingRequired.id)
      toast.error("Please answer the required questions before submitting.")
      return
    }
    onSubmit(answers)
    setSubmitted(true)
    toast.success("Response submitted. Thank you!")
  }

  const handleRetake = () => {
    setAnswers({})
    setSubmitted(false)
    setInvalidId(null)
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden />
          <div>
            <h3 className="text-lg font-semibold">Response recorded</h3>
            <p className="text-sm text-muted-foreground">
              Your answers to “{survey.title || "Untitled survey"}” were saved.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRetake}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Take again
            </Button>
            {onDone && (
              <Button onClick={onDone}>Choose another survey</Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          {survey.title || "Untitled survey"}
        </h2>
        {survey.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {survey.description}
          </p>
        )}
      </div>

      {survey.questions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            This survey has no questions yet.
          </CardContent>
        </Card>
      )}

      {survey.questions.map((q, idx) => {
        const value = answers[q.id] ?? null
        const invalid = invalidId === q.id
        return (
          <Card
            key={q.id}
            className={cn(invalid && "border-destructive")}
            data-testid={`taker-q-${q.id}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start gap-2 text-base font-medium">
                <span className="text-muted-foreground">{idx + 1}.</span>
                <span className="flex-1">
                  {q.prompt || "Untitled question"}
                  {q.required && (
                    <span className="ml-1 text-destructive" aria-hidden>
                      *
                    </span>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === "text" && (
                <Textarea
                  aria-label={q.prompt || "Answer"}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Type your answer…"
                  rows={3}
                />
              )}

              {q.type === "single" && (
                <div className="flex flex-wrap gap-2">
                  {(q.options ?? []).map((opt) => (
                    <Button
                      key={opt}
                      type="button"
                      variant={value === opt ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAnswer(q.id, opt)}
                    >
                      {opt || "—"}
                    </Button>
                  ))}
                </div>
              )}

              {q.type === "multi" && (
                <div className="space-y-2">
                  {(q.options ?? []).map((opt) => {
                    const checked =
                      Array.isArray(value) && value.includes(opt)
                    return (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleMulti(q.id, opt)}
                          aria-label={opt}
                        />
                        <span>{opt || "—"}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {q.type === "rating" && (
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from(
                    { length: q.scaleMax ?? DEFAULT_RATING_SCALE_MAX },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={value === n ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => setAnswer(q.id, n)}
                      aria-label={`Rating ${n}`}
                    >
                      {n}
                    </Button>
                  ))}
                  {typeof value === "number" && (
                    <Badge variant="secondary" className="ml-1">
                      {value}
                    </Badge>
                  )}
                </div>
              )}

              {invalid && (
                <p className="mt-2 text-xs text-destructive">
                  This question is required.
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}

      {survey.questions.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>
            <Send className="mr-2 h-4 w-4" />
            Submit response
          </Button>
        </div>
      )}
    </div>
  )
}
