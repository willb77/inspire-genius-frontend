import { getDashboardSystem } from '../dashboard-system.service'
import { api } from '@/lib/axios'

// Mock axios instance
jest.mock('@/lib/axios', () => ({
  api: {
    get: jest.fn(),
  },
}))

describe('getDashboardSystem API', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should call the dashboard system API with correct endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {},
    })

    await getDashboardSystem()

    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/v1/dashboard/system')
  })

  it('should return dashboard system data on success', async () => {
    const mockResponse = {
      message: 'Success',
      status: true,
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

    ;(api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    })

    const result = await getDashboardSystem()

    expect(result).toEqual(mockResponse)
  })

  it('should throw error if API call fails', async () => {
    const mockError = new Error('Network error')

    ;(api.get as jest.Mock).mockRejectedValueOnce(mockError)

    await expect(getDashboardSystem()).rejects.toThrow('Network error')
  })
})
