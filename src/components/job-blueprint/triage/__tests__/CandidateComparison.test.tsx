import { render, screen } from '@testing-library/react'
import { CandidateComparison } from '../CandidateComparison'
import type { Candidate, DimensionBenchmark } from '@/types/job-blueprint'

jest.mock('@/components/job-blueprint/shared/ClassificationBadge', () => ({
  ClassificationBadge: ({ tier }: { tier: string }) => <span data-testid="classification-badge">{tier}</span>,
}))

const makeCandidateWithScores = (id: string, name: string, totalVar: number): Candidate => ({
  id,
  jobId: 'job-1',
  name,
  email: `${name.toLowerCase()}@test.com`,
  status: 'classified',
  assessmentId: 'a-1',
  prismScores: [
    { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', score: 80 },
  ],
  variationScores: {
    behaviorVariation: totalVar,
    aptitudeVariation: 0,
    coreTraitVariation: 0,
    totalVariation: totalVar,
    standardDeviation: 10,
    skew: 0,
    perDimension: [],
  },
  classificationTier: 'strong-fit',
  scorecardId: null,
  insightPackage: null,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
})

const mockBenchmark: DimensionBenchmark[] = [
  { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', rankPosition: 1, rankPercent: 96, rateValue: 8, finalBenchmarkPercent: 85, interpretation: 'very-high' },
]

describe('CandidateComparison', () => {
  const candidates = [
    makeCandidateWithScores('c1', 'Alice', 80),
    makeCandidateWithScores('c2', 'Bob', 120),
  ]

  it('renders heading', () => {
    render(<CandidateComparison candidates={candidates} benchmark={mockBenchmark} />)
    expect(screen.getByText('Candidate Comparison')).toBeInTheDocument()
  })

  it('renders candidate names in table header', () => {
    render(<CandidateComparison candidates={candidates} benchmark={mockBenchmark} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders dimension names in rows', () => {
    render(<CandidateComparison candidates={candidates} benchmark={mockBenchmark} />)
    expect(screen.getByText('Innovating')).toBeInTheDocument()
  })

  it('renders benchmark percentage', () => {
    render(<CandidateComparison candidates={candidates} benchmark={mockBenchmark} />)
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('renders total variation row', () => {
    render(<CandidateComparison candidates={candidates} benchmark={mockBenchmark} />)
    expect(screen.getByText('Total Variation')).toBeInTheDocument()
  })

  it('sorts candidates by total variation ascending', () => {
    render(<CandidateComparison candidates={candidates} benchmark={mockBenchmark} />)
    // Alice (80) should appear before Bob (120)
    const names = screen.getAllByText(/Alice|Bob/)
    expect(names[0]).toHaveTextContent('Alice')
  })
})
