// Rank-then-Rate scoring tables for PRISM benchmark calculation

/** Behavior rank percentages (8 items, position 1-8) */
export const BEHAVIOR_RANK_TABLE = [96, 84, 72, 60, 48, 36, 24, 12] as const

/** Aptitude rank percentages (8 items, position 1-8) */
export const APTITUDE_RANK_TABLE = [100, 88, 75, 62, 50, 37, 25, 13] as const

/** Core Trait rank percentages (6 items, position 1-6) */
export const CORE_TRAIT_RANK_TABLE = [100, 83, 67, 50, 33, 17] as const

/** Maximum rate values per category */
export const MAX_RATE = {
  behavior: 8,
  aptitude: 8,
  'core-trait': 6,
} as const

/** Get the rank table for a given category */
export function getRankTable(category: 'behavior' | 'aptitude' | 'core-trait'): readonly number[] {
  switch (category) {
    case 'behavior': return BEHAVIOR_RANK_TABLE
    case 'aptitude': return APTITUDE_RANK_TABLE
    case 'core-trait': return CORE_TRAIT_RANK_TABLE
  }
}

/** Get the max rate value for a given category */
export function getMaxRate(category: 'behavior' | 'aptitude' | 'core-trait'): number {
  return MAX_RATE[category]
}
