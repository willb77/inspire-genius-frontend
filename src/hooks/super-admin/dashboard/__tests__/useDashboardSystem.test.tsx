import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDashboardSystem } from '../useDashboardSystem'
import { getDashboardSystem } from '@/services/super-admin/dashboard/dashboard-system.service'

// Mock API service
jest.mock('@/services/super-admin/dashboard/dashboard-system.service', () => ({
  getDashboardSystem: jest.fn(),
}))

describe('useDashboardSystem hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // important for tests
        },
      },
    })

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should call getDashboardSystem API', async () => {
    ;(getDashboardSystem as jest.Mock).mockResolvedValueOnce({})

    const { result } = renderHook(() => useDashboardSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(getDashboardSystem).toHaveBeenCalledTimes(1)
  })

  it('should return dashboard system data on success', async () => {
    const mockResponse = {
      status: true,
      message: 'Success',
      data: {
        organization_statistics: {
          total: 10,
          active: 7,
          inactive: 3,
        },
        business_statistics: {
          total: 5,
          active: 4,
          inactive: 1,
          by_type: {
            corporate: 3,
            education: 2,
          },
        },
      },
    }

    ;(getDashboardSystem as jest.Mock).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useDashboardSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResponse)
  })

  it('should be in loading state initially', async () => {
    ;(getDashboardSystem as jest.Mock).mockResolvedValueOnce({})

    const { result } = renderHook(() => useDashboardSystem(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('should handle error state when API fails', async () => {
    const error = new Error('Network error')

    ;(getDashboardSystem as jest.Mock).mockRejectedValueOnce(error)

    const { result } = renderHook(() => useDashboardSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
  })
})
