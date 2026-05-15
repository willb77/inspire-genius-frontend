import { render, screen } from '@testing-library/react'
import { ScoreBar } from '../ScoreBar'

describe('ScoreBar', () => {
  it('renders score value by default', () => {
    render(<ScoreBar score={75} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('hides score value when showValue is false', () => {
    render(<ScoreBar score={75} showValue={false} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<ScoreBar score={75} label="Fit Score" />)
    expect(screen.getByText('Fit Score')).toBeInTheDocument()
  })

  it('applies green color for high scores', () => {
    const { container } = render(<ScoreBar score={90} />)
    const bar = container.querySelector('.bg-green-500')
    expect(bar).toBeInTheDocument()
  })

  it('applies blue color for natural-range scores', () => {
    const { container } = render(<ScoreBar score={70} />)
    const bar = container.querySelector('.bg-blue-500')
    expect(bar).toBeInTheDocument()
  })

  it('applies yellow color for moderate scores', () => {
    const { container } = render(<ScoreBar score={50} />)
    const bar = container.querySelector('.bg-yellow-500')
    expect(bar).toBeInTheDocument()
  })

  it('applies red color for low scores', () => {
    const { container } = render(<ScoreBar score={20} />)
    const bar = container.querySelector('.bg-red-500')
    expect(bar).toBeInTheDocument()
  })

  it('uses custom color when provided', () => {
    const { container } = render(<ScoreBar score={90} color="bg-purple-500" />)
    const bar = container.querySelector('.bg-purple-500')
    expect(bar).toBeInTheDocument()
  })

  it('clamps percentage to 0-100', () => {
    const { container } = render(<ScoreBar score={150} />)
    const bar = container.querySelector('.rounded-full.transition-all')
    expect(bar).toHaveStyle({ width: '100%' })
  })
})
