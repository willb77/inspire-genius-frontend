import { render, screen } from '@testing-library/react'
import { BenchmarkBarChart } from '../BenchmarkBarChart'
import type { DimensionBenchmark } from '@/types/job-blueprint'

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  ReferenceLine: () => <div />,
}))

const mockBenchmarks: DimensionBenchmark[] = [
  { dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', rankPosition: 1, rankPercent: 96, rateValue: 8, finalBenchmarkPercent: 92, interpretation: 'very-high' },
  { dimensionId: 2, dimensionName: 'Initiating', category: 'behavior', rankPosition: 2, rankPercent: 84, rateValue: 7, finalBenchmarkPercent: 78, interpretation: 'natural' },
]

describe('BenchmarkBarChart', () => {
  it('renders without errors', () => {
    render(<BenchmarkBarChart benchmarks={mockBenchmarks} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders with a title', () => {
    render(<BenchmarkBarChart benchmarks={mockBenchmarks} title="Behaviors" />)
    expect(screen.getByText('Behaviors')).toBeInTheDocument()
  })

  it('does not render title when not provided', () => {
    const { container } = render(<BenchmarkBarChart benchmarks={mockBenchmarks} />)
    expect(container.querySelector('h4')).toBeNull()
  })
})
