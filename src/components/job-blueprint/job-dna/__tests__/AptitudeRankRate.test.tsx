import { render, screen } from '@testing-library/react'
import { AptitudeRankRate } from '../AptitudeRankRate'
import type { DimensionBenchmark } from '@/types/job-blueprint'

// Mock RankRateInput since it has its own test coverage
jest.mock('../RankRateInput', () => ({
  RankRateInput: ({ dimensions, category }: { dimensions: unknown[]; category: string }) => (
    <div data-testid="rank-rate-input" data-category={category} data-count={dimensions.length} />
  ),
}))

describe('AptitudeRankRate', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders heading and description', () => {
    render(<AptitudeRankRate value={[]} onChange={mockOnChange} />)
    expect(screen.getByText('Work Aptitude Preferences')).toBeInTheDocument()
    expect(screen.getByText(/Rank the 8 work aptitude preferences/)).toBeInTheDocument()
  })

  it('passes aptitude category to RankRateInput', () => {
    render(<AptitudeRankRate value={[]} onChange={mockOnChange} />)
    const input = screen.getByTestId('rank-rate-input')
    expect(input).toHaveAttribute('data-category', 'aptitude')
  })

  it('passes 8 aptitude dimensions', () => {
    render(<AptitudeRankRate value={[]} onChange={mockOnChange} />)
    const input = screen.getByTestId('rank-rate-input')
    expect(input).toHaveAttribute('data-count', '8')
  })
})
