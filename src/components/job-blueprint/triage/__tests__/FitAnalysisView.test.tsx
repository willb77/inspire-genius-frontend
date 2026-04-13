import { render, screen } from '@testing-library/react'
import { FitAnalysisView } from '../FitAnalysisView'
import type { DimensionBenchmark, DimensionScore, VariationResult } from '@/types/job-blueprint'

jest.mock('@/components/job-blueprint/shared/ScoreBar', () => ({
  ScoreBar: ({ score }: { score: number }) => <div data-testid="score-bar">{score}%</div>,
}))
jest.mock('@/components/job-blueprint/shared/ClassificationBadge', () => ({
  ClassificationBadge: ({ tier }: { tier: string }) => <span data-testid="classification-badge">{tier}</span>,
}))

const mockBenchmark: DimensionBenchmark[] = [
  { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', rankPosition: 1, rankPercent: 96, rateValue: 8, finalBenchmarkPercent: 85, interpretation: 'very-high' },
]

const mockScores: DimensionScore[] = [
  { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', score: 70 },
]

const mockVariation: VariationResult = {
  behaviorVariation: 50,
  aptitudeVariation: 30,
  coreTraitVariation: 20,
  totalVariation: 100,
  standardDeviation: 12.5,
  skew: -0.5,
  perDimension: [],
}

describe('FitAnalysisView', () => {
  it('renders candidate name in heading', () => {
    render(
      <FitAnalysisView
        candidateName="Jane Doe"
        candidateScores={mockScores}
        benchmark={mockBenchmark}
        variation={mockVariation}
        tier="strong-fit"
      />
    )
    expect(screen.getByText('Fit Analysis: Jane Doe')).toBeInTheDocument()
  })

  it('renders classification badge', () => {
    render(
      <FitAnalysisView
        candidateName="Jane Doe"
        candidateScores={mockScores}
        benchmark={mockBenchmark}
        variation={mockVariation}
        tier="strong-fit"
      />
    )
    expect(screen.getByTestId('classification-badge')).toHaveTextContent('strong-fit')
  })

  it('displays variation summary cards', () => {
    render(
      <FitAnalysisView
        candidateName="Jane Doe"
        candidateScores={mockScores}
        benchmark={mockBenchmark}
        variation={mockVariation}
        tier="strong-fit"
      />
    )
    expect(screen.getByText('Total Variation')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Std Deviation')).toBeInTheDocument()
    expect(screen.getByText('12.5')).toBeInTheDocument()
  })

  it('renders gap analysis table', () => {
    render(
      <FitAnalysisView
        candidateName="Jane Doe"
        candidateScores={mockScores}
        benchmark={mockBenchmark}
        variation={mockVariation}
        tier="strong-fit"
      />
    )
    expect(screen.getByText('Gap Analysis')).toBeInTheDocument()
    expect(screen.getByText('Innovating')).toBeInTheDocument()
  })

  it('shows negative gap for underperforming dimensions', () => {
    render(
      <FitAnalysisView
        candidateName="Jane Doe"
        candidateScores={mockScores}
        benchmark={mockBenchmark}
        variation={mockVariation}
        tier="strong-fit"
      />
    )
    // 70 - 85 = -15
    expect(screen.getByText('-15')).toBeInTheDocument()
  })
})
