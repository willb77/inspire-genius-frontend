import { render, screen } from '@testing-library/react'
import { ScorecardSummary } from '../ScorecardSummary'

describe('ScorecardSummary', () => {
  it('displays grand total', () => {
    render(<ScorecardSummary grandTotal={42} recommendation="good-alignment" />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('/ 55')).toBeInTheDocument()
  })

  it('displays the strong-alignment band', () => {
    render(<ScorecardSummary grandTotal={50} recommendation="strong-alignment" />)
    expect(screen.getByText('Strong evidence of alignment')).toBeInTheDocument()
  })

  it('displays the good-alignment band', () => {
    render(<ScorecardSummary grandTotal={40} recommendation="good-alignment" />)
    expect(screen.getByText('Good alignment, with development areas')).toBeInTheDocument()
  })

  it('displays the partial-alignment band', () => {
    render(<ScorecardSummary grandTotal={30} recommendation="partial-alignment" />)
    expect(screen.getByText('Partial alignment, with clear areas to develop')).toBeInTheDocument()
  })

  it('displays the limited-alignment band', () => {
    render(<ScorecardSummary grandTotal={15} recommendation="limited-alignment" />)
    expect(screen.getByText('Limited alignment on the evidence gathered')).toBeInTheDocument()
  })

  it('renders score bar segments', () => {
    const { container } = render(<ScorecardSummary grandTotal={42} recommendation="good-alignment" />)
    // Should have threshold segments
    const segments = container.querySelectorAll('.h-full')
    expect(segments.length).toBeGreaterThanOrEqual(1)
  })

  it('never renders an imperative hiring verdict, at any band', () => {
    const bands = ['strong-alignment', 'good-alignment', 'partial-alignment', 'limited-alignment'] as const
    for (const b of bands) {
      const { unmount } = render(<ScorecardSummary grandTotal={30} recommendation={b} />)
      expect(screen.queryByText(/\bhire\b/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/recommendation/i)).not.toBeInTheDocument()
      expect(screen.getByText('What the evidence shows')).toBeInTheDocument()
      unmount()
    }
  })
})
