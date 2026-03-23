import { render, screen } from '@testing-library/react'
import PrismBehaviourChart from '../PrismBehaviourChart'
import type { PRISMBehaviourDimension } from '@/types/prism/api-types'

const mockBehaviours: PRISMBehaviourDimension[] = [
  { BehaviourID: 1, Name: 'Innovating', Value: 45 },
  { BehaviourID: 2, Name: 'Initiating', Value: 88 },
  { BehaviourID: 3, Name: 'Supporting', Value: 62 },
  { BehaviourID: 4, Name: 'Coordinating', Value: 55 },
  { BehaviourID: 5, Name: 'Focusing', Value: 70 },
  { BehaviourID: 6, Name: 'Delivering', Value: 78 },
  { BehaviourID: 7, Name: 'Finishing', Value: 50 },
  { BehaviourID: 8, Name: 'Evaluating', Value: 88 },
]

describe('PrismBehaviourChart', () => {
  it('renders all 8 behaviour dimensions', () => {
    render(<PrismBehaviourChart behaviours={mockBehaviours} />)

    expect(screen.getByText('Innovating')).toBeInTheDocument()
    expect(screen.getByText('Initiating')).toBeInTheDocument()
    expect(screen.getByText('Evaluating')).toBeInTheDocument()
  })

  it('renders nothing when behaviours array is empty', () => {
    const { container } = render(<PrismBehaviourChart behaviours={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
