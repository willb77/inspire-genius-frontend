import { render, screen } from '@testing-library/react'
import { HiresPanel } from '../HiresPanel'
import type { HiresByPeriod } from '@/types/job-blueprint'

const rows: HiresByPeriod[] = [
  { period: '2026-07', hires: 3, avgFitScore: 71.6 },
  { period: '2026-08', hires: 1, avgFitScore: 64 },
]

describe('HiresPanel', () => {
  it('renders the title and one row per period with a rounded fit', () => {
    render(<HiresPanel data={rows} />)
    expect(screen.getByText('Hires by period')).toBeInTheDocument()
    expect(screen.getByText('2026-07')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getByText('64%')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2
  })
})
