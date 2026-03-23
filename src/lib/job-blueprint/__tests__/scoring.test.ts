import {
  calculateBenchmark,
  getInterpretation,
  calculateBestFit,
  classifyCandidate,
  calculateScorecardTotal,
  normalizeBMLResponses,
} from '../scoring'
import type {
  DimensionBenchmark,
  DimensionScore,
  ScorecardEntry,
  BMLQuestion,
  BMLResponse,
} from '@/types/job-blueprint'

// ── calculateBenchmark ───────────────────────────────────────────────

describe('calculateBenchmark', () => {
  it('calculates behavior benchmark for rank 1 (0-indexed), rate 8', () => {
    // rankPercent=96, ratePercent=8/8*100=100, avg=(96+100)/2=98
    expect(calculateBenchmark(0, 8, 'behavior')).toBe(98)
  })

  it('calculates behavior benchmark for rank 4 (0-indexed), rate 5', () => {
    // rankPercent=48, ratePercent=5/8*100=62.5, avg=(48+62.5)/2=55.25 -> 55
    expect(calculateBenchmark(4, 5, 'behavior')).toBe(55)
  })

  it('calculates behavior benchmark for rank 8 (0-indexed 7), rate 1', () => {
    // rankPercent=12, ratePercent=1/8*100=12.5, avg=(12+12.5)/2=12.25 -> 12
    expect(calculateBenchmark(7, 1, 'behavior')).toBe(12)
  })

  it('calculates aptitude benchmark for rank 1, rate 8', () => {
    // rankPercent=100, ratePercent=100, avg=100
    expect(calculateBenchmark(0, 8, 'aptitude')).toBe(100)
  })

  it('calculates aptitude benchmark for rank 3 (0-indexed 2), rate 6', () => {
    // rankPercent=75, ratePercent=6/8*100=75, avg=(75+75)/2=75
    expect(calculateBenchmark(2, 6, 'aptitude')).toBe(75)
  })

  it('calculates core-trait benchmark for rank 1, rate 6', () => {
    // rankPercent=100, ratePercent=6/6*100=100, avg=100
    expect(calculateBenchmark(0, 6, 'core-trait')).toBe(100)
  })

  it('calculates core-trait benchmark for rank 3 (0-indexed 2), rate 4', () => {
    // rankPercent=67, ratePercent=4/6*100=66.67, avg=(67+66.67)/2=66.83 -> 67
    expect(calculateBenchmark(2, 4, 'core-trait')).toBe(67)
  })

  it('calculates core-trait benchmark for rank 6 (0-indexed 5), rate 1', () => {
    // rankPercent=17, ratePercent=1/6*100=16.67, avg=(17+16.67)/2=16.83 -> 17
    expect(calculateBenchmark(5, 1, 'core-trait')).toBe(17)
  })

  it('throws for invalid rank position', () => {
    expect(() => calculateBenchmark(-1, 5, 'behavior')).toThrow()
    expect(() => calculateBenchmark(8, 5, 'behavior')).toThrow()
    expect(() => calculateBenchmark(6, 5, 'core-trait')).toThrow()
  })

  it('throws for invalid rate value', () => {
    expect(() => calculateBenchmark(0, 0, 'behavior')).toThrow()
    expect(() => calculateBenchmark(0, 9, 'behavior')).toThrow()
    expect(() => calculateBenchmark(0, 7, 'core-trait')).toThrow()
  })
})

// ── getInterpretation ────────────────────────────────────────────────

describe('getInterpretation', () => {
  it('returns very-high for 85-100', () => {
    expect(getInterpretation(85)).toBe('very-high')
    expect(getInterpretation(100)).toBe('very-high')
    expect(getInterpretation(92)).toBe('very-high')
  })

  it('returns natural for 65-84', () => {
    expect(getInterpretation(65)).toBe('natural')
    expect(getInterpretation(84)).toBe('natural')
  })

  it('returns moderate for 45-64', () => {
    expect(getInterpretation(45)).toBe('moderate')
    expect(getInterpretation(64)).toBe('moderate')
  })

  it('returns low for 25-44', () => {
    expect(getInterpretation(25)).toBe('low')
    expect(getInterpretation(44)).toBe('low')
  })

  it('returns avoidance for 0-24', () => {
    expect(getInterpretation(0)).toBe('avoidance')
    expect(getInterpretation(24)).toBe('avoidance')
  })
})

