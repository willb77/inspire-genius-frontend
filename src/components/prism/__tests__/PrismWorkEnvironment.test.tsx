import { render, screen } from '@testing-library/react'
import PrismWorkEnvironment from '../PrismWorkEnvironment'

const mockData: Record<string, string> = {
  '80': 'Collaborative teamwork',
  '50': 'Structured processes',
  '20': 'High-pressure deadlines',
}

describe('PrismWorkEnvironment', () => {
  it('categorises items into Enhanced, Neutral, and Inhibited', () => {
    render(<PrismWorkEnvironment data={mockData} />)

    expect(screen.getByText('Enhanced')).toBeInTheDocument()
    expect(screen.getByText('Collaborative teamwork')).toBeInTheDocument()

    expect(screen.getByText('Neutral')).toBeInTheDocument()
    expect(screen.getByText('Structured processes')).toBeInTheDocument()

    expect(screen.getByText('Inhibited')).toBeInTheDocument()
    expect(screen.getByText('High-pressure deadlines')).toBeInTheDocument()
  })

  it('renders nothing when data is empty', () => {
    const { container } = render(<PrismWorkEnvironment data={{}} />)
    expect(container.firstChild).toBeNull()
  })
})
