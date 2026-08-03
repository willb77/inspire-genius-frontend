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

// Re-export for tests/callers that want the raw download helper.
export { downloadBlob }
