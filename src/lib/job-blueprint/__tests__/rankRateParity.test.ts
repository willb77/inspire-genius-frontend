import { calculateBenchmark } from "@/lib/job-blueprint/scoring"
import { MAX_RATE, getRankTable } from "@/constants/job-blueprint/scoring-tables"
import type { DimensionCategory } from "@/types/job-blueprint"

/**
 * TS ↔ Python parity for Rank-then-Rate over its WHOLE domain.
 *
 * calculateBenchmark(rankIndex, rate, category) for every rank index (row) and
 * every rate 1..maxRate (column), generated from the Python engine
 * (packages/ig-blueprint-scoring, `calculate_benchmark`) on 2026-10-20. The same
 * grid is checked in verbatim in the monorepo at
 * services/agent-engine/tests/test_blueprint_rank_rate_guard.py, which asserts
 * the Python side reproduces it; this file asserts the TS side does. A change
 * to either formula (or table) breaks one of the two.
 */
const GOLDEN_GRID: Record<DimensionCategory, number[][]> = {
  "behavior": [
    [54, 61, 67, 73, 79, 86, 92, 98],
    [48, 55, 61, 67, 73, 80, 86, 92],
    [42, 49, 55, 61, 67, 74, 80, 86],
    [36, 43, 49, 55, 61, 68, 74, 80],
    [30, 37, 43, 49, 55, 62, 68, 74],
    [24, 31, 37, 43, 49, 56, 62, 68],
    [18, 25, 31, 37, 43, 50, 56, 62],
    [12, 19, 25, 31, 37, 44, 50, 56],
  ],
  "aptitude": [
    [56, 63, 69, 75, 81, 88, 94, 100],
    [50, 57, 63, 69, 75, 82, 88, 94],
    [44, 50, 56, 63, 69, 75, 81, 88],
    [37, 44, 50, 56, 62, 69, 75, 81],
    [31, 38, 44, 50, 56, 63, 69, 75],
    [25, 31, 37, 44, 50, 56, 62, 69],
    [19, 25, 31, 38, 44, 50, 56, 63],
    [13, 19, 25, 32, 38, 44, 50, 57],
  ],
  "core-trait": [
    [58, 67, 75, 83, 92, 100],
    [50, 58, 67, 75, 83, 92],
    [42, 50, 59, 67, 75, 84],
    [33, 42, 50, 58, 67, 75],
    [25, 33, 42, 50, 58, 67],
    [17, 25, 34, 42, 50, 59],
  ],
}

describe("Rank-then-Rate parity grid (shared with the Python engine)", () => {
  it.each(Object.keys(GOLDEN_GRID) as DimensionCategory[])("%s: every (rank, rate) matches", (category) => {
    const grid = GOLDEN_GRID[category]
    expect(grid).toHaveLength(getRankTable(category).length)
    grid.forEach((row, rankIndex) => {
      expect(row).toHaveLength(MAX_RATE[category])
      row.forEach((expected, i) => {
        expect([rankIndex, i + 1, calculateBenchmark(rankIndex, i + 1, category)]).toEqual([rankIndex, i + 1, expected])
      })
    })
  })
})
