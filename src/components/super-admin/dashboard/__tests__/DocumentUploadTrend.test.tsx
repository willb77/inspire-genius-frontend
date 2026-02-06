import { render, screen } from '@testing-library/react'
import { DocumentUploadTrend } from '../DocumentUploadTrend'
import { useDocumentTrend } from '@/hooks/super-admin/dashboard/useDocumentTrend'

/* ------------------------------------------------------------------
 * MOCK HOOK
 * ------------------------------------------------------------------ */
jest.mock('@/hooks/super-admin/dashboard/useDocumentTrend', () => ({
  useDocumentTrend: jest.fn(),
}))

/* ------------------------------------------------------------------
 * MOCK RECHARTS
 * ------------------------------------------------------------------ */
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
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
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}))

/* ------------------------------------------------------------------
 * MOCK CARD + SKELETON
 * ------------------------------------------------------------------ */
jest.mock('@/components/ui/card', () => ({
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

/* ------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------ */
describe('DocumentUploadTrend', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render skeleton while loading', () => {
    ;(useDocumentTrend as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: true,
    })

    render(<DocumentUploadTrend />)

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })

  it('should render chart when data is loaded', () => {
    ;(useDocumentTrend as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: [
          {
            category_id: '1',
            category_name: 'Invoices',
            file_count: 10,
            display_name: 'Invoices',
          },
          {
            category_id: '2',
            category_name: 'Reports',
            file_count: 5,
            display_name: 'Reports',
          },
        ],
      },
    })

    render(<DocumentUploadTrend />)

    expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie')).toBeInTheDocument()
  })

  it('should render document categories legend', () => {
    ;(useDocumentTrend as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: [
          {
            category_id: '1',
            category_name: 'Invoices',
            file_count: 10,
            display_name: 'Invoices',
          },
          {
            category_id: '2',
            category_name: 'Reports',
            file_count: 5,
            display_name: 'Reports',
          },
        ],
      },
    })

    render(<DocumentUploadTrend />)

    expect(screen.getByText('Invoices')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
  })

  it('should handle empty data gracefully', () => {
    ;(useDocumentTrend as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: [],
      },
    })

    render(<DocumentUploadTrend />)

    // Chart still renders
    expect(screen.getByTestId('chart-container')).toBeInTheDocument()

    // No categories
    expect(screen.queryByText('Invoices')).not.toBeInTheDocument()
  })

  it('should render tooltip content', () => {
    ;(useDocumentTrend as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: [
          {
            category_id: '1',
            category_name: 'Invoices',
            file_count: 10,
            display_name: 'Invoices',
          },
        ],
      },
    })

    render(<DocumentUploadTrend />)

    expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument()
    expect(screen.getByTestId('chart-tooltip-content')).toBeInTheDocument()
  })

  it('should render title', () => {
    ;(useDocumentTrend as jest.Mock).mockReturnValue({
      isPending: false,
      data: {
        data: [],
      },
    })

    render(<DocumentUploadTrend />)

    expect(
      screen.getByText('Documents Uploads Trend')
    ).toBeInTheDocument()
  })
})
