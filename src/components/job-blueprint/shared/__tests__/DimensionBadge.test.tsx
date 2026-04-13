import { render, screen } from '@testing-library/react'
import { DimensionBadge } from '../DimensionBadge'

describe('DimensionBadge', () => {
  it('renders dimension name', () => {
    render(<DimensionBadge name="Innovating" category="behavior" />)
    expect(screen.getByText('Innovating')).toBeInTheDocument()
  })

  it('applies behavior category colors', () => {
    const { container } = render(<DimensionBadge name="Innovating" category="behavior" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-green-100')
  })

  it('applies aptitude category colors', () => {
    const { container } = render(<DimensionBadge name="Practical" category="aptitude" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-blue-100')
  })

  it('applies core-trait category colors', () => {
    const { container } = render(<DimensionBadge name="Decisiveness" category="core-trait" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-orange-100')
  })

  it('shows score when provided', () => {
    render(<DimensionBadge name="Innovating" category="behavior" score={85.4} />)
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('does not show score when not provided', () => {
    const { container } = render(<DimensionBadge name="Innovating" category="behavior" />)
    expect(container.querySelector('.font-bold')).toBeNull()
  })
})
