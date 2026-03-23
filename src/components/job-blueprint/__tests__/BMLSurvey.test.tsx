import { render, screen } from '@testing-library/react'
import { BMLSurvey } from '../assessment/BMLSurvey'
import type { BMLQuestion } from '@/types/job-blueprint'

const MOCK_QUESTIONS: BMLQuestion[] = [
  { id: 'q1', dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', text: 'I enjoy generating original ideas.', order: 1 },
  { id: 'q2', dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', text: 'I am naturally curious.', order: 2 },
  { id: 'q3', dimensionId: 2, dimensionName: 'Initiating', category: 'behavior', text: 'I build relationships easily.', order: 3 },
]

describe('BMLSurvey', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the first question', () => {
    render(<BMLSurvey questions={MOCK_QUESTIONS} onSubmit={mockOnSubmit} />)
    expect(screen.getByText('I enjoy generating original ideas.')).toBeInTheDocument()
  })

  it('shows progress bar', () => {
    render(<BMLSurvey questions={MOCK_QUESTIONS} onSubmit={mockOnSubmit} />)
    expect(screen.getByText('Question 0 of 3')).toBeInTheDocument()
    expect(screen.getByText('0% complete')).toBeInTheDocument()
  })

  it('renders Likert scale buttons (1-7)', () => {
    render(<BMLSurvey questions={MOCK_QUESTIONS} onSubmit={mockOnSubmit} />)
    // Likert buttons use role="radio" within a radiogroup
    const radioButtons = screen.getAllByRole('radio')
    expect(radioButtons).toHaveLength(7)
  })

  it('renders question navigation dots', () => {
    render(<BMLSurvey questions={MOCK_QUESTIONS} onSubmit={mockOnSubmit} />)
    const dots = screen.getAllByLabelText(/Go to question/)
    expect(dots).toHaveLength(3)
  })

  it('shows the timer', () => {
    render(<BMLSurvey questions={MOCK_QUESTIONS} onSubmit={mockOnSubmit} />)
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })

  it('shows previous/next buttons', () => {
    render(<BMLSurvey questions={MOCK_QUESTIONS} onSubmit={mockOnSubmit} />)
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('disables previous on first question', () => {
    render(<BMLSurvey questions={MOCK_QUESTIONS} onSubmit={mockOnSubmit} />)
    const prevButton = screen.getByText('Previous').closest('button')
    expect(prevButton).toBeDisabled()
  })
})
