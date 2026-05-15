import { BlueprintRadarChart } from '@/components/job-blueprint/shared/RadarChart'
import type { DimensionBenchmark, DimensionScore } from '@/types/job-blueprint'
import { CATEGORY_COLORS } from '@/constants/job-blueprint/dimensions'

type BenchmarkRadarChartProps = {
  behaviors: DimensionBenchmark[]
  aptitudes: DimensionBenchmark[]
  coreTraits: DimensionBenchmark[]
  candidateScores?: DimensionScore[]
  height?: number
}

export function BenchmarkRadarChart({
  behaviors,
  aptitudes,
  coreTraits,
  candidateScores,
  height = 400,
}: BenchmarkRadarChartProps) {
  const allBenchmarks = [...behaviors, ...aptitudes, ...coreTraits]

  const data = allBenchmarks.map(b => {
    const base: { dimension: string; [key: string]: string | number } = {
      dimension: b.dimensionName,
      benchmark: b.finalBenchmarkPercent,
    }

    if (candidateScores) {
      const cs = candidateScores.find(
        c => c.dimensionId === b.dimensionId && c.category === b.category
      )
      base.candidate = cs?.score ?? 0
    }

    return base
  })

  const datasets: { key: string; name: string; color: string; fillOpacity: number }[] = [
    {
      key: 'benchmark',
      name: 'Benchmark',
      color: CATEGORY_COLORS.behavior.fill,
      fillOpacity: 0.15,
    },
  ]

  if (candidateScores) {
    datasets.push({
      key: 'candidate',
      name: 'Candidate',
      color: '#805AD5',
      fillOpacity: 0.1,
    })
  }

  return <BlueprintRadarChart data={data} datasets={datasets} height={height} />
}
