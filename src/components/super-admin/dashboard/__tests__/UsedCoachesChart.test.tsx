import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import UsedCoachesChart from '../UsedCoachesChart'

type ChildrenProps = { children?: ReactNode }
type YAxisProps = { tickFormatter?: (value: string) => string }
type ChartTooltipProps = { content?: ReactNode }

/* ------------------------------------------------------------------
 * MOCK RECHARTS (DO NOT TEST CHART LIB)
 * ------------------------------------------------------------------ */
jest.mock('recharts', () => ({
  BarChart: ({ children }: ChildrenProps) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }: ChildrenProps) => <div data-testid="bar">{children}</div>,
  CartesianGrid: () => <div data-testid="grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: ({ tickFormatter }: YAxisProps) => {
    tickFormatter?.('Human Resources')
    return <div data-testid="y-axis" />
  },
  LabelList: () => <div data-testid="label-list" />,
}))

/* ------------------------------------------------------------------
 * MOCK CHART UI
 * ------------------------------------------------------------------ */
jest.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: ChildrenProps) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: ({ content }: ChartTooltipProps) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}))

/* ------------------------------------------------------------------
 * MOCK CARD UI
 * ------------------------------------------------------------------ */
jest.mock('@/components/ui/card', () => ({
  CardHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  CardContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  CardTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

/* ------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------ */
describe('UsedCoachesChart', () => {
  it('should render chart title', () => {
    render(<UsedCoachesChart />)

    expect(screen.getByText('Most Used Coaches')).toBeInTheDocument()
  })

  it('should render chart container and bar chart', () => {
    render(<UsedCoachesChart />)

    expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('should render axes and grid', () => {
    render(<UsedCoachesChart />)

    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    expect(screen.getByTestId('grid')).toBeInTheDocument()
  })

  it('should render bar and label list', () => {
    render(<UsedCoachesChart />)

    expect(screen.getByTestId('bar')).toBeInTheDocument()
    expect(screen.getByTestId('label-list')).toBeInTheDocument()
  })

  it('should render tooltip and tooltip content', () => {
    render(<UsedCoachesChart />)

    expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument()
    expect(screen.getByTestId('chart-tooltip-content')).toBeInTheDocument()
  })
})
