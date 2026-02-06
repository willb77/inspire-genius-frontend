import { getLicenses } from '../licence.service'
import { api } from '@/lib/axios'

// Mock axios instance
jest.mock('@/lib/axios', () => ({
  api: {
    get: jest.fn(),
  },
}))

describe('getLicenses API', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should call API with default page and limit when params are not provided', async () => {
    ;(api.get as jest.Mock).mockResolvedValueOnce({
      data: {},
    })

    await getLicenses()

    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/v1/licenses/', {
      params: {
        page: 1,
        limit: 10,
      },
    })
  })

  it('should call API with provided page and limit params', async () => {
    ;(api.get as jest.Mock).mockResolvedValueOnce({
      data: {},
    })

    await getLicenses({ page: 2, limit: 20 })

    expect(api.get).toHaveBeenCalledWith('/v1/licenses/', {
      params: {
        page: 2,
        limit: 20,
      },
    })
  })

  it('should return licenses response on success', async () => {
    const mockResponse = {
      status: true,
      message: 'Success',
      data: {
        licenses: [
          {
            id: '1',
            organization_id: 'org-1',
            organization_name: 'Acme Corp',
            subscription_tier: 'premium',
            start_date: '2024-01-01',
            end_date: '2025-01-01',
            status: 'active',
            is_expiring_soon: false,
            days_until_expiry: 200,
            created_at: '2024-01-01',
            updated_at: '2024-01-02',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    }

    ;(api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    })

    const result = await getLicenses()

    expect(result).toEqual(mockResponse)
  })

  it('should handle empty licenses list', async () => {
    const mockResponse = {
      status: true,
      data: {
        licenses: [],
        total: 0,
        page: 1,
        limit: 10,
      },
    }

    ;(api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    })

    const result = await getLicenses()

    expect(result?.data?.licenses).toEqual([])
    expect(result?.data?.total).toBe(0)
  })

  it('should throw error if API call fails', async () => {
    const error = new Error('Network error')

    ;(api.get as jest.Mock).mockRejectedValueOnce(error)

    await expect(getLicenses()).rejects.toThrow('Network error')
  })
})
