import { RankRateInput } from './RankRateInput'
import { BEHAVIORS } from '@/constants/job-blueprint/dimensions'
import type { DimensionBenchmark } from '@/types/job-blueprint'

type BehaviorRankRateProps = {
  value: DimensionBenchmark[]
  onChange: (benchmarks: DimensionBenchmark[]) => void
}

export function BehaviorRankRate({ value, onChange }: BehaviorRankRateProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Behavior Preferences</h3>
        <p className="text-sm text-slate-500">
          Rank the 8 behavior preferences in order of importance for this role, then rate each on its significance.
          The system will calculate the final benchmark score using the Rank-then-Rate methodology.
        </p>
      </div>
      <RankRateInput
        dimensions={BEHAVIORS}
        category="behavior"
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
