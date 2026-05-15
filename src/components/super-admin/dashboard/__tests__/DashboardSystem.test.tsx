import { render, screen } from '@testing-library/react'
import DashboardSystem from '../DashboardSystem'
import { useDashboardSystem } from '@/hooks/super-admin/dashboard/useDashboardSystem'

// ---------- MOCK HOOK ----------
jest.mock('@/hooks/super-admin/dashboard/useDashboardSystem', () => ({
  useDashboardSystem: jest.fn(),
}))

// ---------- MOCK UI COMPONENTS ----------
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton">Loading...</div>,
}))

describe('DashboardSystem', () => {
  const mockData = {
    data: {
      organization_statistics: {
        total: 10,
      },
      business_statistics: {
        by_type: {
          corporate: 6,
          education: 4,
        },
      },
    },
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should show skeleton when data is pending', () => {
    ;(useDashboardSystem as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: true,
      fetchStatus: 'fetching',
    })

    render(
      <DashboardSystem
        title="Total Organisations"
        icon={<span data-testid="icon" />}
      />
    )

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })

  it('should display total organisations count', () => {
    ;(useDashboardSystem as jest.Mock).mockReturnValue({
      data: mockData,
      isPending: false,
    })

    render(
      <DashboardSystem
        title="Total Organisations"
        icon={<span data-testid="icon" />}
      />
    )

    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('should display corporate organisations count for Businesses Orgs', () => {
    ;(useDashboardSystem as jest.Mock).mockReturnValue({
      data: mockData,
      isPending: false,
    })

    render(
      <DashboardSystem
        title="Businesses Orgs"
        icon={<span data-testid="icon" />}
      />
    )

    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('should display education organisations count for Educational Orgs', () => {
    ;(useDashboardSystem as jest.Mock).mockReturnValue({
      data: mockData,
      isPending: false,
    })

    render(
      <DashboardSystem
        title="Educational Orgs"
        icon={<span data-testid="icon" />}
      />
    )

    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('should fallback to provided value prop if title does not match', () => {
    ;(useDashboardSystem as jest.Mock).mockReturnValue({
      data: mockData,
      isPending: false,
    })

    render(
      <DashboardSystem
        title="Unknown Title"
        value={99}
        icon={<span data-testid="icon" />}
      />
    )

    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('should fallback to 0 when data is missing', () => {
    ;(useDashboardSystem as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: false,
    })

    render(
      <DashboardSystem
        title="Total Organisations"
        icon={<span data-testid="icon" />}
      />
    )

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should render icon', () => {
    ;(useDashboardSystem as jest.Mock).mockReturnValue({
      data: mockData,
      isPending: false,
    })

    render(
      <DashboardSystem
        title="Total Organisations"
        icon={<span data-testid="icon" />}
      />
    )

    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})
