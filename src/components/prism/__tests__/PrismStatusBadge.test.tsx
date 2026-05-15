import { render, screen } from '@testing-library/react'
import PrismStatusBadge from '../PrismStatusBadge'
import { STATUS_CONFIG } from '@/constants/prism'
import type { AssessmentStatus } from '@/types/prism/assessment-types'

describe('PrismStatusBadge', () => {
  const statuses = Object.keys(STATUS_CONFIG) as AssessmentStatus[]

  it.each(statuses)('renders correct label for status "%s"', (status) => {
    render(<PrismStatusBadge status={status} />)
    expect(screen.getByText(STATUS_CONFIG[status].label)).toBeInTheDocument()
  })
})
