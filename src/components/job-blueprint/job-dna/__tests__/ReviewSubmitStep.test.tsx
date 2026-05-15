import { render, screen } from '@testing-library/react'
import { ReviewSubmitStep } from '../ReviewSubmitStep'
import type { DimensionBenchmark } from '@/types/job-blueprint'

jest.mock('../BenchmarkRadarChart', () => ({
  BenchmarkRadarChart: () => <div data-testid="radar-chart" />,
}))
jest.mock('../BenchmarkBarChart', () => ({
  BenchmarkBarChart: ({ title }: { title?: string }) => <div data-testid="bar-chart">{title}</div>,
}))
jest.mock('@/components/job-blueprint/shared/DimensionBadge', () => ({
  DimensionBadge: ({ name }: { name: string }) => <span data-testid="dimension-badge">{name}</span>,
}))

const makeBenchmark = (id: number, name: string, cat: 'behavior' | 'aptitude' | 'core-trait', rank: number): DimensionBenchmark => ({
  dimensionId: id,
  dimensionName: name,
  category: cat,
  rankPosition: rank,
  rankPercent: 90,
  rateValue: 7,
  finalBenchmarkPercent: 85,
  interpretation: 'very-high',
})

describe('ReviewSubmitStep', () => {
  const behaviors = [
    makeBenchmark(1, 'Innovating', 'behavior', 1),
    makeBenchmark(2, 'Evaluating', 'behavior', 2),
    makeBenchmark(3, 'Finishing', 'behavior', 3),
    makeBenchmark(4, 'Delivering', 'behavior', 4),
  ]
  const aptitudes = [
    makeBenchmark(1, 'Practical', 'aptitude', 1),
    makeBenchmark(2, 'Investigative', 'aptitude', 2),
    makeBenchmark(3, 'Creative', 'aptitude', 3),
  ]
  const coreTraits = [
    makeBenchmark(1, 'Decisiveness', 'core-trait', 1),
    makeBenchmark(2, 'Flexibility', 'core-trait', 2),
    makeBenchmark(3, 'Motivation', 'core-trait', 3),
  ]

  it('renders heading', () => {
    render(
      <ReviewSubmitStep
        roleTitle="Engineer"
        department="Tech"
        tier="professional"
        behaviors={behaviors}
        aptitudes={aptitudes}
        coreTraits={coreTraits}
        roleContext={{ workPressures: [], requiredWorkStyles: [], environmentalFactors: [], culturalFactors: [] }}
      />
    )
    expect(screen.getByText('Review & Submit')).toBeInTheDocument()
  })

  it('displays role details', () => {
    render(
      <ReviewSubmitStep
        roleTitle="Engineer"
        department="Tech"
        tier="professional"
        behaviors={behaviors}
        aptitudes={aptitudes}
        coreTraits={coreTraits}
        roleContext={{ workPressures: [], requiredWorkStyles: [], environmentalFactors: [], culturalFactors: [] }}
      />
    )
    expect(screen.getByText('Engineer')).toBeInTheDocument()
    expect(screen.getByText('Tech')).toBeInTheDocument()
    expect(screen.getByText('Professional')).toBeInTheDocument()
  })

  it('shows top 3 dimension badges for each category', () => {
    render(
      <ReviewSubmitStep
        roleTitle="Engineer"
        department="Tech"
        tier="professional"
        behaviors={behaviors}
        aptitudes={aptitudes}
        coreTraits={coreTraits}
        roleContext={{ workPressures: [], requiredWorkStyles: [], environmentalFactors: [], culturalFactors: [] }}
      />
    )
    const badges = screen.getAllByTestId('dimension-badge')
    // 3 behaviors + 3 aptitudes + 3 core traits = 9
    expect(badges).toHaveLength(9)
  })

  it('renders radar and bar charts', () => {
    render(
      <ReviewSubmitStep
        roleTitle="Engineer"
        department="Tech"
        tier="professional"
        behaviors={behaviors}
        aptitudes={aptitudes}
        coreTraits={coreTraits}
        roleContext={{ workPressures: [], requiredWorkStyles: [], environmentalFactors: [], culturalFactors: [] }}
      />
    )
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
    expect(screen.getAllByTestId('bar-chart')).toHaveLength(3)
  })

  it('renders role context section when pressures present', () => {
    render(
      <ReviewSubmitStep
        roleTitle="Engineer"
        department="Tech"
        tier="professional"
        behaviors={behaviors}
        aptitudes={aptitudes}
        coreTraits={coreTraits}
        roleContext={{ workPressures: ['Tight deadlines'], requiredWorkStyles: ['Agile'], environmentalFactors: [], culturalFactors: [] }}
      />
    )
    expect(screen.getByText('Tight deadlines')).toBeInTheDocument()
    expect(screen.getByText('Agile')).toBeInTheDocument()
  })
})
