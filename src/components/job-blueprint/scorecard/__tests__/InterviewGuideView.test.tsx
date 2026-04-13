import { render, screen } from '@testing-library/react'
import { InterviewGuideView } from '../InterviewGuideView'
import type { InterviewGuide } from '@/types/job-blueprint'

const mockGuide: InterviewGuide = {
  jobId: 'job-1',
  candidateId: 'cand-1',
  roleTitle: 'Senior Engineer',
  focusDimensions: [
    {
      dimensionId: 1,
      dimensionName: 'Innovating',
      category: 'behavior',
      benchmarkScore: 85,
      candidateScore: 60,
      gap: -25,
      questions: ['Describe a time you innovated.', 'How do you approach new problems?'],
    },
  ],
  counterProductiveQuestions: [
    {
      dimensionName: 'Resistance to Change',
      questions: ['Tell me about a time you disagreed with a change.'],
    },
  ],
  generalQuestions: ['Why are you interested in this role?', 'Where do you see yourself in 5 years?'],
  generatedAt: '2026-01-15T10:00:00Z',
}

describe('InterviewGuideView', () => {
  it('renders heading', () => {
    render(<InterviewGuideView guide={mockGuide} />)
    expect(screen.getByText('Interview Guide')).toBeInTheDocument()
  })

  it('shows role title', () => {
    render(<InterviewGuideView guide={mockGuide} />)
    expect(screen.getByText(/Senior Engineer/)).toBeInTheDocument()
  })

  it('renders focus dimension name and questions', () => {
    render(<InterviewGuideView guide={mockGuide} />)
    expect(screen.getByText('Innovating')).toBeInTheDocument()
    expect(screen.getByText('Describe a time you innovated.')).toBeInTheDocument()
    expect(screen.getByText('How do you approach new problems?')).toBeInTheDocument()
  })

  it('renders counter-productive questions section', () => {
    render(<InterviewGuideView guide={mockGuide} />)
    expect(screen.getByText('Counter-Productive Behavior Questions')).toBeInTheDocument()
    expect(screen.getByText('Resistance to Change')).toBeInTheDocument()
    expect(screen.getByText('Tell me about a time you disagreed with a change.')).toBeInTheDocument()
  })

  it('renders general interview questions', () => {
    render(<InterviewGuideView guide={mockGuide} />)
    expect(screen.getByText('General Interview Questions')).toBeInTheDocument()
    expect(screen.getByText('Why are you interested in this role?')).toBeInTheDocument()
  })

  it('shows gap information in focus dimension header', () => {
    render(<InterviewGuideView guide={mockGuide} />)
    expect(screen.getByText(/Gap: -25/)).toBeInTheDocument()
  })
})
