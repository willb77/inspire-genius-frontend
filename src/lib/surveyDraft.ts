/**
 * Pure draft factories for the survey builder (no persistence).
 *
 * Surveys are now stored server-side (survey-service); these helpers just mint
 * fresh, un-persisted draft objects the builder edits before POSTing.
 */
import type { Survey, SurveyQuestion } from "@/types/survey"

export function newId(prefix: string): string {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto
    if (c && typeof c.randomUUID === "function") return `${prefix}_${c.randomUUID()}`
  } catch {
    /* fall through */
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Build a fresh, empty survey draft (client-only until saved). */
export function createDraftSurvey(): Survey {
  return {
    id: newId("survey"),
    title: "",
    description: "",
    questions: [],
  }
}

/** Build a fresh, empty question of the given type. */
export function createDraftQuestion(type: SurveyQuestion["type"] = "text"): SurveyQuestion {
  const base: SurveyQuestion = { id: newId("q"), prompt: "", type }
  if (type === "single" || type === "multi") base.options = ["", ""]
  if (type === "rating") base.scaleMax = 5
  return base
}
