/**
 * House style S4b — the scored write-up (findings) of the one interview build.
 *
 * MUST stay identical, markup and text, to the findings screen of the body the
 * session's questions came from: `star` reproduces LiveInterviewBody's,
 * `custom` reproduces StudioInterviewBody's. The write-up is the record of a
 * decision about a real person; changing how it reads is not a house-style
 * change. `__tests__/sideBySide.test.tsx` renders the old bodies and this one
 * on the same stored sessions and compares the HTML.
 */
import { FileDown, FileText, Loader2, RefreshCw, Save, Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { normalizeSectionScores } from "@/services/interview/live.service"
import type {
  FinalizeResult,
  LiveEmployerMeta,
  LiveTailoringMeta,
} from "@/services/interview/live.service"
import type { InterviewFrame } from "@/services/interview/practice.service"
import { fmtScore, type PipelineStepOutcome, type RunSource } from "./runFormat"
import {
  PipelineStepLines,
  ProvenanceNotice,
  ScorecardDraftLineCustom,
  ScorecardDraftLineStar,
} from "./runParts"

export type ExportKind = "word" | "pdf" | "save"

export type InterviewWriteUpProps = {
  source: RunSource
  finalizeResult: FinalizeResult | null
  finalizeError: string | null
  readOnly: boolean
  exporting: ExportKind | null
  onExport: (kind: ExportKind) => void
  onRestart: () => void
  onRetry: () => void
  /** The interviewee as recorded (candidate on star, participant on custom). */
  person: { display_name?: string; candidate_id?: string } | null
  frame: InterviewFrame | null
  /** star only */
  pipelineSteps: PipelineStepOutcome[]
  /** custom only */
  employer: LiveEmployerMeta | null
  tailoring: LiveTailoringMeta | null
}

function ExportButtons({ exporting, onExport }: { exporting: ExportKind | null; onExport: (k: ExportKind) => void }) {
  return (
    <>
      <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => void onExport("word")}>
        {exporting === "word" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Word
      </Button>
      <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => void onExport("pdf")}>
        {exporting === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} PDF
      </Button>
      <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => void onExport("save")}>
        {exporting === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
      </Button>
    </>
  )
}

