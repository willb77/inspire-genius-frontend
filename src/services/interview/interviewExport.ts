/**
 * Interview transcript export + save.
 *
 * Reuses the branded transcript exporter (`src/lib/exportTranscript`) — the same
 * house-style engine behind the Meridian conversation exports — to produce a
 * Word (.doc) or PDF of the interview findings + full Q&A, and saves it to the
 * user's documents (document-service) so it's retrievable later from My Documents.
 */
import {
  buildTurnHtml,
  exportTurn,
  type TurnExportInput,
} from "@/lib/exportTranscript/exportTurn"
import { downloadBlob } from "@/lib/exportTranscript"
import { initiateUpload, uploadToS3 } from "@/services/documents/documentService"
import type { InterviewExchange, InterviewFrame } from "@/services/interview/practice.service"
import { normalizeSectionScores } from "@/services/interview/live.service"
import type { FinalizeResult } from "@/services/interview/live.service"

/** Format a score that may arrive as a number, numeric string, or null. */
function fmtScore(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(2) : "—"
}

export type InterviewSession = {
  frame: InterviewFrame
  exchanges: InterviewExchange[]
  coaching: Record<number, string>
  findings: string | null
  planned: number
  userLabel?: string
}

/** Markdown body (the exporter's `markdownToHtml` handles headings/bold/lists). */
export function buildInterviewMarkdown(s: InterviewSession): string {
  const f = s.frame
  const lines: string[] = []
  lines.push(`**Role:** ${f.roleTitle} · **Company:** ${f.company} · **Industry:** ${f.industry}`)
  lines.push(`**Reporting line:** ${f.reportingLine}`)
  lines.push(`**Scope:** ${f.scope}`)
  lines.push(`**Questions answered:** ${s.exchanges.length} of ${s.planned}`)
  lines.push("")
  lines.push("## Coaching Summary")
  lines.push(s.findings?.trim() || "_No summary was generated._")
  lines.push("")
  lines.push("## Full Transcript")
  for (const e of s.exchanges) {
    lines.push(`### Question ${e.number} — ${e.sectionTitle} · ${e.competency}`)
    lines.push(`**Question:** ${e.question}`)
    lines.push(`**Your answer:** ${e.answer}`)
    const c = s.coaching[e.number]
    if (c) lines.push(`**Coaching:** ${c}`)
    lines.push("")
  }
  return lines.join("\n")
}

function toInput(s: InterviewSession): TurnExportInput {
  const stamp = `${s.frame.roleTitle} — ${s.frame.company}`
  return {
    speaker: "Interview Practice Findings",
    body: buildInterviewMarkdown(s),
    timestamp: stamp,
    userLabel: s.userLabel,
    slug: `interview-practice-${s.frame.roleTitle}`,
  }
}

/** Download the interview as Word (.doc) or PDF. */
export async function downloadInterview(s: InterviewSession, format: "word" | "pdf"): Promise<void> {
  await exportTurn(toInput(s), format)
}

function safeName(s: InterviewSession): string {
  const raw = `Interview Practice - ${s.frame.roleTitle} - ${s.frame.company}`
  return raw.replace(/[^a-zA-Z0-9 \-_]/g, "").slice(0, 120).trim() || "Interview Practice"
}

/** Build the Word blob (no download) for saving. */
function wordBlob(s: InterviewSession): Blob {
  const html = buildTurnHtml(toInput(s))
  // BOM so Word reads UTF-8 correctly (matches exportTurn's word path).
  return new Blob(["﻿", html], { type: "application/msword;charset=utf-8" })
}

/**
 * Save the interview transcript (Word) to the user's documents so it can be
 * retrieved later from My Documents. Returns the created document id.
 */
export async function saveInterviewToDocuments(s: InterviewSession): Promise<string> {
  const blob = wordBlob(s)
  const filename = `${safeName(s)}.doc`
  const file = new File([blob], filename, { type: "application/msword" })

  const presigned = await initiateUpload({
    filename,
    content_type: "application/msword",
    file_size: file.size,
    doc_kind: "interview-transcript",
    tags: ["interview-practice", s.frame.roleTitle].filter(Boolean),
  })
  await uploadToS3(presigned.upload_url, presigned.upload_fields, file)
  return presigned.document_id
}

// ─── Scored (Live Interview) export ────────────────────────────────
//
// The scoreless functions above are for the candidate-side PRACTICE flow
// (coaching, no scores, "Your answer"). This section is the EVALUATOR-side
// counterpart for a real, scored Live Interview (`live.service.ts`
// `finalize()` result): interviewer ratings, STAR evidence, section scores,
// and a banded recommendation. Reuses the same branded `exportTurn` engine —
// only the markdown body and the save `doc_kind` differ.

export type ScoredInterviewExport = {
  result: FinalizeResult
  /** Signed-in interviewer's display name, for the header meta line. */
  userLabel?: string
}

const STAR_LABELS: Array<{ key: "S" | "T" | "A" | "R"; label: string }> = [
  { key: "S", label: "Situation" },
  { key: "T", label: "Task" },
  { key: "A", label: "Action" },
  { key: "R", label: "Result" },
]

