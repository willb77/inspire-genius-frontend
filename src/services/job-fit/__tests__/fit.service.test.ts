/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { fitService } from "../fit.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn() },
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

  // ── Decision D4 — scoring-method choice ──
  test("gap method sends no ?method (bare GET, backend default)", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fitService.getMatches("gap")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/fit/matches")
  })

  test("closeness method sends ?method=closeness", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fitService.getMatches("closeness")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/fit/matches", {
      params: { method: "closeness" },
    })
  })

  test("getDetail forwards the closeness method", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { jobId: "j1" } } })
    await fitService.getDetail("j1", "closeness")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/fit/j1", {
      params: { method: "closeness" },
    })
  })

  // ── JS-5 — Fit a JD scores the draft through the self-scoped route ──
  test("scoreTarget POSTs the target body to /v1/blueprint/fit/target", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { jobId: "" } } })
    const body = {
      target: [
        { category: "behavior" as const, dimensionId: 1, dimensionName: "Innovating", finalBenchmarkPercent: 72, interpretation: "very-high" },
      ],
      roleTitle: "Delivery coordinator",
    }
    await fitService.scoreTarget(body)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/blueprint/fit/target", body)
  })

  test("scoreTarget never goes near the vector-only /v1/targets/score", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await fitService.scoreTarget({ target: [] })
    const [url] = mockApi.post.mock.calls[0]
    expect(url).not.toContain("/v1/targets")
  })

  // ── JS-3 — fit history ──
  test("getHistory GETs /v1/blueprint/fit/history", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fitService.getHistory()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/fit/history")
  })

  test("getSnapshot GETs the snapshot route with the id encoded", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { id: "a b" } } })
    await fitService.getSnapshot("a b")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/fit/history/snapshot/a%20b")
  })

  test("saveSnapshot POSTs the body to /v1/blueprint/fit/history", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { id: "s1" } } })
    const body = { jobId: "j1", roleTitle: "Ops", fitScore: 70, payload: { overview: "x" } }
    await fitService.saveSnapshot(body)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/blueprint/fit/history", body)
  })
})
