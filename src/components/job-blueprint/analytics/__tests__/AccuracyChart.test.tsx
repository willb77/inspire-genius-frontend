import { render, screen } from '@testing-library/react'
import { AccuracyChart } from '../AccuracyChart'
import type { AccuracyDataPoint } from '@/types/job-blueprint'

jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
}))

const mockData: AccuracyDataPoint[] = [
  { month: 'Jan', predicted: 80, actual: 75 },
  { month: 'Feb', predicted: 82, actual: 78 },
]

describe('AccuracyChart', () => {
  it('renders chart card with title', () => {
    render(<AccuracyChart data={mockData} />)
    expect(screen.getByText('Prediction Accuracy')).toBeInTheDocument()
  })

  it('renders the line chart', () => {
    render(<AccuracyChart data={mockData} />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
