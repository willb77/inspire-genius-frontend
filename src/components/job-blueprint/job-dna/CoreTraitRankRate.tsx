import { RankRateInput } from './RankRateInput'
import { CORE_TRAITS } from '@/constants/job-blueprint/dimensions'
import type { DimensionBenchmark } from '@/types/job-blueprint'
import { useTranslation } from 'react-i18next'

type CoreTraitRankRateProps = {
  value: DimensionBenchmark[]
  onChange: (benchmarks: DimensionBenchmark[]) => void
}

export function CoreTraitRankRate({ value, onChange }: CoreTraitRankRateProps) {
  const { t } = useTranslation("jobBlueprintPages")
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">{t("coreTraits.title", { defaultValue: "Core Traits" })}</h3>
        <p className="text-sm text-slate-500">
          {t("coreTraits.description", { defaultValue: "Rank the 6 core traits in order of importance for this role, then rate each on its significance." })}
        </p>
      </div>
      <RankRateInput
        dimensions={CORE_TRAITS}
        category="core-trait"
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
