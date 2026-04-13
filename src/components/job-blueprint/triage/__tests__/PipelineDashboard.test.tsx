import { render, screen, fireEvent } from '@testing-library/react'
import { PipelineDashboard } from '../PipelineDashboard'
import type { Candidate } from '@/types/job-blueprint'

jest.mock('../CandidateCard', () => ({
  CandidateCard: ({ candidate, onClick }: { candidate: { name: string }; onClick?: () => void }) => (
    <div data-testid="candidate-card" onClick={onClick}>{candidate.name}</div>
  ),
}))

const makeCandidate = (id: string, name: string, status: string): Candidate => ({
  id,
  jobId: 'job-1',
  name,
  email: `${name.toLowerCase()}@test.com`,
  status: status as Candidate['status'],
  assessmentId: null,
  prismScores: null,
  variationScores: null,
  classificationTier: null,
  scorecardId: null,
  insightPackage: null,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
})

const mockCandidates = [
  makeCandidate('c1', 'Alice', 'intake'),
  makeCandidate('c2', 'Bob', 'fit-scored'),
  makeCandidate('c3', 'Carol', 'hired'),
]

describe('PipelineDashboard', () => {
  it('renders pipeline heading with count', () => {
    render(<PipelineDashboard candidates={mockCandidates} />)
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
    expect(screen.getByText('(3 candidates)')).toBeInTheDocument()
  })

  it('renders Board and Table view toggle buttons', () => {
    render(<PipelineDashboard candidates={mockCandidates} />)
    expect(screen.getByText('Board')).toBeInTheDocument()
    expect(screen.getByText('Table')).toBeInTheDocument()
  })

  it('renders kanban view by default with candidate cards', () => {
    render(<PipelineDashboard candidates={mockCandidates} />)
    const cards = screen.getAllByTestId('candidate-card')
    expect(cards.length).toBeGreaterThanOrEqual(3)
  })

  it('switches to table view when Table button clicked', () => {
    render(<PipelineDashboard candidates={mockCandidates} />)
    fireEvent.click(screen.getByText('Table'))
    // Table view should show Name, Email, Status columns
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('shows candidate names in table view', () => {
    render(<PipelineDashboard candidates={mockCandidates} />)
    fireEvent.click(screen.getByText('Table'))
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })

  it('calls onCandidateClick when a candidate is clicked in table', () => {
    const handleClick = jest.fn()
    render(<PipelineDashboard candidates={mockCandidates} onCandidateClick={handleClick} />)
    fireEvent.click(screen.getByText('Table'))
    fireEvent.click(screen.getByText('Alice'))
    expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alice' }))
  })

  it('shows Advance button in table view when onAdvance provided', () => {
    const handleAdvance = jest.fn()
    render(<PipelineDashboard candidates={mockCandidates} onAdvance={handleAdvance} />)
    fireEvent.click(screen.getByText('Table'))
    // Alice (intake) and Bob (fit-scored) should have Advance, Carol (hired) should not
    const advanceButtons = screen.getAllByText('Advance')
    expect(advanceButtons).toHaveLength(2)
  })
})
