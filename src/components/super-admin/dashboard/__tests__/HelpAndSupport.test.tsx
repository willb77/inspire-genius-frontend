import { render, screen, fireEvent } from '@testing-library/react'
import HelpAndSupport from '../HelpAndSupport'
import { useIssues } from '@/hooks/help/useIssues'

/* ------------------------------------------------------------------
 * MOCK HOOK
 * ------------------------------------------------------------------ */
jest.mock('@/hooks/help/useIssues', () => ({
  useIssues: jest.fn(),
}))

/* ------------------------------------------------------------------
 * MOCK ROUTER
 * ------------------------------------------------------------------ */
const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

/* ------------------------------------------------------------------
 * MOCK UI COMPONENTS
 * ------------------------------------------------------------------ */
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

/* ------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------ */
describe('HelpAndSupport', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading skeletons when pending', () => {
    ;(useIssues as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    })

    render(<HelpAndSupport />)

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('should render error message when API fails', () => {
    ;(useIssues as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    })

    render(<HelpAndSupport />)

    expect(
      screen.getByText('Failed to load issues. Please try again later.')
    ).toBeInTheDocument()
  })

  it('should render empty state when no issues are found', () => {
    ;(useIssues as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: {
          items: [],
        },
      },
    })

    render(<HelpAndSupport />)

    expect(
      screen.getByText('No recent issues found.')
    ).toBeInTheDocument()
  })

  it('should render issues list when data is available', () => {
    ;(useIssues as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: {
          items: [
            {
              id: '1',
              subject: 'Login issue',
              description: 'Unable to login to the system',
              reported_by_name: 'John Doe',
              status: 'open',
              priority: 'high',
            },
          ],
        },
      },
    })

    render(<HelpAndSupport />)

    expect(screen.getByText('Login issue')).toBeInTheDocument()
    expect(
      screen.getByText('Unable to login to the system')
    ).toBeInTheDocument()
    expect(screen.getByText('By: John Doe')).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('should navigate to issues page when "View all" is clicked', () => {
    ;(useIssues as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: {
          items: [],
        },
      },
    })

    render(<HelpAndSupport />)

    fireEvent.click(screen.getByText('View all'))

    expect(mockNavigate).toHaveBeenCalledWith(
      '/super-admin/dashboard/issues'
    )
  })

  it('should render title correctly', () => {
    ;(useIssues as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: {
          items: [],
        },
      },
    })

    render(<HelpAndSupport />)

    expect(screen.getByText('Help & Support')).toBeInTheDocument()
  })
})
