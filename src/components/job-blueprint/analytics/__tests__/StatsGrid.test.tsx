import { render, screen } from '@testing-library/react'
import { StatsGrid } from '../StatsGrid'
import type { BlueprintStats } from '@/types/job-blueprint'

const mockStats: BlueprintStats = {
  totalJobDnas: 12,
  activeJobs: 5,
  totalCandidates: 48,
  avgTimeToFill: 32,
  strongFitRate: 67,
  hiresThisMonth: 3,
}

describe('StatsGrid', () => {
  it('renders all 6 stat cards', () => {
    render(<StatsGrid stats={mockStats} />)
    expect(screen.getByText('Total Job DNAs')).toBeInTheDocument()
    expect(screen.getByText('Active Jobs')).toBeInTheDocument()
    expect(screen.getByText('Total Candidates')).toBeInTheDocument()
    expect(screen.getByText('Avg Time to Fill')).toBeInTheDocument()
    expect(screen.getByText('Strong Fit Rate')).toBeInTheDocument()
    expect(screen.getByText('Hires This Month')).toBeInTheDocument()
  })

  it('displays correct stat values', () => {
    render(<StatsGrid stats={mockStats} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getByText('32d')).toBeInTheDocument()
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
