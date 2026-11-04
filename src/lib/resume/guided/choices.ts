// RWO-8 — the wireframe details the first build left out (boards Step3, Step4,
// Step5 and the header): the "Your choices" summary, what a clicked review line
// puts in the assistant's box, and the name the download will be saved under.

import { SITUATIONS, type Situation } from "@/lib/resume/formatSelector"
import { atsFileBase } from "@/lib/resume/resumeDocument"

/** The server's cap on a draft's `instruction` (Apply), mirrored by the assistant. */
export const INSTRUCTION_MAX = 300

export type Choice = { label: string; value: string }

/**
 * Step 3's "Your choices" box (board Step3): what it's for, the format, what it
 * is drafted from and what it is aimed at, plus the bullet style when the
 * server offers a choice of them. A row with nothing chosen is left out.
 */
export function yourChoices(input: {
  situation: Situation | ""
  formatName: string
  sources: { resume: boolean; bio: boolean; assessments: string[] }
  addedDocuments: number
  aimedAt: string
  styleName: string
}): Choice[] {
  const rows: Choice[] = []
  const situation = SITUATIONS.find((s) => s.id === input.situation)
  if (situation) rows.push({ label: "For", value: situation.label })
  if (input.formatName) rows.push({ label: "Format", value: input.formatName })
  const from = [
    input.sources.resume || input.addedDocuments > 0 ? "your résumé" : "",
    input.sources.bio ? "your bio" : "",
    ...input.sources.assessments,
  ].filter(Boolean)
  if (from.length) rows.push({ label: "From", value: from.join(" + ") })
  rows.push({ label: "Aimed at", value: input.aimedAt.trim() || "General — no particular job" })
  if (input.styleName) rows.push({ label: "Bullet style", value: input.styleName })
  return rows
}

/** "Ask about this line": a question for the assistant (sent only when the person sends it). */
export function askAboutLine(line: string): string {
  return `Why is this line on my résumé, and is it strong enough: "${line.trim()}"`
}

/**
 * "Rewrite this line": the start of a direction the person finishes. Once sent,
 * Apply under it uses one draft, as every Apply does. Never longer than the
 * instruction cap, so what they finish can still be applied whole; an over-long
 * line is cut with an ellipsis, leaving room to say what to change.
 */
export function rewriteLine(line: string): string {
  const head = "Rewrite: “"
  const tail = "” — "
  const room = INSTRUCTION_MAX - head.length - tail.length - 80
  const text = line.trim()
  const quoted = text.length > room ? `${text.slice(0, room - 1).trimEnd()}…` : text
  return `${head}${quoted}${tail}`
}

/** The name a download is saved under — the same base renderAtsResume uses. */
export function downloadFileName(name: string, aimedAt: string, kind: "docx" | "pdf"): string {
  return `${atsFileBase(name, aimedAt || null)}.${kind}`
}
