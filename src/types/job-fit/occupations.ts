/**
 * JF-6 — the OD-4 occupation read surface (`/v1/agents/occupations`), as the
 * job detail page reads it. Every answer is `{ state, reason, ..., data }`:
 * `ready` carries data; `empty` (nothing loaded for this question) and
 * `unavailable` (the tables could not be read) carry `data: null` and a reason.
 * Values come only from published tables — the page never fills a gap.
 */

export type OccupationReadState = "ready" | "empty" | "unavailable"

export type OccupationRead<T> = {
  state: OccupationReadState
  reason: string | null
  data: T | null
  /** O*NET release and its licence attribution (occupation reads only). */
  release?: string
  attribution?: string
}

export type OccupationSkill = {
  elementId: string
  name: string
  family?: string | null
  importance: number | null
  level: number | null
}

export type OccupationEducation = {
  category: number
  label: string | null
  percent: number | null
}

export type OccupationDetail = {
  code: string
  socCode: string | null
  title: string
  description: string
  skills: OccupationSkill[]
  education: OccupationEducation[] | null
  missing: string[]
}

export type OccupationPayLevel = "metro" | "nonmetro" | "state" | "national"

export type OccupationPay = {
  socCode: string
  title: string
  level: OccupationPayLevel
  requestedLevel: "local" | "state" | "national"
  areaLabel: string
  fallbackReason: string | null
  median: number | null
  pct10: number | null
  pct90: number | null
  vintageLabel?: string | null
  source: string
}
