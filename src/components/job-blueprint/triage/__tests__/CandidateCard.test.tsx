import { render, screen, fireEvent } from '@testing-library/react'
import { CandidateCard } from '../CandidateCard'
import type { Candidate } from '@/types/job-blueprint'

jest.mock('@/components/job-blueprint/shared/ClassificationBadge', () => ({
  ClassificationBadge: ({ tier }: { tier: string }) => <span data-testid="classification-badge">{tier}</span>,
}))
jest.mock('@/components/job-blueprint/shared/PipelineStepBadge', () => ({
  PipelineStepBadge: ({ step }: { step: string }) => <span data-testid="pipeline-badge">{step}</span>,
}))

const mockCandidate: Candidate = {
  id: 'cand-1',
  jobId: 'job-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  code: 'JD-001',
  status: 'fit-scored',
  assessmentId: 'assess-1',
  prismScores: null,
  variationScores: {
    behaviorVariation: 50,
    aptitudeVariation: 30,
    coreTraitVariation: 20,
    totalVariation: 100,
    standardDeviation: 12,
    skew: 1.5,
    perDimension: [],
  },
  classificationTier: 'strong-fit',
  scorecardId: null,
  insightPackage: null,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
}

describe('CandidateCard', () => {
  it('renders candidate name', () => {
    render(<CandidateCard candidate={mockCandidate} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders candidate email', () => {
    render(<CandidateCard candidate={mockCandidate} />)
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('renders pipeline step badge', () => {
    render(<CandidateCard candidate={mockCandidate} />)
    expect(screen.getByTestId('pipeline-badge')).toHaveTextContent('fit-scored')
  })

  it('renders classification badge when tier present', () => {
    render(<CandidateCard candidate={mockCandidate} />)
    expect(screen.getByTestId('classification-badge')).toHaveTextContent('strong-fit')
  })

  it('renders variation score', () => {
    render(<CandidateCard candidate={mockCandidate} />)
    expect(screen.getByText(/Variation: 100/)).toBeInTheDocument()
  })

  it('renders candidate code', () => {
    render(<CandidateCard candidate={mockCandidate} />)
    expect(screen.getByText('Code: JD-001')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<CandidateCard candidate={mockCandidate} onClick={handleClick} />)
    fireEvent.click(screen.getByText('Jane Doe'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not render classification badge when tier is null', () => {
    const noTier = { ...mockCandidate, classificationTier: null }
    render(<CandidateCard candidate={noTier} />)
    expect(screen.queryByTestId('classification-badge')).not.toBeInTheDocument()
  })
})
