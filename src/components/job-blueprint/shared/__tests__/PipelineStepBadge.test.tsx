import { render, screen } from '@testing-library/react'
import { PipelineStepBadge } from '../PipelineStepBadge'

describe('PipelineStepBadge', () => {
  it('renders intake label', () => {
    render(<PipelineStepBadge step="intake" />)
    expect(screen.getByText('Intake')).toBeInTheDocument()
  })

  it('renders assessment-invited label', () => {
    render(<PipelineStepBadge step="assessment-invited" />)
    expect(screen.getByText('Assessment Invited')).toBeInTheDocument()
  })

  it('renders hired label', () => {
    render(<PipelineStepBadge step="hired" />)
    expect(screen.getByText('Hired')).toBeInTheDocument()
  })

  it('renders rejected label', () => {
    render(<PipelineStepBadge step="rejected" />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it('applies background class for intake', () => {
    const { container } = render(<PipelineStepBadge step="intake" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-gray-100')
  })

  it('applies background class for hired', () => {
    const { container } = render(<PipelineStepBadge step="hired" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-emerald-100')
  })
})