// ── calculateBestFit ─────────────────────────────────────────────────

describe('calculateBestFit', () => {
  const benchmark: DimensionBenchmark[] = [
    { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', rankPosition: 1, rankPercent: 96, rateValue: 8, finalBenchmarkPercent: 90, interpretation: 'very-high' },
    { dimensionId: 2, dimensionName: 'Initiating', category: 'behavior', rankPosition: 2, rankPercent: 84, rateValue: 7, finalBenchmarkPercent: 70, interpretation: 'natural' },
    { dimensionId: 1, dimensionName: 'Practical', category: 'aptitude', rankPosition: 1, rankPercent: 100, rateValue: 8, finalBenchmarkPercent: 80, interpretation: 'natural' },
    { dimensionId: 1, dimensionName: 'Relationship', category: 'core-trait', rankPosition: 1, rankPercent: 100, rateValue: 6, finalBenchmarkPercent: 60, interpretation: 'moderate' },
  ]

  const candidateScores: DimensionScore[] = [
    { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', score: 85 },
    { dimensionId: 2, dimensionName: 'Initiating', category: 'behavior', score: 75 },
    { dimensionId: 1, dimensionName: 'Practical', category: 'aptitude', score: 70 },
    { dimensionId: 1, dimensionName: 'Relationship', category: 'core-trait', score: 65 },
  ]

  it('calculates total variation correctly', () => {
    const result = calculateBestFit(candidateScores, benchmark)
    // behavior: |85-90| + |75-70| = 5 + 5 = 10
    // aptitude: |70-80| = 10
    // core-trait: |65-60| = 5
    // total: 25
    expect(result.behaviorVariation).toBe(10)
    expect(result.aptitudeVariation).toBe(10)
    expect(result.coreTraitVariation).toBe(5)
    expect(result.totalVariation).toBe(25)
  })

  it('populates perDimension variations', () => {
    const result = calculateBestFit(candidateScores, benchmark)
    expect(result.perDimension).toHaveLength(4)
  })

  it('calculates skew (positive when exceeding)', () => {
    // Signed differences: -5, +5, -10, +5 -> avg = -1.25
    const result = calculateBestFit(candidateScores, benchmark)
    expect(result.skew).toBe(-1.25)
  })

  it('handles missing candidate scores (defaults to 0)', () => {
    const result = calculateBestFit([], benchmark)
    expect(result.totalVariation).toBe(90 + 70 + 80 + 60)
  })
})

// ── classifyCandidate ────────────────────────────────────────────────

describe('classifyCandidate', () => {
  it('returns strong-fit for 0-100', () => {
    expect(classifyCandidate(0)).toBe('strong-fit')
    expect(classifyCandidate(50)).toBe('strong-fit')
    expect(classifyCandidate(100)).toBe('strong-fit')
  })

  it('returns potential-fit for 101-200', () => {
    expect(classifyCandidate(101)).toBe('potential-fit')
    expect(classifyCandidate(200)).toBe('potential-fit')
  })

  it('returns moderate-fit for 201-300', () => {
    expect(classifyCandidate(201)).toBe('moderate-fit')
    expect(classifyCandidate(300)).toBe('moderate-fit')
  })

  it('returns misalignment for 300+', () => {
    expect(classifyCandidate(301)).toBe('misalignment')
    expect(classifyCandidate(500)).toBe('misalignment')
  })
})

// ── calculateScorecardTotal ──────────────────────────────────────────

describe('calculateScorecardTotal', () => {
  const makeEntries = (scores: (0 | 3 | 5)[]): ScorecardEntry[] =>
    scores.map((s, i) => ({
      dimensionId: i + 1,
      dimensionName: `Dim ${i + 1}`,
      score: s,
      evidence: 'test',
    }))

  it('calculates grand total correctly', () => {
    // 11 entries, all 5 = 55
    const result = calculateScorecardTotal(makeEntries([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]))
    expect(result.grandTotal).toBe(55)
    expect(result.recommendation).toBe('strong-hire')
  })

  it('returns strong-hire for 45-55', () => {
    const result = calculateScorecardTotal(makeEntries([5, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0]))
    expect(result.grandTotal).toBe(45)
    expect(result.recommendation).toBe('strong-hire')
  })

  it('returns hire-with-plan for 35-44', () => {
    const result = calculateScorecardTotal(makeEntries([5, 5, 5, 5, 5, 5, 3, 3, 0, 0, 0]))
    expect(result.grandTotal).toBe(36)
    expect(result.recommendation).toBe('hire-with-plan')
  })

  it('returns conditional for 25-34', () => {
    const result = calculateScorecardTotal(makeEntries([5, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0]))
    expect(result.grandTotal).toBe(25)
    expect(result.recommendation).toBe('conditional')
  })

  it('returns do-not-hire for 0-24', () => {
    const result = calculateScorecardTotal(makeEntries([5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0]))
    expect(result.grandTotal).toBe(20)
    expect(result.recommendation).toBe('do-not-hire')
  })

  it('handles all zeros', () => {
    const result = calculateScorecardTotal(makeEntries([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    expect(result.grandTotal).toBe(0)
    expect(result.recommendation).toBe('do-not-hire')
  })
})

// ── normalizeBMLResponses ────────────────────────────────────────────

describe('normalizeBMLResponses', () => {
  const questions: BMLQuestion[] = [
    { id: 'q1', dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', text: 'Q1', order: 1 },
    { id: 'q2', dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', text: 'Q2', order: 2 },
    { id: 'q3', dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', text: 'Q3', order: 3 },
    { id: 'q4', dimensionId: 2, dimensionName: 'Initiating', category: 'behavior', text: 'Q4', order: 4 },
  ]

  it('normalizes Likert 1-7 to 0-100%', () => {
    const responses: BMLResponse[] = [
      { questionId: 'q1', value: 7 },
      { questionId: 'q2', value: 7 },
      { questionId: 'q3', value: 7 },
    ]
    const result = normalizeBMLResponses(responses, questions)
    const innovating = result.scores.find(s => s.dimensionName === 'Innovating')
    expect(innovating?.score).toBe(100) // (7-1)/6 * 100 = 100
  })

  it('normalizes minimum values to 0', () => {
    const responses: BMLResponse[] = [
      { questionId: 'q1', value: 1 },
      { questionId: 'q2', value: 1 },
      { questionId: 'q3', value: 1 },
    ]
    const result = normalizeBMLResponses(responses, questions)
    const innovating = result.scores.find(s => s.dimensionName === 'Innovating')
    expect(innovating?.score).toBe(0)
  })

  it('averages multiple questions per dimension', () => {
    const responses: BMLResponse[] = [
      { questionId: 'q1', value: 4 },
      { questionId: 'q2', value: 4 },
      { questionId: 'q3', value: 4 },
    ]
    const result = normalizeBMLResponses(responses, questions)
    const innovating = result.scores.find(s => s.dimensionName === 'Innovating')
    // avg=4, normalized=(4-1)/6*100=50
    expect(innovating?.score).toBe(50)
  })

  it('produces separate scores per dimension', () => {
    const responses: BMLResponse[] = [
      { questionId: 'q1', value: 7 },
      { questionId: 'q2', value: 7 },
      { questionId: 'q3', value: 7 },
      { questionId: 'q4', value: 1 },
    ]
    const result = normalizeBMLResponses(responses, questions)
    expect(result.scores).toHaveLength(2)
  })

  it('calculates confidence (high when consistent)', () => {
    const responses: BMLResponse[] = [
      { questionId: 'q1', value: 5 },
      { questionId: 'q2', value: 5 },
      { questionId: 'q3', value: 5 },
    ]
    const result = normalizeBMLResponses(responses, questions)
    expect(result.confidence).toBe(100) // SD = 0 means 100% confidence
  })

  it('calculates lower confidence when inconsistent', () => {
    const responses: BMLResponse[] = [
      { questionId: 'q1', value: 1 },
      { questionId: 'q2', value: 7 },
      { questionId: 'q3', value: 4 },
    ]
    const result = normalizeBMLResponses(responses, questions)
    expect(result.confidence).toBeLessThan(100)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
  })
})
