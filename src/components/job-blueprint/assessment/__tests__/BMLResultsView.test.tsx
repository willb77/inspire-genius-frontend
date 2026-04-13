import { render, screen } from '@testing-library/react'
import { BMLResultsView } from '../BMLResultsView'
import type { DimensionScore } from '@/types/job-blueprint'

jest.mock('@/components/job-blueprint/shared/ScoreBar', () => ({
  ScoreBar: ({ score }: { score: number }) => <div data-testid="score-bar">{score}%</div>,
}))
jest.mock('@/components/job-blueprint/shared/DimensionBadge', () => ({
  DimensionBadge: ({ name }: { name: string }) => <span data-testid="dimension-badge">{name}</span>,
}))

const mockScores: DimensionScore[] = [
  { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', score: 85 },
  { dimensionId: 2, dimensionName: 'Evaluating', category: 'behavior', score: 70 },
  { dimensionId: 1, dimensionName: 'Practical', category: 'aptitude', score: 60 },
  { dimensionId: 1, dimensionName: 'Decisiveness', category: 'core-trait', score: 90 },
]

describe('BMLResultsView', () => {
  it('renders heading', () => {
    render(<BMLResultsView scores={mockScores} confidence={87} />)
    expect(screen.getByText('Assessment Results')).toBeInTheDocument()
  })

  it('displays confidence score', () => {
    render(<BMLResultsView scores={mockScores} confidence={87} />)
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('renders section titles for each category', () => {
    render(<BMLResultsView scores={mockScores} confidence={87} />)
    expect(screen.getByText('Behavior Preferences')).toBeInTheDocument()
    expect(screen.getByText('Work Aptitudes')).toBeInTheDocument()
    expect(screen.getByText('Core Traits')).toBeInTheDocument()
  })

  it('renders dimension badges for all scores', () => {
    render(<BMLResultsView scores={mockScores} confidence={87} />)
    const badges = screen.getAllByTestId('dimension-badge')
    expect(badges).toHaveLength(4)
  })

  it('renders score bars for all scores', () => {
    render(<BMLResultsView scores={mockScores} confidence={87} />)
    const bars = screen.getAllByTestId('score-bar')
    expect(bars).toHaveLength(4)
  })
})