function FailedOrCompiling({ finalizeError, onRetry }: { finalizeError: string | null; onRetry: () => void }) {
  return finalizeError ? (
    <Card className="border-rose-200 bg-rose-50/50">
      <CardContent className="space-y-3 py-6 text-sm">
        <p className="font-medium text-rose-900">The scored write-up could not be compiled.</p>
        <p className="text-rose-800">{finalizeError}</p>
        <p className="text-xs text-rose-700">
          Nothing was lost — the answers and ratings are saved. Try again.
        </p>
        <Button size="sm" variant="outline" onClick={() => void onRetry()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent className="flex items-center py-8 text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Compiling the scored write-up…
      </CardContent>
    </Card>
  )
}

function ReadOnlyCard() {
  return (
    <Card className="border-slate-300 bg-slate-50">
      <CardContent className="py-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Reopened for review — read only.</p>
        <p className="mt-1 text-xs">
          This is the interview as it was recorded. Its score is the one the decision was
          made on and is not recalculated; ratings cannot be changed and it cannot be
          finalized again. Exporting it again is fine.
        </p>
      </CardContent>
    </Card>
  )
}

function UnratedCard({ result }: { result: FinalizeResult }) {
  if ((result.unrated?.length ?? 0) === 0) return null
  return (
    <Card className="border-amber-200 bg-amber-50/60">
      <CardContent className="space-y-2 py-4 text-sm">
        <p className="font-medium text-amber-900">
          {result.unrated!.length} of {result.answer_count ?? result.answers.length}{" "}
          answers were never rated and are NOT part of this score.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
          {result.unrated!.map((u) => (
            <li key={u.answer_id}>{u.question_text || u.competency_id}</li>
          ))}
        </ul>
        <p className="text-xs text-amber-700">
          They are still in the transcript below. A score that quietly dropped them
          would read as a complete scorecard.
        </p>
      </CardContent>
    </Card>
  )
}

function StarWriteUp(p: InterviewWriteUpProps) {
  const { finalizeResult, person, frame } = p
  return (
    <div className="mx-auto max-w-3xl space-y-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Interview Results</h1>
          <p className="text-sm text-slate-600">
            {person?.display_name} · {frame?.roleTitle} · {frame?.company}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {finalizeResult && <ExportButtons exporting={p.exporting} onExport={p.onExport} />}
          <Button variant="ghost" size="sm" onClick={p.onRestart}><RefreshCw className="mr-2 h-4 w-4" /> New interview</Button>
        </div>
      </header>

      {!finalizeResult ? (
        <FailedOrCompiling finalizeError={p.finalizeError} onRetry={p.onRetry} />
      ) : (
        <>
          {p.readOnly && <ReadOnlyCard />}
          <Card>
            <CardHeader><CardTitle className="text-base">What the evidence shows</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-semibold text-slate-900">{finalizeResult.recommendation}</p>
              <ScorecardDraftLineStar linked={!!person?.candidate_id} report={finalizeResult.scorecard_draft} />
              <PipelineStepLines outcomes={p.pipelineSteps} />
              <p className="text-sm text-slate-600">
                Overall score: <span className="font-medium">{fmtScore(finalizeResult.overall_score)}</span> / 5
                {" · "}Mean: <span className="font-medium">{fmtScore(finalizeResult.overall_mean)}</span>
              </p>
            </CardContent>
          </Card>

          <UnratedCard result={finalizeResult} />
          <Card>
            <CardHeader><CardTitle className="text-base">Section scores</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {normalizeSectionScores(finalizeResult.section_scores).map((s) => (
                <div key={s.section} className="flex items-center justify-between border-b border-slate-100 py-1 text-sm last:border-0">
                  <span className="text-slate-700">{s.section}</span>
                  <span className="font-medium">{fmtScore(s.score)} / 5</span>
                </div>
              ))}
              {normalizeSectionScores(finalizeResult.section_scores).length === 0 && (
                <p className="text-sm text-slate-500">No section scores were recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Answer-by-answer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {finalizeResult.answers.map((a) => (
                <div key={a.answer_id} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{a.competency_id}</p>
                  {a.question_text && <p className="mt-1 text-sm font-medium text-slate-900">{a.question_text}</p>}
                  <p className="mt-1 text-sm text-slate-700">{a.captured_answer}</p>
                  {/* Read `final_source`, never `final_score` — an unrated answer is
                      seeded with a number and must never read as a decision (IS-4). */}
                  {a.final_source ? (
                    <p className="mt-1 text-sm text-indigo-700">
                      Final score: {a.final_score ?? "—"} / 5
                      {a.final_source === "model" && <span className="text-slate-500"> (AI suggestion adopted)</span>}
                      {typeof a.suggested_score === "number" && <span className="text-slate-500"> (AI suggested {a.suggested_score})</span>}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      Not decided — this answer was not part of the score.
                      {typeof a.suggested_score === "number" && <span> The AI suggested {a.suggested_score}.</span>}
                    </p>
                  )}
                  {a.interviewer_notes && <p className="mt-1 text-xs text-slate-600">Notes: {a.interviewer_notes}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function CustomWriteUp(p: InterviewWriteUpProps) {
  const { finalizeResult, person, frame } = p
  const feedback = finalizeResult?.feedback
  const isHiring = frame?.kind === "hiring"
  const subtitle = [person?.display_name, frame?.topic].filter(Boolean).join(" · ")
  return (
    <div className="mx-auto max-w-3xl space-y-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Interview Results</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
          <div className="mt-2"><ProvenanceNotice employer={p.employer} tailoring={p.tailoring} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {finalizeResult && <ExportButtons exporting={p.exporting} onExport={p.onExport} />}
          <Button variant="ghost" size="sm" onClick={p.onRestart}><RefreshCw className="mr-2 h-4 w-4" /> New interview</Button>
        </div>
      </header>

      {!finalizeResult ? (
        <FailedOrCompiling finalizeError={p.finalizeError} onRetry={p.onRetry} />
      ) : (
        <>
          {p.readOnly && <ReadOnlyCard />}
          <Card>
            <CardHeader><CardTitle className="text-base">{isHiring ? "What the evidence shows" : "Overall assessment"}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-semibold capitalize text-slate-900">{finalizeResult.recommendation}</p>
              <ScorecardDraftLineCustom linked={!!person?.candidate_id} report={finalizeResult.scorecard_draft} />
              <p className="text-sm text-slate-600">
                Overall score: <span className="font-medium">{fmtScore(finalizeResult.overall_score)}</span> / 5
                {" · "}Mean: <span className="font-medium">{fmtScore(finalizeResult.overall_mean)}</span>
              </p>
            </CardContent>
          </Card>

          {feedback?.generated && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-indigo-600" /> Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {feedback.summary && <p className="text-sm text-slate-700">{feedback.summary}</p>}
                {feedback.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
                    <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                      {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {feedback.development_areas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Areas to develop</p>
                    <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                      {feedback.development_areas.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <UnratedCard result={finalizeResult} />
          <Card>
            <CardHeader><CardTitle className="text-base">Section scores</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {normalizeSectionScores(finalizeResult.section_scores).map((s) => (
                <div key={s.section} className="flex items-center justify-between border-b border-slate-100 py-1 text-sm last:border-0">
                  <span className="capitalize text-slate-700">{s.section.replace(/_/g, " ")}</span>
                  <span className="font-medium">
                    {fmtScore(s.score)} / 5
                    {feedback?.per_section?.[s.section] && (
                      <span className="ml-2 font-normal text-slate-500">— {feedback.per_section[s.section]}</span>
                    )}
                  </span>
                </div>
              ))}
              {normalizeSectionScores(finalizeResult.section_scores).length === 0 && (
                <p className="text-sm text-slate-500">No section scores were recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Answer-by-answer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {finalizeResult.answers.map((a) => (
                <div key={a.answer_id} className="border-b border-slate-100 pb-3 last:border-0">
                  {a.question_text && <p className="text-sm font-medium text-slate-900">{a.question_text}</p>}
                  <p className="mt-1 text-sm text-slate-700">{a.captured_answer}</p>
                  {/* Read `final_source`, never `final_score` (IS-4); see the star copy. */}
                  {a.final_source ? (
                    <p className="mt-1 text-sm text-indigo-700">
                      Score: {a.final_score ?? "—"} / 5
                      {a.final_source === "model" && <span className="text-slate-500"> (AI suggestion adopted)</span>}
                      {typeof a.suggested_score === "number" && <span className="text-slate-500"> (AI suggested {a.suggested_score})</span>}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      Not decided — this answer was not part of the score.
                      {typeof a.suggested_score === "number" && <span> The AI suggested {a.suggested_score}.</span>}
                    </p>
                  )}
                  {a.interviewer_notes && <p className="mt-1 text-xs text-slate-600">Notes: {a.interviewer_notes}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default function InterviewWriteUp(props: InterviewWriteUpProps) {
  return props.source === "star" ? <StarWriteUp {...props} /> : <CustomWriteUp {...props} />
}
