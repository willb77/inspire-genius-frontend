/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { getCompanyUsers, getCompanyAnalytics, getCompanyDepartments, getCompanyCosts } from "../company-admin.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("company-admin.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([
    ["getCompanyUsers", getCompanyUsers, "/api/company/users"],
    ["getCompanyAnalytics", getCompanyAnalytics, "/api/company/analytics"],
    ["getCompanyDepartments", getCompanyDepartments, "/api/company/departments"],
    ["getCompanyCosts", getCompanyCosts, "/api/company/costs"],
  ] as const)("%s calls correct endpoint", async (_name, fn, url) => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await fn()
    expect(mockApi.get).toHaveBeenCalledWith(url)
  })
})
