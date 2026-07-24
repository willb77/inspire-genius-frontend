/**
 * PRISM Report glossary — display ordering, human labels, and brief plain-language
 * definitions for the score categories and the three PRISM behavioural maps.
 *
 * Definitions are condensed from the platform's own PRISM knowledge base
 * (services/agent-engine/app/agents/coaching/prism_knowledge.py, PrismSection.MAPS)
 * plus the standard published constructs (Big Five / OCEAN, Emotional Intelligence,
 * Mental Toughness). They are intentionally brief — one line the coach can read at a
 * glance — not a substitute for the full PRISM report narrative.
 */

/** Category render order — Work Preference Profile leads, then the behavioural maps. */
export const CATEGORY_ORDER = [
  "WorkPreferenceProfile",
  "BehaviorPreferences",
  "CoreTraits",
  "WorkAptitudes",
  "EmotionalIntelligence",
  "MentalToughness",
  "BigFive",
  "CDA",
] as const

/** Human-readable category headings. Unknown categories fall back to their raw key. */
export const CATEGORY_LABEL: Record<string, string> = {
  WorkPreferenceProfile: "Work Preference Profile",
  BehaviorPreferences: "Behaviour Preferences",
  CoreTraits: "Core Traits",
  WorkAptitudes: "Work Aptitudes",
  EmotionalIntelligence: "Emotional Intelligence",
  MentalToughness: "Mental Toughness",
  BigFive: "Big Five",
  CDA: "CDA",
}

/** One-line definition of what each category measures. */
export const CATEGORY_DEF: Record<string, string> = {
  WorkPreferenceProfile:
    "The working style this person naturally gravitates toward, across twelve behavioural dimensions.",
  BehaviorPreferences:
    "The eight core PRISM behaviours (e.g. Coordinating, Innovating, Delivering), each shown across the Underlying, Adaptive and Consistent maps.",
  CoreTraits:
    "Six foundational traits that underpin workplace performance — conscientiousness, decisiveness, emotional stability, flexibility, relationship management and self-motivation.",
  WorkAptitudes:
    "Natural aptitude across eight work-activity areas — the kinds of work this person is most naturally suited to.",
  EmotionalIntelligence:
    "The capacity to recognise and manage one's own emotions and to read and influence the emotions of others.",
  MentalToughness:
    "Resilience and the ability to stay determined, confident and composed under pressure, and to bounce back from setbacks.",
  BigFive:
    "The Big Five (OCEAN) personality model — openness, conscientiousness, extraversion, agreeableness and emotional stability.",
  CDA: "Cognitive and work-competency indicators — thinking style, attention to detail, dependability, drive and related capabilities.",
}

/** The three PRISM maps / score types. Order is the canonical read order. */
export const SCORE_TYPE_ORDER = ["Underlying", "Adaptive", "Consistent"] as const
export type ScoreType = (typeof SCORE_TYPE_ORDER)[number]

/**
 * Normalise a raw scoreType from the CSV to one of the three canonical map names.
 * PRISM exports the middle map as "Adapted"; we surface it as "Adaptive".
 */
export function normalizeScoreType(raw?: string | null): ScoreType | null {
  const v = (raw ?? "").trim().toLowerCase()
  if (v === "underlying") return "Underlying"
  if (v === "adapted" || v === "adaptive") return "Adaptive"
  if (v === "consistent") return "Consistent"
  return null
}

/** Brief definition of each map, condensed from PrismSection.MAPS. */
export const SCORE_TYPE_DEF: Record<ScoreType, string> = {
  Underlying:
    "The natural, instinctive “real” person — how they behave when relaxed or under pressure, with no attempt to manage how they come across.",
  Adaptive:
    "How they modify their natural behaviour to meet what they perceive the current environment demands. Shifts as the situation changes.",
  Consistent:
    "Their likely overall behaviour in public — the preferences that hold steady across both the Underlying and Adaptive maps (about 70% of the time), and how most others see them.",
}

/** Accent colour per map, for the value badges. */
export const SCORE_TYPE_ACCENT: Record<ScoreType, { text: string; bg: string; border: string }> = {
  Underlying: { text: "#1B2A4A", bg: "rgba(27,42,74,0.08)", border: "rgba(27,42,74,0.18)" },
  Adaptive: { text: "#7A4DB0", bg: "rgba(122,77,176,0.08)", border: "rgba(122,77,176,0.20)" },
  Consistent: { text: "#127A8A", bg: "rgba(18,122,138,0.08)", border: "rgba(18,122,138,0.20)" },
}

/** Order categories for display: known order first, then any unknown categories as-is. */
export function orderedCategories(present: string[]): string[] {
  const known = CATEGORY_ORDER.filter((c) => present.includes(c))
  const rest = present.filter((c) => !CATEGORY_ORDER.includes(c as (typeof CATEGORY_ORDER)[number]))
  return [...known, ...rest]
}
