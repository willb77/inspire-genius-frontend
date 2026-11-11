/**
 * JF-12 — skills match (`GET /v1/agents/me/skill-match?onet=`).
 * My confirmed skills (JF-11) against the job's important O*NET skills.
 * Supplementary: it carries no fit score and never changes one.
 */

/** Why a list is empty. `null` when both lists came back from a loaded release. */
export type SkillMatchReason =
  | "onet_not_loaded"
  | "onet_unavailable"
  | "job_not_in_onet"
  | "no_onet_skills"
  | "no_skills"

export type SkillMatchItem = {
  elementId: string
  name: string
  /** O*NET Importance, 1–5. */
  importance: number | null
  /** O*NET Level, 0–7. */
  level: number | null
  /** On a "have" item: the name the person saved it under. */
  yourSkill?: string
}

export type SkillMatch = {
  reason: SkillMatchReason | null
  message: string | null
  occupation: { code: string; socCode: string | null; title: string } | null
  onet: { state: "ready" | "empty" | "unavailable"; release: string | null; attribution: string | null } | null
  have: SkillMatchItem[]
  toBuild: SkillMatchItem[]
  skillCount: number
  importanceThreshold: number
  note: string
}
