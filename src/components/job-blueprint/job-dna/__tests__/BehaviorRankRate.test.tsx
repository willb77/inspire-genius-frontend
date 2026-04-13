import { render, screen } from '@testing-library/react'
import { BehaviorRankRate } from '../BehaviorRankRate'

jest.mock('../RankRateInput', () => ({
  RankRateInput: ({ dimensions, category }: { dimensions: unknown[]; category: string }) => (
    <div data-testid="rank-rate-input" data-category={category} data-count={dimensions.length} />
  ),
}))

describe('BehaviorRankRate', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders heading and description', () => {
    render(<BehaviorRankRate value={[]} onChange={mockOnChange} />)
    expect(screen.getByText('Behavior Preferences')).toBeInTheDocument()
    expect(screen.getByText(/Rank the 8 behavior preferences/)).toBeInTheDocument()
  })

  it('passes behavior category to RankRateInput', () => {
    render(<BehaviorRankRate value={[]} onChange={mockOnChange} />)
    const input = screen.getByTestId('rank-rate-input')
    expect(input).toHaveAttribute('data-category', 'behavior')
  })

  it('passes 8 behavior dimensions', () => {
    render(<BehaviorRankRate value={[]} onChange={mockOnChange} />)
    const input = screen.getByTestId('rank-rate-input')
    expect(input).toHaveAttribute('data-count', '8')
  })
})
