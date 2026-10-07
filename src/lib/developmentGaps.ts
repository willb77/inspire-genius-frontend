/**
 * TDS-8: what kind of gap a row is — decided by `engineVersion`, never by
 * `source`.
 *
 * Before TDS-8 every gap the dossier compute wrote was labelled `behavioral`
 * and rendered with current/target level bars, although those levels came from
 * an LLM (or a hard-coded 2 → 4). From TDS-8 a row is MEASURED only when the
 * fit engine wrote it, which the backend marks by setting `engineVersion`.
 * Legacy `behavioral` rows carry no engine version, so they read as indicative
 * without a single row being rewritten.
 *
 * The presence gate: a backend that classifies gaps always sends the
 * `engineVersion` key (null when unmeasured). An older backend omits it, and
 * such a row is `unclassified` — the caller renders it exactly as before. That
 * is what keeps one frontend deploy, which reaches both tiers, from changing
 * staging-b's Gaps tab ahead of its backend promote.
 */
import type { DevelopmentGap } from "@/types/development"

export type GapKind = "measured" | "indicative" | "skill" | "unclassified"

export function classifyGap(gap: DevelopmentGap): GapKind {
  if (gap.source === "skill") return "skill"
  if (!("engineVersion" in gap) || gap.engineVersion === undefined) return "unclassified"
  return gap.engineVersion ? "measured" : "indicative"
}
