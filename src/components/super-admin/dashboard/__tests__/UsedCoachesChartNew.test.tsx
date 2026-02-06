import { render, screen } from '@testing-library/react'
import { UsedCoachesChartNew } from '../UsedCoachesChartNew'

/* ------------------------------------------------------------------
 * MOCK RECHARTS (DO NOT TEST CHART LIB)
 * ------------------------------------------------------------------ */
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }: any) => <div data-testid="bar">{children}</div>,
  CartesianGrid: () => <div data-testid="grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: ({ tickFormatter }: any) => {
    tickFormatter?.('Human Resources')
    return <div data-testid="y-axis" />
  },
  LabelList: () => <div data-testid="label-list" />,
}))


/* ------------------------------------------------------------------
 * MOCK CHART UI
 * ------------------------------------------------------------------ */
jest.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: any) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: ({ content }: any) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: () => (
    <div data-testid="chart-tooltip-content" />
  ),
}))

/* ------------------------------------------------------------------
 * MOCK CARD UI
 * ------------------------------------------------------------------ */
jest.mock('@/components/ui/card', () => ({
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}))

/* ------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------ */
describe('UsedCoachesChartNew', () => {
  it('should render chart title', () => {
    render(<UsedCoachesChartNew />)

    expect(screen.getByText('Most Used Coaches')).toBeInTheDocument()
  })

  it('should render chart container and bar chart', () => {
    render(<UsedCoachesChartNew />)

    expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('should render axes and grid', () => {
    render(<UsedCoachesChartNew />)

    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    expect(screen.getByTestId('grid')).toBeInTheDocument()
  })

  it('should render bar and label list', () => {
    render(<UsedCoachesChartNew />)

    expect(screen.getByTestId('bar')).toBeInTheDocument()
    expect(screen.getByTestId('label-list')).toBeInTheDocument()
  })

  it('should render tooltip and tooltip content', () => {
    render(<UsedCoachesChartNew />)

    expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument()
    expect(
      screen.getByTestId('chart-tooltip-content')
    ).toBeInTheDocument()
  })
})
