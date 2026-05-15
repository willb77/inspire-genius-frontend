import { render, screen } from '@testing-library/react'
import { InsightPackageView } from '../InsightPackageView'
import type { InsightPackage } from '@/types/job-blueprint'

jest.mock('@/components/job-blueprint/shared/ScoreBar', () => ({
  ScoreBar: ({ score }: { score: number }) => <div data-testid="score-bar">{score}%</div>,
}))
jest.mock('@/components/job-blueprint/shared/ClassificationBadge', () => ({
  ClassificationBadge: ({ tier }: { tier: string }) => <span data-testid="classification-badge">{tier}</span>,
}))

const mockInsight: InsightPackage = {
  candidateId: 'cand-1',
  jobId: 'job-1',
  fitScore: 78,
  tier: 'potential-fit',
  gapAnalysis: [
    { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', candidateScore: 70, benchmarkScore: 85, gap: -15, recommendation: 'Develop creative thinking' },
  ],
  interviewFocusAreas: ['Probe creative problem solving', 'Explore leadership examples'],
  probeQuestions: [
    { area: 'Innovation', question: 'Describe your most creative solution.' },
  ],
  riskFactors: ['Low innovation score'],
  opportunityFactors: ['Strong communication skills'],
  generatedAt: '2026-01-15T10:00:00Z',
}

describe('InsightPackageView', () => {
  it('renders heading', () => {
    render(<InsightPackageView insight={mockInsight} />)
    expect(screen.getByText('Insight Package')).toBeInTheDocument()
  })

  it('renders fit score', () => {
    render(<InsightPackageView insight={mockInsight} />)
    expect(screen.getByTestId('score-bar')).toHaveTextContent('78%')
  })

  it('renders classification badge', () => {
    render(<InsightPackageView insight={mockInsight} />)
    expect(screen.getByTestId('classification-badge')).toHaveTextContent('potential-fit')
  })

  it('renders gap analysis section', () => {
    render(<InsightPackageView insight={mockInsight} />)
    expect(screen.getByText('Gap Analysis')).toBeInTheDocument()
    expect(screen.getByText('Innovating')).toBeInTheDocument()
    expect(screen.getByText('Develop creative thinking')).toBeInTheDocument()
  })

  it('renders interview focus areas', () => {
    render(<InsightPackageView insight={mockInsight} />)
    expect(screen.getByText('Interview Focus Areas')).toBeInTheDocument()
    expect(screen.getByText('Probe creative problem solving')).toBeInTheDocument()
  })

  it('renders probe questions', () => {
    render(<InsightPackageView insight={mockInsight} />)
    expect(screen.getByText('Probe Questions')).toBeInTheDocument()
    expect(screen.getByText('Describe your most creative solution.')).toBeInTheDocument()
  })

  it('renders risk factors', () => {
    render(<InsightPackageView insight={mockInsight} />)
    expect(screen.getByText('Risk Factors')).toBeInTheDocument()
    expect(screen.getByText('Low innovation score')).toBeInTheDocument()
  })

  it('renders opportunity factors', () => {
    render(<InsightPackageView insight={mockInsight} />)
    expect(screen.getByText('Opportunity Factors')).toBeInTheDocument()
    expect(screen.getByText('Strong communication skills')).toBeInTheDocument()
  })
})
