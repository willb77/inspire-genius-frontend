import { render, screen } from '@testing-library/react'
import { ScorecardForm } from '../scorecard/ScorecardForm'

const makeSection = (title: string, names: string[], isCounterProductive = false) => ({
  title,
  isCounterProductive,
  entries: names.map((name, i) => ({
    dimensionId: i + 1,
    dimensionName: name,
    score: 0 as const,
    evidence: '',
  })),
})

describe('ScorecardForm', () => {
  const sections = [
    makeSection('Top 3 Behaviors', ['Innovating', 'Initiating', 'Focusing']),
    makeSection('Counter-Productive', ['Supporting', 'Finishing'], true),
    makeSection('Top 3 Aptitudes', ['Competitive', 'Investigative', 'Outgoing']),
    makeSection('Top 3 Core Traits', ['Self-Motivation', 'Decisiveness', 'Relationship']),
  ]

  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders all section titles', () => {
    render(<ScorecardForm sections={sections} onSubmit={mockOnSubmit} />)
    expect(screen.getByText('Top 3 Behaviors')).toBeInTheDocument()
    expect(screen.getByText('Counter-Productive')).toBeInTheDocument()
    expect(screen.getByText('Top 3 Aptitudes')).toBeInTheDocument()
    expect(screen.getByText('Top 3 Core Traits')).toBeInTheDocument()
  })

  it('renders all dimension names', () => {
    render(<ScorecardForm sections={sections} onSubmit={mockOnSubmit} />)
    expect(screen.getByText('Innovating')).toBeInTheDocument()
    expect(screen.getByText('Supporting')).toBeInTheDocument()
    expect(screen.getByText('Self-Motivation')).toBeInTheDocument()
  })

  it('renders 0/3/5 score buttons for each dimension', () => {
    render(<ScorecardForm sections={sections} onSubmit={mockOnSubmit} />)
    // Each dimension has 3 score buttons (0, 3, 5)
    // 11 dimensions total = 33 radio buttons
    const radioButtons = screen.getAllByRole('radio')
    expect(radioButtons.length).toBe(33)
  })

  it('shows submit button', () => {
    render(<ScorecardForm sections={sections} onSubmit={mockOnSubmit} />)
    expect(screen.getByText('Submit Scorecard')).toBeInTheDocument()
  })

  it('shows grand total starting at 0', () => {
    render(<ScorecardForm sections={sections} onSubmit={mockOnSubmit} />)
    // The grand total section shows "X / 55"
    expect(screen.getByText('/ 55')).toBeInTheDocument()
    // The recommendation section should show "Do Not Hire" for 0 total
    expect(screen.getByText('Do Not Hire')).toBeInTheDocument()
  })
})
