/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { fitService } from "../fit.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("fitService", () => {
  beforeEach(() => jest.clearAllMocks())

  test("getMatches GETs /v1/blueprint/fit/matches", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fitService.getMatches()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/fit/matches")
  })

  test("getDetail GETs /v1/blueprint/fit/{jobId}", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { jobId: "j1" } } })
    await fitService.getDetail("j1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/fit/j1")
  })

  test("getDetail encodes the job id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await fitService.getDetail("a/b c")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/fit/a%2Fb%20c")
  })

  test("getPathway GETs /v1/blueprint/fit/pathway", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await fitService.getPathway()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/fit/pathway")
  })
})
