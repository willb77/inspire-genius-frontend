/**
 * SurveyResults — the compilation across all respondents PLUS each individual
 * response, for one survey. Author / manager+ only (the survey-service returns
 * 403 otherwise; the page also gates the tab on `canViewResponses`).
 *
 *   • Compilation — per question: choice distributions (bars), rating average +
 *     histogram, and every free-text answer.
 *   • Individual responses — one card per submitted response, answers listed.
 */
import { useState } from "react"
import { BarChart3, Loader2, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSurveyResponses, useSurveySummary } from "@/hooks/survey/useSurveys"
import type {
  QuestionSummary,
  Survey,
  SurveyAnswerValue,
} from "@/types/survey"

function Distribution({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts)
  const max = Math.max(1, ...entries.map(([, n]) => n))
  if (entries.length === 0)
    return <p className="text-sm text-muted-foreground">No answers yet.</p>
  return (
    <div className="space-y-1.5">
      {entries.map(([label, n]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-40 shrink-0 truncate text-sm" title={label}>
            {label || "—"}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-primary/70"
              style={{ width: `${(n / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm tabular-nums">{n}</span>
        </div>
      ))}
    </div>
  )
}

function QuestionCompilation({ q }: { q: QuestionSummary }) {
  return (
    <div className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{q.prompt || "Untitled question"}</p>
        <Badge variant="secondary" className="shrink-0">
          {q.answered} answered
        </Badge>
      </div>

      {(q.type === "single" || q.type === "multi") && (
        <Distribution counts={q.optionCounts} />
      )}

      {q.type === "rating" && (
        <div className="space-y-2">
          <p className="text-sm">
            Average:{" "}
            <span className="font-semibold">
              {q.average != null ? q.average.toFixed(2) : "—"}
            </span>
          </p>
          <Distribution counts={q.ratingCounts} />
        </div>
      )}

      {q.type === "text" && (
        <div className="space-y-1">
          {q.textAnswers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answers yet.</p>
          ) : (
            q.textAnswers.map((a, i) => (
              <p
                key={i}
                className="rounded bg-muted px-3 py-1.5 text-sm"
              >
                {a}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function formatAnswer(value: SurveyAnswerValue): string {
  if (value == null) return "—"
  if (Array.isArray(value)) return value.join(", ")
  return String(value)
}

export interface SurveyResultsProps {
  survey: Survey
}

export default function SurveyResults({ survey }: SurveyResultsProps) {
  const [showIndividual, setShowIndividual] = useState(false)
  const summary = useSurveySummary(survey.id)
  const responses = useSurveyResponses(survey.id, showIndividual)

  const promptById = new Map(survey.questions.map((q) => [q.id, q.prompt]))

  return (
    <div className="space-y-4">
      {/* Compilation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" aria-hidden />
            Compilation
            {summary.data && (
              <Badge variant="outline" className="ml-1">
                {summary.data.responseCount} responses
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : summary.isError ? (
            <p className="py-4 text-sm text-destructive">
              Could not load the compilation.
            </p>
          ) : summary.data && summary.data.responseCount === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No responses yet. The compilation appears once people submit.
            </p>
          ) : (
            <div className="space-y-4">
              {summary.data?.questions.map((q) => (
                <QuestionCompilation key={q.questionId} q={q} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual responses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" aria-hidden />
            Individual responses
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIndividual((v) => !v)}
          >
            {showIndividual ? "Hide" : "Show"}
          </Button>
        </CardHeader>
        {showIndividual && (
          <CardContent>
            {responses.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : responses.data && responses.data.length > 0 ? (
              <div className="space-y-3">
                {responses.data.map((r, idx) => (
                  <div key={r.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                      <p className="text-sm font-medium">
                        {r.respondentName || r.respondentEmail || "Anonymous"}
                        {r.respondentName && r.respondentEmail ? (
                          <span className="ml-1 font-normal text-muted-foreground">
                            · {r.respondentEmail}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Response #{responses.data!.length - idx}
                        {r.submittedAt
                          ? ` · ${new Date(r.submittedAt).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <dl className="space-y-1">
                      {survey.questions.map((q) => (
                        <div key={q.id} className="text-sm">
                          <dt className="text-muted-foreground">
                            {promptById.get(q.id) || q.id}
                          </dt>
                          <dd className="ml-0 font-medium">
                            {formatAnswer(r.answers?.[q.id] ?? null)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                No responses yet.
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
