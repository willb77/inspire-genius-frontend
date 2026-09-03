import type { QuestionSetInput } from "@/types/prism-exam"

/** Client-side check mirroring the backend's 422s, so the toast says what to fix. */
export function validateQuestionSet(raw: string): { ok: true; value: QuestionSetInput } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "Not valid JSON." }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: "Expected a JSON object." }
  const o = parsed as Record<string, unknown>
  const name = typeof o.name === "string" ? o.name.trim() : ""
  if (!name) return { ok: false, error: "name is required." }
  const passMark = o.pass_mark === undefined ? 0.8 : Number(o.pass_mark)
  if (!(passMark >= 0 && passMark <= 1)) return { ok: false, error: "pass_mark must be between 0 and 1." }
  const chapters = o.chapters
  if (!chapters || typeof chapters !== "object" || Array.isArray(chapters) || !Object.keys(chapters).length) {
    return { ok: false, error: "chapters must be an object of key → title." }
  }
  const questions = o.questions
  if (!Array.isArray(questions) || !questions.length) return { ok: false, error: "questions must be a non-empty array." }
  const ids = new Set<string>()
  const out: QuestionSetInput["questions"] = []
  for (const [i, q] of questions.entries()) {
    if (!q || typeof q !== "object") return { ok: false, error: `question ${i + 1} is not an object.` }
    const { id, chapter, page, q: text, expected } = q as Record<string, unknown>
    if (typeof id !== "string" || !id.trim()) return { ok: false, error: `question ${i + 1} needs an id.` }
    if (ids.has(id)) return { ok: false, error: `duplicate question id ${id}.` }
    ids.add(id)
    if (typeof chapter !== "string" || !(chapter in (chapters as Record<string, string>))) {
      return { ok: false, error: `question ${id} references a chapter not in the set.` }
    }
    if (typeof text !== "string" || text.trim().length < 5) return { ok: false, error: `question ${id} needs a q of at least 5 characters.` }
    if (typeof expected !== "string" || expected.trim().length < 3) return { ok: false, error: `question ${id} needs an expected answer.` }
    out.push({ id, chapter, page: typeof page === "number" ? page : null, q: text, expected })
  }
  return { ok: true, value: { name, pass_mark: passMark, chapters: chapters as Record<string, string>, questions: out } }
}
