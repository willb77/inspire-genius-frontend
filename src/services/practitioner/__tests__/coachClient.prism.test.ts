/**
 * Client PRISM — the reader that answers "shared, or why not".
 *
 * The guards: scores only ever come back for `shared`, a failed call throws
 * (so the page shows a failure, not an empty profile), and stub mode never
 * calls the backend at all.
 */
const mockGet = jest.fn()
jest.mock("@/lib/agentApi", () => ({ agentApi: { get: mockGet, post: jest.fn() } }))
jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: jest.fn(),
  uploadToS3: jest.fn(),
  triggerProcessing: jest.fn(),
}))

type Svc = typeof import("../coachClient.service")
const env = (data: unknown) => ({ data: { status: true, data } })

describe("getClientPrism (backend mode)", () => {
  let svc: Svc

  beforeAll(async () => {
    process.env.VITE_COACH_BACKEND = "true"
    jest.resetModules()
    svc = await import("../coachClient.service")
  })
  afterAll(() => { delete process.env.VITE_COACH_BACKEND })
  beforeEach(() => jest.clearAllMocks())

  it("calls the per-client prism route", async () => {
    mockGet.mockResolvedValueOnce(env({ state: "not_shared", prism: null }))
    await svc.getClientPrism("c 1")
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/coach/clients/c%201/prism")
  })

  it("returns colours and the assessed date when shared", async () => {
    mockGet.mockResolvedValueOnce(env({
      state: "shared",
      prism: { colours: { Gold: 61, Green: 72.5, Blue: 40, Red: 55 }, assessedAt: "2026-09-01" },
    }))
    await expect(svc.getClientPrism("c1")).resolves.toEqual({
      state: "shared",
      colours: { Gold: 61, Green: 72.5, Blue: 40, Red: 55 },
      assessedAt: "2026-09-01",
    })
  })

  it("never carries scores on a state that is not shared", async () => {
    mockGet.mockResolvedValueOnce(env({
      state: "not_shared",
      prism: { colours: { Gold: 99 }, assessedAt: "2026-09-01" },
    }))
    await expect(svc.getClientPrism("c1")).resolves.toEqual({
      state: "not_shared", colours: null, assessedAt: null,
    })
  })

  it("reads a missing state as unavailable, never as an empty profile", async () => {
    mockGet.mockResolvedValueOnce(env({}))
    await expect(svc.getClientPrism("c1")).resolves.toMatchObject({ state: "unavailable" })
  })

  it("throws on a failed call so the page can say so", async () => {
    mockGet.mockRejectedValueOnce(new Error("503"))
    await expect(svc.getClientPrism("c1")).rejects.toThrow("503")
  })
})

describe("getClientPrism (stub mode)", () => {
  it("returns null and calls nothing", async () => {
    jest.clearAllMocks()
    delete process.env.VITE_COACH_BACKEND
    jest.resetModules()
    const svc: Svc = await import("../coachClient.service")
    await expect(svc.getClientPrism("c1")).resolves.toBeNull()
    expect(mockGet).not.toHaveBeenCalled()
  })
})
