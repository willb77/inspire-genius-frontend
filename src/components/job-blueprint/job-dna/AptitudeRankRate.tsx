import { RankRateInput } from './RankRateInput'
import { APTITUDES } from '@/constants/job-blueprint/dimensions'
import type { DimensionBenchmark } from '@/types/job-blueprint'

type AptitudeRankRateProps = {
  value: DimensionBenchmark[]
  onChange: (benchmarks: DimensionBenchmark[]) => void
}

export function AptitudeRankRate({ value, onChange }: AptitudeRankRateProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Work Aptitude Preferences</h3>
        <p className="text-sm text-slate-500">
          Rank the 8 work aptitude preferences in order of importance for this role, then rate each on its significance.
        </p>
      </div>
      <RankRateInput
        dimensions={APTITUDES}
        category="aptitude"
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
