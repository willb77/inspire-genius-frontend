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
    ["getUserAnalytics", getUserAnalytics, "/v1/analytics/user"],
    ["getManagerAnalytics", getManagerAnalytics, "/v1/analytics/manager"],
    ["getCompanyAnalytics", getCompanyAnalytics, "/v1/analytics/company"],
    ["getPractitionerAnalytics", getPractitionerAnalytics, "/v1/analytics/practitioner"],
    ["getDistributorAnalytics", getDistributorAnalytics, "/v1/analytics/distributor"],
    ["getPlatformAnalytics", getPlatformAnalytics, "/v1/analytics/platform"],
  ] as const)("%s calls correct endpoint", async (_name, fn, url) => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await fn()
    expect(mockApi.get).toHaveBeenCalledWith(url)
  })
})
