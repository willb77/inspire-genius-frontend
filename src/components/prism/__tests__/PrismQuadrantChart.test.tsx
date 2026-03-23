import { render, screen } from '@testing-library/react'
import PrismQuadrantChart from '../PrismQuadrantChart'
import type { PRISMQuadrant } from '@/types/prism/api-types'

const mockQuadrants: PRISMQuadrant[] = [
  { QuadID: 1, Name: 'Green', Value: 72 },
  { QuadID: 2, Name: 'Blue', Value: 58 },
  { QuadID: 3, Name: 'Red', Value: 45 },
  { QuadID: 4, Name: 'Gold', Value: 85 },
]

describe('PrismQuadrantChart', () => {
  it('renders all four quadrants with labels and values', () => {
    render(<PrismQuadrantChart quadrants={mockQuadrants} />)

    expect(screen.getByText('Green')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
    expect(screen.getByText('Red')).toBeInTheDocument()
    expect(screen.getByText('Gold')).toBeInTheDocument()

    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('58')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('renders nothing when quadrants array is empty', () => {
    const { container } = render(<PrismQuadrantChart quadrants={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
