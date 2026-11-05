/**
 * RWO-8 §9 — a job description read from a file and kept with the person for
 * 90 days (shown only while the server sends `jobFileStorageEnabled`).
 *
 * The draft is aimed by the text read on the person's device, sent in the
 * request's existing `positionText`. No document id is ever sent for the
 * target, so the stored copy cannot be used to point a draft at someone
 * else's file; it exists only for "Use a saved job description".
 */
import type { ResumeOptionView } from "@/types/resumeWriter"

export const JOB_DESCRIPTION_KIND = "job_description"

/** The server reads this much of `positionText` (agent-engine
 * resume_writer/options.py: 4,000; Federal 12,000). It truncates past it
 * anyway; the page keeps the typed text whole when both are given. */
export const POSITION_MAX = 4000
export const POSITION_MAX_FEDERAL = 12000

export function positionCap(option: ResumeOptionView | undefined): number {
  return option?.takesFederalDetails ? POSITION_MAX_FEDERAL : POSITION_MAX
}

/**
 * The posting text for the request: the typed description, then a blank line,
 * then the file's text. Within `cap`, the typed text wins and the file's text is
 * cut. Returns null when there is nothing to send.
 */
export function combinePosting(
  typed: string,
  fileText: string,
  cap: number,
): { text: string; truncated: boolean } | null {
  const t = typed.trim()
  const f = fileText.trim()
  if (!t && !f) return null
  if (!f) return { text: t.slice(0, cap), truncated: t.length > cap }
  if (!t) return { text: f.slice(0, cap), truncated: f.length > cap }
  const joined = `${t}\n\n${f}`
  if (joined.length <= cap) return { text: joined, truncated: false }
  const room = cap - t.length - 2
  if (room <= 0) return { text: t.slice(0, cap), truncated: true }
  return { text: `${t}\n\n${f.slice(0, room)}`, truncated: true }
}

/** "Deletes on 3 Feb 2027" for a document with an expiry, else null. */
export function deletesOnLabel(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null
  const d = new Date(expiresAt)
  if (Number.isNaN(d.getTime())) return null
  return `Deletes on ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`
}
