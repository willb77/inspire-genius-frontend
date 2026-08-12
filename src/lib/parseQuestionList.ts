/**
 * Parse a plain-text blob (from an uploaded .txt/.md/.pdf/.docx question list,
 * extracted via {@link extractRoleText}) into a clean list of interview
 * questions — one per non-empty line, with common list markers stripped.
 *
 * Deliberately forgiving: an interviewer's question file might be numbered
 * (`1. …`), bulleted (`- …`, `• …`), prefixed (`Q: …`), or just one question
 * per line. All of those collapse to the bare question text. Blank lines are
 * skipped, exact duplicates are dropped (order preserved), and the result is
 * capped so a pathological file can't create hundreds of questions.
 */

/** Max questions taken from a single uploaded file. */
export const MAX_PARSED_QUESTIONS = 50

/** Leading list/enumeration markers to strip from each line. */
const LEADING_MARKER = /^\s*(?:\(?\d+[.)\]]|[-*•·▪◦‣–—]|Q\d*\s*[:.)-]?)\s+/i

/** Minimum length (after stripping) for a line to count as a question. */
const MIN_LEN = 3

export function parseQuestionList(text: string): string[] {
  if (!text) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line) continue
    // Strip a single leading marker (numbering / bullet / "Q:").
    line = line.replace(LEADING_MARKER, "").trim()
    if (line.length < MIN_LEN) continue
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
    if (out.length >= MAX_PARSED_QUESTIONS) break
  }
  return out
}
