import { render, screen } from '@testing-library/react'
import { TimeToFillChart } from '../TimeToFillChart'
import type { TimeToFillDataPoint } from '@/types/job-blueprint'

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
}))

const mockData: TimeToFillDataPoint[] = [
  { month: 'Jan', days: 28, tier: 'professional' },
  { month: 'Feb', days: 35, tier: 'executive' },
]

describe('TimeToFillChart', () => {
  it('renders chart card with title', () => {
    render(<TimeToFillChart data={mockData} />)
    expect(screen.getByText('Time to Fill (Days)')).toBeInTheDocument()
  })

  it('renders the bar chart', () => {
    render(<TimeToFillChart data={mockData} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
