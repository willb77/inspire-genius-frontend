import { render, screen } from '@testing-library/react'
import { HiringFunnel } from '../HiringFunnel'
import type { FunnelStage } from '@/types/job-blueprint'

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
}))

const mockData: FunnelStage[] = [
  { stage: 'Applied', count: 100, percentage: 100 },
  { stage: 'Screened', count: 60, percentage: 60 },
  { stage: 'Hired', count: 10, percentage: 10 },
]

describe('HiringFunnel', () => {
  it('renders chart card with title', () => {
    render(<HiringFunnel data={mockData} />)
    expect(screen.getByText('Hiring Funnel')).toBeInTheDocument()
  })

  it('renders the bar chart', () => {
    render(<HiringFunnel data={mockData} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
