import { render, screen } from '@testing-library/react'
import { BMLProgressBar } from '../BMLProgressBar'

describe('BMLProgressBar', () => {
  it('renders question count', () => {
    render(<BMLProgressBar current={3} total={10} />)
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument()
  })

  it('renders percentage', () => {
    render(<BMLProgressBar current={5} total={10} />)
    expect(screen.getByText('50% complete')).toBeInTheDocument()
  })

  it('handles 0 total gracefully', () => {
    render(<BMLProgressBar current={0} total={0} />)
    expect(screen.getByText('0% complete')).toBeInTheDocument()
  })

  it('rounds percentage correctly', () => {
    render(<BMLProgressBar current={1} total={3} />)
    expect(screen.getByText('33% complete')).toBeInTheDocument()
  })

  it('renders the progress bar element', () => {
    const { container } = render(<BMLProgressBar current={5} total={10} />)
    const bar = container.querySelector('.bg-slate-700')
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveStyle({ width: '50%' })
  })
})
