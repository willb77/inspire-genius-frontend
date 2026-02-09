import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDocumentTrend } from '../useDocumentTrend'
import { getDocumentTrend } from '@/services/super-admin/dashboard/document-trend.service'

// Mock API service
jest.mock('@/services/super-admin/dashboard/document-trend.service', () => ({
  getDocumentTrend: jest.fn(),
}))

describe('useDocumentTrend hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // important for predictable tests
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

  it('should call getDocumentTrend API', async () => {
    ;(getDocumentTrend as jest.Mock).mockResolvedValueOnce({})

    const { result } = renderHook(() => useDocumentTrend(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(getDocumentTrend).toHaveBeenCalledTimes(1)
  })

  it('should return document trend data on success', async () => {
    const mockResponse = {
      status: true,
      message: 'Success',
      data: [
        {
          category_id: '1',
          category_name: 'Invoices',
          file_count: 12,
          display_name: 'Invoices',
        },
        {
          category_id: '2',
          category_name: 'Reports',
          file_count: 5,
          display_name: 'Reports',
        },
      ],
    }

    ;(getDocumentTrend as jest.Mock).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useDocumentTrend(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResponse)
  })

  it('should be in loading state initially', async () => {
    ;(getDocumentTrend as jest.Mock).mockResolvedValueOnce({})

    const { result } = renderHook(() => useDocumentTrend(), {
      wrapper: createWrapper(),
    })

    // initial state
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('should handle error state when API fails', async () => {
    const error = new Error('Network error')

    ;(getDocumentTrend as jest.Mock).mockRejectedValueOnce(error)

    const { result } = renderHook(() => useDocumentTrend(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
  })
})
