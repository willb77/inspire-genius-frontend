/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  getUserAnalytics,
  getManagerAnalytics,
  getCompanyAnalytics,
  getPractitionerAnalytics,
  getDistributorAnalytics,
  getPlatformAnalytics,
} from "../analytics.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("analytics.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([
    ["getUserAnalytics", getUserAnalytics, "/api/analytics/user"],
    ["getManagerAnalytics", getManagerAnalytics, "/api/analytics/manager"],
    ["getCompanyAnalytics", getCompanyAnalytics, "/api/analytics/company"],
    ["getPractitionerAnalytics", getPractitionerAnalytics, "/api/analytics/practitioner"],
    ["getDistributorAnalytics", getDistributorAnalytics, "/api/analytics/distributor"],
    ["getPlatformAnalytics", getPlatformAnalytics, "/api/analytics/platform"],
  ] as const)("%s calls correct endpoint", async (_name, fn, url) => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await fn()
    expect(mockApi.get).toHaveBeenCalledWith(url)
  })
})
