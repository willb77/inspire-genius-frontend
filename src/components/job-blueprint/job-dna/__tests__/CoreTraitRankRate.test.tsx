import { render, screen } from '@testing-library/react'
import { CoreTraitRankRate } from '../CoreTraitRankRate'

jest.mock('../RankRateInput', () => ({
  RankRateInput: ({ dimensions, category }: { dimensions: unknown[]; category: string }) => (
    <div data-testid="rank-rate-input" data-category={category} data-count={dimensions.length} />
  ),
}))

describe('CoreTraitRankRate', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders heading and description', () => {
    render(<CoreTraitRankRate value={[]} onChange={mockOnChange} />)
    expect(screen.getByText('Core Traits')).toBeInTheDocument()
    expect(screen.getByText(/Rank the 6 core traits/)).toBeInTheDocument()
  })

  it('passes core-trait category to RankRateInput', () => {
    render(<CoreTraitRankRate value={[]} onChange={mockOnChange} />)
    const input = screen.getByTestId('rank-rate-input')
    expect(input).toHaveAttribute('data-category', 'core-trait')
  })

  it('passes 6 core trait dimensions', () => {
    render(<CoreTraitRankRate value={[]} onChange={mockOnChange} />)
    const input = screen.getByTestId('rank-rate-input')
    expect(input).toHaveAttribute('data-count', '6')
  })
})