/** Markdown body for the scored, evaluator-facing write-up. */
export function buildScoredInterviewMarkdown(s: ScoredInterviewExport): string {
  const { result } = s
  const frame = result.session.frame
  const candidate = result.session.candidate
  const lines: string[] = []

  if (frame) {
    lines.push(`**Role:** ${frame.roleTitle} · **Company:** ${frame.company} · **Industry:** ${frame.industry}`)
  }
  if (candidate) {
    lines.push(
      `**Candidate:** ${candidate.display_name}` +
        (candidate.external_id ? ` (ID: ${candidate.external_id})` : ""),
    )
  }
  lines.push(`**Questions scored:** ${result.answers.length}`)
  lines.push("")

  lines.push(frame?.kind === "hiring" || !frame?.mode ? "## Recommendation" : "## Overall Assessment")
  lines.push(`**${result.recommendation}**`)
  lines.push(
    `Overall score: **${fmtScore(result.overall_score)} / 5** · Overall mean: **${fmtScore(result.overall_mean)}**`,
  )
  lines.push("")

  // Advisory narrative (Interview Studio + live) — present when synthesized.
  const feedback = result.feedback
  if (feedback?.generated) {
    lines.push("## Feedback")
    if (feedback.summary) {
      lines.push(feedback.summary)
      lines.push("")
    }
    if (feedback.strengths.length > 0) {
      lines.push("**Strengths**")
      feedback.strengths.forEach((x) => lines.push(`- ${x}`))
      lines.push("")
    }
    if (feedback.development_areas.length > 0) {
      lines.push("**Areas to develop**")
      feedback.development_areas.forEach((x) => lines.push(`- ${x}`))
      lines.push("")
    }
  }

  lines.push("## Rubric Summary")
  lines.push("| Section | Score | Questions |")
  lines.push("|---|---|---|")
  for (const sec of normalizeSectionScores(result.section_scores)) {
    lines.push(`| ${sec.section} | ${fmtScore(sec.score)} / 5 | ${sec.count ?? "—"} |`)
  }
  lines.push("")

  lines.push("## Answer-by-Answer")
  result.answers.forEach((a, idx) => {
    const heading = a.section ? `${a.section} · ${a.competency_id}` : a.competency_id
    lines.push(`### Question ${idx + 1} — ${heading}`)
    if (a.question_text) lines.push(`**Question:** ${a.question_text}`)
    lines.push(`**Candidate answer:** ${a.captured_answer}`)
    const evidence = STAR_LABELS.map(
      ({ key, label }) => `${label}: ${a.star_evidence[key]?.present ? "Present" : "Not observed"}`,
    ).join(" · ")
    lines.push(`**STAR evidence:** ${evidence}`)
    lines.push(`**Final score:** ${a.final_score ?? "—"} / 5${a.capped ? " (capped)" : ""}`)
    if (typeof a.suggested_score === "number") {
      lines.push(`**AI-suggested score (advisory):** ${a.suggested_score} / 5`)
    }
    lines.push(`**Interviewer notes:** ${a.interviewer_notes?.trim() || "_None recorded._"}`)
    lines.push("")
  })

  return lines.join("\n")
}

function toScoredInput(s: ScoredInterviewExport): TurnExportInput {
  const frame = s.result.session.frame
  const candidate = s.result.session.candidate
  const stamp = frame ? `${frame.roleTitle} — ${frame.company}` : undefined
  return {
    speaker: "Interview Scorecard",
    body: buildScoredInterviewMarkdown(s),
    timestamp: stamp,
    userLabel: s.userLabel,
    slug: `interview-scorecard-${candidate?.display_name ?? frame?.roleTitle ?? s.result.session.session_id}`,
  }
}

/** Download the scored interview write-up as Word (.doc) or PDF. */
export async function downloadScoredInterview(
  s: ScoredInterviewExport,
  format: "word" | "pdf",
): Promise<void> {
  await exportTurn(toScoredInput(s), format)
}

function safeScoredName(s: ScoredInterviewExport): string {
  const frame = s.result.session.frame
  const candidate = s.result.session.candidate
  const raw = `Interview Scorecard - ${candidate?.display_name ?? "Candidate"} - ${frame?.roleTitle ?? ""}`
  return raw.replace(/[^a-zA-Z0-9 \-_]/g, "").slice(0, 120).trim() || "Interview Scorecard"
}

function scoredWordBlob(s: ScoredInterviewExport): Blob {
  const html = buildTurnHtml(toScoredInput(s))
  return new Blob(["﻿", html], { type: "application/msword;charset=utf-8" })
}

/**
 * Save the scored interview write-up (Word) to the interviewer's documents,
 * under the "interview-scorecard" doc_kind — distinct from the scoreless
 * practice transcript's "interview-transcript" — so a report can later
 * filter/search the two apart. Returns the created document id.
 */
export async function saveScoredInterviewToDocuments(s: ScoredInterviewExport): Promise<string> {
  const blob = scoredWordBlob(s)
  const filename = `${safeScoredName(s)}.doc`
  const file = new File([blob], filename, { type: "application/msword" })

  const frame = s.result.session.frame
  const candidate = s.result.session.candidate
  const presigned = await initiateUpload({
    filename,
    content_type: "application/msword",
    file_size: file.size,
    doc_kind: "interview-scorecard",
    tags: ["interview-scorecard", candidate?.display_name, frame?.roleTitle].filter(
      (t): t is string => Boolean(t),
    ),
  })
  await uploadToS3(presigned.upload_url, presigned.upload_fields, file)
  return presigned.document_id
}

// Re-export for tests/callers that want the raw download helper.
export { downloadBlob }
