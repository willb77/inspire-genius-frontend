import { getDocumentTrend } from '../document-trend.service'
import { api } from '@/lib/axios'

// Mock axios instance
jest.mock('@/lib/axios', () => ({
  api: {
    get: jest.fn(),
  },
}))

describe('getDocumentTrend API', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should call the document trend API with correct endpoint', async () => {
    ;(api.get as jest.Mock).mockResolvedValueOnce({
      data: {},
    })

    await getDocumentTrend()

    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/v1/dashboard/documents/count')
  })

  it('should return document trend data on success', async () => {
    const mockResponse = {
      message: 'Success',
      status: true,
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

    ;(api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    })

    const result = await getDocumentTrend()

    expect(result).toEqual(mockResponse)
  })

  it('should handle empty data array', async () => {
    const mockResponse = {
      status: true,
      data: [],
    }

    ;(api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    })

    const result = await getDocumentTrend()

    expect(result?.data).toEqual([])
  })

  it('should throw error if API call fails', async () => {
    const mockError = new Error('Network error')

    ;(api.get as jest.Mock).mockRejectedValueOnce(mockError)

    await expect(getDocumentTrend()).rejects.toThrow('Network error')
  })
})
