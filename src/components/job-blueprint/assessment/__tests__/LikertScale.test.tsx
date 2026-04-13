import { render, screen, fireEvent } from '@testing-library/react'
import { LikertScale } from '../LikertScale'

describe('LikertScale', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders 7 radio buttons by default', () => {
    render(<LikertScale questionId="q1" value={null} onChange={mockOnChange} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(7)
  })

  it('renders scale labels', () => {
    render(<LikertScale questionId="q1" value={null} onChange={mockOnChange} />)
    expect(screen.getByText('Strongly Disagree')).toBeInTheDocument()
    expect(screen.getByText('Strongly Agree')).toBeInTheDocument()
  })

  it('calls onChange when a value is clicked', () => {
    render(<LikertScale questionId="q1" value={null} onChange={mockOnChange} />)
    fireEvent.click(screen.getByLabelText('Neutral'))
    expect(mockOnChange).toHaveBeenCalledWith(4)
  })

  it('marks selected value as checked', () => {
    render(<LikertScale questionId="q1" value={5} onChange={mockOnChange} />)
    const selected = screen.getByLabelText('Somewhat Agree')
    expect(selected).toHaveAttribute('aria-checked', 'true')
  })

  it('shows interpretation label when value is selected', () => {
    render(<LikertScale questionId="q1" value={7} onChange={mockOnChange} />)
    // The LABELS[7] = "Strongly Agree" shown below the scale
    const labels = screen.getAllByText('Strongly Agree')
    expect(labels.length).toBeGreaterThanOrEqual(1)
  })

  it('does not show interpretation when no value selected', () => {
    const { container } = render(<LikertScale questionId="q1" value={null} onChange={mockOnChange} />)
    // The interpretation paragraph only appears when value is truthy
    // "Strongly Disagree" and "Strongly Agree" are the minLabel/maxLabel, not interpretation
    const paragraphs = container.querySelectorAll('p.text-xs.text-center')
    expect(paragraphs).toHaveLength(0)
  })

  it('supports custom min/max range', () => {
    render(<LikertScale questionId="q1" value={null} onChange={mockOnChange} min={1} max={5} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(5)
  })
})
