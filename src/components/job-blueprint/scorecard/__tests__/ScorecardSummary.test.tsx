import { render, screen } from '@testing-library/react'
import { ScorecardSummary } from '../ScorecardSummary'

describe('ScorecardSummary', () => {
  it('displays grand total', () => {
    render(<ScorecardSummary grandTotal={42} recommendation="hire-with-plan" />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('/ 55')).toBeInTheDocument()
  })

  it('displays strong-hire recommendation', () => {
    render(<ScorecardSummary grandTotal={50} recommendation="strong-hire" />)
    expect(screen.getByText('Strong Hire')).toBeInTheDocument()
  })

  it('displays hire-with-plan recommendation', () => {
    render(<ScorecardSummary grandTotal={40} recommendation="hire-with-plan" />)
    expect(screen.getByText('Hire with Development Plan')).toBeInTheDocument()
  })

  it('displays conditional recommendation', () => {
    render(<ScorecardSummary grandTotal={30} recommendation="conditional" />)
    expect(screen.getByText('Conditional')).toBeInTheDocument()
  })

  it('displays do-not-hire recommendation', () => {
    render(<ScorecardSummary grandTotal={15} recommendation="do-not-hire" />)
    expect(screen.getByText('Do Not Hire')).toBeInTheDocument()
  })

  it('renders score bar segments', () => {
    const { container } = render(<ScorecardSummary grandTotal={42} recommendation="hire-with-plan" />)
    // Should have threshold segments
    const segments = container.querySelectorAll('.h-full')
    expect(segments.length).toBeGreaterThanOrEqual(1)
  })
})
