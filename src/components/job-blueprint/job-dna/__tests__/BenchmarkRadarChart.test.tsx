import { render, screen } from '@testing-library/react'
import { BenchmarkRadarChart } from '../BenchmarkRadarChart'
import type { DimensionBenchmark, DimensionScore } from '@/types/job-blueprint'

jest.mock('@/components/job-blueprint/shared/RadarChart', () => ({
  BlueprintRadarChart: ({ data, datasets }: { data: unknown[]; datasets: unknown[] }) => (
    <div data-testid="radar-chart" data-points={data.length} data-datasets={datasets.length} />
  ),
}))

const makeBenchmark = (id: number, name: string, cat: 'behavior' | 'aptitude' | 'core-trait'): DimensionBenchmark => ({
  dimensionId: id,
  dimensionName: name,
  category: cat,
  rankPosition: 1,
  rankPercent: 96,
  rateValue: 8,
  finalBenchmarkPercent: 85,
  interpretation: 'very-high',
})

describe('BenchmarkRadarChart', () => {
  const behaviors = [makeBenchmark(1, 'Innovating', 'behavior')]
  const aptitudes = [makeBenchmark(1, 'Practical', 'aptitude')]
  const coreTraits = [makeBenchmark(1, 'Decisiveness', 'core-trait')]

  it('renders the radar chart', () => {
    render(<BenchmarkRadarChart behaviors={behaviors} aptitudes={aptitudes} coreTraits={coreTraits} />)
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
  })

  it('combines all benchmarks into data points', () => {
    render(<BenchmarkRadarChart behaviors={behaviors} aptitudes={aptitudes} coreTraits={coreTraits} />)
    const chart = screen.getByTestId('radar-chart')
    expect(chart).toHaveAttribute('data-points', '3')
  })

  it('renders one dataset without candidateScores', () => {
    render(<BenchmarkRadarChart behaviors={behaviors} aptitudes={aptitudes} coreTraits={coreTraits} />)
    const chart = screen.getByTestId('radar-chart')
    expect(chart).toHaveAttribute('data-datasets', '1')
  })

  it('renders two datasets with candidateScores', () => {
    const scores: DimensionScore[] = [
      { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', score: 70 },
    ]
    render(
      <BenchmarkRadarChart behaviors={behaviors} aptitudes={aptitudes} coreTraits={coreTraits} candidateScores={scores} />
    )
    const chart = screen.getByTestId('radar-chart')
    expect(chart).toHaveAttribute('data-datasets', '2')
  })
})
