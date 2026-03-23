// Pure scoring functions for Job Blueprint
// No side effects — fully testable

import type {
  DimensionCategory,
  InterpretationBand,
  DimensionBenchmark,
  ClassificationTier,
  DimensionScore,
  VariationResult,
  ScorecardRecommendation,
  ScorecardEntry,
  BMLQuestion,
  BMLResponse,
} from '@/types/job-blueprint'

import {
  BEHAVIOR_RANK_TABLE,
  APTITUDE_RANK_TABLE,
  CORE_TRAIT_RANK_TABLE,
  MAX_RATE,
} from '@/constants/job-blueprint/scoring-tables'

// ── Rank-then-Rate Benchmark Calculation ─────────────────────────────

/** Get the rank table for a given category */
function getRankTable(category: DimensionCategory): readonly number[] {
  switch (category) {
    case 'behavior': return BEHAVIOR_RANK_TABLE
    case 'aptitude': return APTITUDE_RANK_TABLE
    case 'core-trait': return CORE_TRAIT_RANK_TABLE
  }
}

/**
 * Calculate final benchmark % from rank position and rate value.
 * @param rankPosition 0-indexed rank position
 * @param rateValue 1-based rate value
 * @param category dimension category
 * @returns final benchmark percentage (0-100)
 */
export function calculateBenchmark(
  rankPosition: number,
  rateValue: number,
  category: DimensionCategory
): number {
  const rankTable = getRankTable(category)
  const maxRate = MAX_RATE[category]

  if (rankPosition < 0 || rankPosition >= rankTable.length) {
    throw new Error(`Invalid rank position ${rankPosition} for category ${category}`)
  }
  if (rateValue < 1 || rateValue > maxRate) {
    throw new Error(`Invalid rate value ${rateValue} for category ${category} (max: ${maxRate})`)
  }

  const rankPercent = rankTable[rankPosition]
  const ratePercent = (rateValue / maxRate) * 100

  return Math.round((rankPercent + ratePercent) / 2)
}

// ── Interpretation Bands ─────────────────────────────────────────────

/** Get interpretation band for a benchmark score */
export function getInterpretation(score: number): InterpretationBand {
  if (score >= 85) return 'very-high'
  if (score >= 65) return 'natural'
  if (score >= 45) return 'moderate'
  if (score >= 25) return 'low'
  return 'avoidance'
}

// ── Best-Fit Variation Scoring ───────────────────────────────────────

/**
 * Calculate best-fit variation for a candidate against a benchmark.
 * Lower total variation = better fit.
 */
export function calculateBestFit(
  candidateScores: DimensionScore[],
  benchmark: DimensionBenchmark[]
): VariationResult {
  const perDimension: { dimensionId: number; variation: number }[] = []
  const variations: number[] = []

  let behaviorVariation = 0
  let aptitudeVariation = 0
  let coreTraitVariation = 0

  for (const bench of benchmark) {
    const candidate = candidateScores.find(
      c => c.dimensionId === bench.dimensionId && c.category === bench.category
    )
    const candidateScore = candidate?.score ?? 0
    const variation = Math.abs(candidateScore - bench.finalBenchmarkPercent)

    perDimension.push({ dimensionId: bench.dimensionId, variation })
    variations.push(candidateScore - bench.finalBenchmarkPercent) // signed for skew

    switch (bench.category) {
      case 'behavior': behaviorVariation += variation; break
      case 'aptitude': aptitudeVariation += variation; break
      case 'core-trait': coreTraitVariation += variation; break
    }
  }

  const totalVariation = behaviorVariation + aptitudeVariation + coreTraitVariation

  // Standard deviation
  const n = variations.length
  const mean = n > 0 ? variations.reduce((a, b) => a + b, 0) / n : 0
  const variance = n > 0
    ? variations.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n
    : 0
  const standardDeviation = Math.round(Math.sqrt(variance) * 100) / 100

  // Skew (positive = exceeds benchmarks on average)
  const skew = n > 0 ? Math.round(mean * 100) / 100 : 0

  return {
    behaviorVariation: Math.round(behaviorVariation),
    aptitudeVariation: Math.round(aptitudeVariation),
    coreTraitVariation: Math.round(coreTraitVariation),
    totalVariation: Math.round(totalVariation),
    standardDeviation,
    skew,
    perDimension,
  }
}

// ── Candidate Classification ─────────────────────────────────────────

/** Classify candidate tier based on total variation */
export function classifyCandidate(totalVariation: number): ClassificationTier {
  if (totalVariation <= 100) return 'strong-fit'
  if (totalVariation <= 200) return 'potential-fit'
  if (totalVariation <= 300) return 'moderate-fit'
  return 'misalignment'
}

// ── Interview Scorecard ──────────────────────────────────────────────

/** Calculate interview scorecard grand total and recommendation */
export function calculateScorecardTotal(
  entries: ScorecardEntry[]
): { grandTotal: number; recommendation: ScorecardRecommendation } {
  const grandTotal = entries.reduce((sum, e) => sum + e.score, 0)

  let recommendation: ScorecardRecommendation
  if (grandTotal >= 45) recommendation = 'strong-hire'
  else if (grandTotal >= 35) recommendation = 'hire-with-plan'
  else if (grandTotal >= 25) recommendation = 'conditional'
  else recommendation = 'do-not-hire'

  return { grandTotal, recommendation }
}

// ── BML Normalization ────────────────────────────────────────────────

/**
 * Normalize BML Likert (1-7) responses to 0-100% dimension scores.
 * Multiple questions per dimension are averaged.
 * Confidence = 100 - avg(SD across dimensions) — low SD = high confidence.
 */
export function normalizeBMLResponses(
  responses: BMLResponse[],
  questions: BMLQuestion[]
): { scores: DimensionScore[]; confidence: number } {
  // Group responses by dimension (category + dimensionId)
  const groups = new Map<string, { values: number[]; question: BMLQuestion }>()

  for (const resp of responses) {
    const question = questions.find(q => q.id === resp.questionId)
    if (!question) continue

    const key = `${question.category}-${question.dimensionId}`
    if (!groups.has(key)) {
      groups.set(key, { values: [], question })
    }
    groups.get(key)!.values.push(resp.value)
  }

  const scores: DimensionScore[] = []
  const sds: number[] = []

  for (const [, group] of groups) {
    const { values, question } = group
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    // Normalize: Likert 1-7 to 0-100%
    const normalized = Math.round(((avg - 1) / 6) * 100)

    scores.push({
      dimensionId: question.dimensionId,
      dimensionName: question.dimensionName,
      category: question.category,
      score: Math.max(0, Math.min(100, normalized)),
    })

    // Calculate SD for this dimension
    if (values.length > 1) {
      const mean = avg
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
      sds.push(Math.sqrt(variance))
    }
  }

  // Confidence: low SD = high confidence
  // Max SD for Likert 1-7 is about 3 (range/2)
  const avgSd = sds.length > 0 ? sds.reduce((a, b) => a + b, 0) / sds.length : 0
  const confidence = Math.round(Math.max(0, Math.min(100, 100 - (avgSd / 3) * 100)))

  return { scores, confidence }
}
