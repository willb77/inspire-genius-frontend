import { render, screen, fireEvent } from '@testing-library/react'
import { JobDnaCard } from '../JobDnaCard'
import type { JobDNA } from '@/types/job-blueprint'

jest.mock('@/components/job-blueprint/shared/DimensionBadge', () => ({
  DimensionBadge: ({ name }: { name: string }) => <span data-testid="dimension-badge">{name}</span>,
}))

const mockJobDna: JobDNA = {
  id: 'jd-1',
  orgId: 'org-1',
  roleTitle: 'Senior Engineer',
  department: 'Engineering',
  tier: 'professional',
  status: 'active',
  behaviors: [
    { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', rankPosition: 1, rankPercent: 96, rateValue: 8, finalBenchmarkPercent: 92, interpretation: 'very-high' },
    { dimensionId: 2, dimensionName: 'Evaluating', category: 'behavior', rankPosition: 2, rankPercent: 84, rateValue: 7, finalBenchmarkPercent: 78, interpretation: 'natural' },
    { dimensionId: 3, dimensionName: 'Finishing', category: 'behavior', rankPosition: 3, rankPercent: 72, rateValue: 6, finalBenchmarkPercent: 65, interpretation: 'natural' },
    { dimensionId: 4, dimensionName: 'Delivering', category: 'behavior', rankPosition: 4, rankPercent: 60, rateValue: 5, finalBenchmarkPercent: 55, interpretation: 'moderate' },
  ],
  aptitudes: [],
  coreTraits: [],
  counterProductiveBehaviors: [],
  roleContext: { workPressures: [], requiredWorkStyles: [], environmentalFactors: [], culturalFactors: [] },
  deliverables: { jobDescription: '', kpis: [], criticalActivities: [], keyInteractions: [] },
  createdBy: 'user-1',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  version: 1,
}

describe('JobDnaCard', () => {
  it('renders role title', () => {
    render(<JobDnaCard jobDna={mockJobDna} />)
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument()
  })

  it('renders department', () => {
    render(<JobDnaCard jobDna={mockJobDna} />)
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<JobDnaCard jobDna={mockJobDna} />)
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('renders top 3 behavior badges', () => {
    render(<JobDnaCard jobDna={mockJobDna} />)
    const badges = screen.getAllByTestId('dimension-badge')
    expect(badges).toHaveLength(3)
    expect(badges[0]).toHaveTextContent('Innovating')
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<JobDnaCard jobDna={mockJobDna} onClick={handleClick} />)
    fireEvent.click(screen.getByText('Senior Engineer'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
