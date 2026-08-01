// Shared target service (Decision D7) — neutral, ungated, vector-only types.
//
// These mirror the blueprint-service `/v1/targets/*` contract exactly (CamelModel
// on the wire → camelCase here). The target service is the reusable surface any
// vertical can call: extract a DRAFT target from a job description (D3), score a
// vector against a target (D4/D5/D6), or run an adverse-impact check (D5). It is
// distinct from `/v1/blueprint/fit/*` (self-scoped) and `/v1/blueprint/job-dna`
// (recruiter authoring): it takes vectors/targets only and its outputs are
// governed (advisory-only, provenance + confidence always present).
//
// Job-Fit's first consumer uses only the extract surface, so only that half is
// typed here; the score/adverse-impact contracts are added when a consumer
// needs them (no abstraction ahead of a caller).

import type { DimensionCategory } from '@/types/job-blueprint'

/**
 * One dimension of a drafted target, over the 22-dimension model. `target` is
 * the drafted benchmark percentile (0–100); `provenance` says whether the JD
 * gave direct evidence ("measured") or the value was imputed from the role
 * shape ("imputed"). A draft never decides — it informs.
 */
export type ExtractedDimension = {
  dimensionId: number
  dimensionName: string
  category: DimensionCategory
  /** Drafted benchmark for this dimension (0–100). */
  target: number
  /** Extractor confidence in this dimension's value (0–1). */
  confidence: number
  /** Short justification the extractor attached (a JD phrase, or an imputation note). */
  evidence: string
  /** "measured" (JD evidence) | "imputed" (derived from the role shape). */
  provenance: 'measured' | 'imputed'
  /** Coarse interpretation band (e.g. "very-high" | "natural" | "moderate" | "low"). */
  interpretation: string
}

/**
 * A DRAFT target extracted from a job description, grouped like a Job DNA so the
 * benchmark surfaces can render it. `draft` is always true — this is a proposal,
 * never an authoritative target.
 */
export type TargetDraft = {
  behaviors: ExtractedDimension[]
  aptitudes: ExtractedDimension[]
  coreTraits: ExtractedDimension[]
  /** How many of the 22 dimensions had direct JD evidence. */
  measuredCount: number
  /** How many were imputed from the role shape. */
  imputedCount: number
  /** Mean extractor confidence across all dimensions (0–1). */
  meanConfidence: number
  /** "stub" (deterministic keyword extractor) | "anthropic" (live model). */
  provider: 'stub' | 'anthropic'
  /** Always true — informs, never decides. */
  draft: boolean
  warnings: string[]
  /** Not-a-hiring-decision methodology note carried from the service. */
  methodologyNote: string
}

/** All dimensions of a draft, flattened best-evidence-first — a render convenience. */
export function flattenTargetDraft(draft: TargetDraft): ExtractedDimension[] {
  return [...draft.behaviors, ...draft.aptitudes, ...draft.coreTraits]
}
