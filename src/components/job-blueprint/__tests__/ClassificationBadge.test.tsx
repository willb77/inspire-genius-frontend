import { render, screen } from '@testing-library/react'
import { ClassificationBadge } from '../shared/ClassificationBadge'

describe('ClassificationBadge', () => {
  it('renders strong-fit label', () => {
    render(<ClassificationBadge tier="strong-fit" />)
    expect(screen.getByText('Strong Fit')).toBeInTheDocument()
  })

  it('renders potential-fit label', () => {
    render(<ClassificationBadge tier="potential-fit" />)
    expect(screen.getByText('Potential Fit')).toBeInTheDocument()
  })

  it('renders moderate-fit label', () => {
    render(<ClassificationBadge tier="moderate-fit" />)
    expect(screen.getByText('Moderate Fit')).toBeInTheDocument()
  })

  it('renders misalignment label', () => {
    render(<ClassificationBadge tier="misalignment" />)
    expect(screen.getByText('Misalignment')).toBeInTheDocument()
  })

  it('applies correct background class for strong-fit', () => {
    render(<ClassificationBadge tier="strong-fit" />)
    const badge = screen.getByTestId('classification-badge')
    expect(badge.className).toContain('bg-green-100')
  })

  it('applies correct background class for misalignment', () => {
    render(<ClassificationBadge tier="misalignment" />)
    const badge = screen.getByTestId('classification-badge')
    expect(badge.className).toContain('bg-red-100')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<ClassificationBadge tier="strong-fit" size="sm" />)
    let badge = screen.getByTestId('classification-badge')
    expect(badge.className).toContain('text-xs')

    rerender(<ClassificationBadge tier="strong-fit" size="lg" />)
    badge = screen.getByTestId('classification-badge')
    expect(badge.className).toContain('text-base')
  })
})
