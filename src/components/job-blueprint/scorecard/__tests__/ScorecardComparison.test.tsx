import { render, screen } from '@testing-library/react'
import { ScorecardComparison } from '../ScorecardComparison'
import type { InterviewScorecard } from '@/types/job-blueprint'

jest.mock('@/components/job-blueprint/shared/ScoreBar', () => ({
  ScoreBar: () => <div data-testid="score-bar" />,
}))

const mockScorecards: InterviewScorecard[] = [
  {
    id: 'sc-1',
    candidateId: 'cand-aaaa1111-test',
    jobId: 'job-1',
    interviewerId: 'int-1',
    interviewDate: '2026-01-15',
    behaviorScores: [],
    counterProductiveScores: [],
    aptitudeScores: [],
    coreTraitScores: [],
    grandTotal: 48,
    recommendation: 'strong-hire',
    notes: '',
    completedAt: '2026-01-15T12:00:00Z',
  },
  {
    id: 'sc-2',
    candidateId: 'cand-bbbb2222-test',
    jobId: 'job-1',
    interviewerId: 'int-1',
    interviewDate: '2026-01-16',
    behaviorScores: [],
    counterProductiveScores: [],
    aptitudeScores: [],
    coreTraitScores: [],
    grandTotal: 30,
    recommendation: 'conditional',
    notes: '',
    completedAt: '2026-01-16T12:00:00Z',
  },
]

describe('ScorecardComparison', () => {
  it('renders heading', () => {
    render(<ScorecardComparison scorecards={mockScorecards} />)
    expect(screen.getByText('Scorecard Comparison')).toBeInTheDocument()
  })

  it('displays candidate IDs (truncated)', () => {
    render(<ScorecardComparison scorecards={mockScorecards} />)
    expect(screen.getByText('Candidate cand-aaa')).toBeInTheDocument()
    expect(screen.getByText('Candidate cand-bbb')).toBeInTheDocument()
  })

  it('displays grand totals', () => {
    render(<ScorecardComparison scorecards={mockScorecards} />)
    expect(screen.getByText('48/55')).toBeInTheDocument()
    expect(screen.getByText('30/55')).toBeInTheDocument()
  })

  it('displays recommendation labels', () => {
    render(<ScorecardComparison scorecards={mockScorecards} />)
    expect(screen.getByText('Strong Hire')).toBeInTheDocument()
    expect(screen.getByText('Conditional')).toBeInTheDocument()
  })

  it('sorts by grand total descending', () => {
    render(<ScorecardComparison scorecards={mockScorecards} />)
    const labels = screen.getAllByText(/Candidate cand-/)
    // First should be the higher-scoring candidate
    expect(labels[0]).toHaveTextContent('cand-aaa')
  })
})
