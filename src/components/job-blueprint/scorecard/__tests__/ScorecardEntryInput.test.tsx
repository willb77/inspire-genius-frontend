import { render, screen, fireEvent } from '@testing-library/react'
import { ScorecardEntryInput } from '../ScorecardEntryInput'

describe('ScorecardEntryInput', () => {
  const mockOnScoreChange = jest.fn()
  const mockOnEvidenceChange = jest.fn()

  beforeEach(() => {
    mockOnScoreChange.mockClear()
    mockOnEvidenceChange.mockClear()
  })

  it('renders dimension name', () => {
    render(
      <ScorecardEntryInput
        dimensionName="Innovating"
        score={0}
        evidence=""
        onScoreChange={mockOnScoreChange}
        onEvidenceChange={mockOnEvidenceChange}
      />
    )
    expect(screen.getByText('Innovating')).toBeInTheDocument()
  })

  it('renders 3 score options (0, 3, 5)', () => {
    render(
      <ScorecardEntryInput
        dimensionName="Innovating"
        score={0}
        evidence=""
        onScoreChange={mockOnScoreChange}
        onEvidenceChange={mockOnEvidenceChange}
      />
    )
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })

  it('calls onScoreChange when score button clicked', () => {
    render(
      <ScorecardEntryInput
        dimensionName="Innovating"
        score={0}
        evidence=""
        onScoreChange={mockOnScoreChange}
        onEvidenceChange={mockOnEvidenceChange}
      />
    )
    // Click the "5" button
    const fiveButton = screen.getAllByRole('radio')[2]
    fireEvent.click(fiveButton)
    expect(mockOnScoreChange).toHaveBeenCalledWith(5)
  })

  it('calls onEvidenceChange when textarea changes', () => {
    render(
      <ScorecardEntryInput
        dimensionName="Innovating"
        score={0}
        evidence=""
        onScoreChange={mockOnScoreChange}
        onEvidenceChange={mockOnEvidenceChange}
      />
    )
    const textarea = screen.getByPlaceholderText('Evidence and observations...')
    fireEvent.change(textarea, { target: { value: 'Good answers' } })
    expect(mockOnEvidenceChange).toHaveBeenCalledWith('Good answers')
  })

  it('shows counter-productive label when flagged', () => {
    render(
      <ScorecardEntryInput
        dimensionName="Resistance"
        score={0}
        evidence=""
        onScoreChange={mockOnScoreChange}
        onEvidenceChange={mockOnEvidenceChange}
        isCounterProductive
      />
    )
    expect(screen.getByText(/Counter-productive - inverted/)).toBeInTheDocument()
  })

  it('marks selected score as checked', () => {
    render(
      <ScorecardEntryInput
        dimensionName="Innovating"
        score={3}
        evidence=""
        onScoreChange={mockOnScoreChange}
        onEvidenceChange={mockOnEvidenceChange}
      />
    )
    const radios = screen.getAllByRole('radio')
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
  })
})
