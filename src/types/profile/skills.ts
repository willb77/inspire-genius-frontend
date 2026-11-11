/** JF-11 — one skill the person confirmed (`/v1/agents/me/skills`). */
export type UserSkill = {
  id: string
  name: string
  source: "manual" | "resume"
  /** O*NET's descriptor id when the SERVER matched the name; null otherwise. */
  onetElementId: string | null
  onetRelease: string | null
  matched: boolean
  savedAt: string | null
}

export type SaveSkillIn = {
  name: string
  source?: "manual" | "resume"
}

export type SaveSkillOut = {
  skill: UserSkill
  /** false when the person already had this skill. */
  created: boolean
}

export type SkillMatch = "matched" | "not_matched" | "not_matched_yet"

/** A suggestion from the person's résumé. Never saved until they confirm it. */
export type SkillSuggestion = {
  name: string
  match: SkillMatch
  /** Shown next to an item with no O*NET match; null when matched. */
  label: string | null
  onetElementId: string | null
  foundIn: "skills_section" | "resume_text"
  alreadySaved: boolean
}

export type OnetVocabulary = {
  state: "ready" | "empty" | "unavailable"
  releaseVersion: string | null
  attribution: string | null
  message: string | null
}

export type SkillSuggestions = {
  suggestions: SkillSuggestion[]
  source: { documentId: string; filename: string | null } | null
  onet: OnetVocabulary | null
  reason: "no_resume" | "nothing_found" | "unreadable" | null
  message: string | null
}
