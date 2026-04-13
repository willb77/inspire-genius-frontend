/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { getDistributorPractitioners, getDistributorCredits, getDistributorTransactions, getDistributorTerritory } from "../distributor.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("distributor.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([
    ["getDistributorPractitioners", getDistributorPractitioners, "/api/distributor/practitioners"],
    ["getDistributorCredits", getDistributorCredits, "/api/distributor/credits"],
    ["getDistributorTransactions", getDistributorTransactions, "/api/distributor/transactions"],
    ["getDistributorTerritory", getDistributorTerritory, "/api/distributor/territory"],
  ] as const)("%s calls correct endpoint", async (_name, fn, url) => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await fn()
    expect(mockApi.get).toHaveBeenCalledWith(url)
  })
})
