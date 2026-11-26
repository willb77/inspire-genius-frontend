/**
 * TDS A4 — a practitioner sends a linked client's DISC or CliftonStrengths.
 *
 * The guards: the two calls hit the per-client coach routes (never the
 * person's own /v1/profile/me routes), confirm sends only the framework and
 * the reviewed rows, a refusal throws so the dialog can show the server's
 * words, and the import is offered only where the coach backend is deployed.
 */
const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn(), post: mockPost } }))
jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: jest.fn(),
  uploadToS3: jest.fn(),
  triggerProcessing: jest.fn(),
}))

type Svc = typeof import("../coachClient.service")
const env = (data: unknown) => ({ data: { status: true, data } })

describe("client assessment import (backend mode)", () => {
  let svc: Svc

  beforeAll(async () => {
    process.env.VITE_COACH_BACKEND = "true"
    jest.resetModules()
    svc = await import("../coachClient.service")
  })
  afterAll(() => {
    delete process.env.VITE_COACH_BACKEND
  })
  beforeEach(() => jest.clearAllMocks())

  it("is offered where the coach backend is deployed", () => {
    expect(svc.clientImportAvailable).toBe(true)
  })

  it("preview posts the framework and the file to the client's preview route", async () => {
    mockPost.mockResolvedValueOnce(env({ clientId: "c 1", framework: "DISC", filename: "d.csv", scores: [{ category: "DISC", dimension: "D", score_numeric: 70 }] }))
    const file = new File(["D,70"], "d.csv", { type: "text/csv" })
    const out = await svc.previewClientAssessmentImport("c 1", "DISC", file)
    const [url, form] = mockPost.mock.calls[0]
    expect(url).toBe("/v1/agents/coach/clients/c%201/assessments/import/preview")
    expect((form as FormData).get("framework")).toBe("DISC")
    expect((form as FormData).get("file")).toBe(file)
    expect(out).toEqual({ framework: "DISC", filename: "d.csv", scores: [{ category: "DISC", dimension: "D", score_numeric: 70 }] })
  })

  it("send posts only the framework and the reviewed rows to the client's confirm route", async () => {
    mockPost.mockResolvedValueOnce(env({ assessmentId: "a1", framework: "CLIFTON", state: "sent", scoreCount: 1 }))
    const scores = [{ category: "Themes", dimension: "Achiever", score_text: "Achiever", rank: 1 }]
    const out = await svc.sendClientAssessmentImport("c1", { framework: "CLIFTON", scores })
    expect(mockPost).toHaveBeenCalledWith(
      "/v1/agents/coach/clients/c1/assessments/import/confirm",
      { framework: "CLIFTON", scores },
    )
    expect(out.state).toBe("sent")
  })

  it("a refusal throws, carrying the server's response", async () => {
    const err = { response: { status: 409, data: { detail: "This client has not linked an InspiresGenius account yet" } } }
    mockPost.mockRejectedValueOnce(err)
    await expect(svc.sendClientAssessmentImport("c1", { framework: "DISC", scores: [] })).rejects.toBe(err)
  })

  it("a send the server did not confirm is a failure, not a success", async () => {
    mockPost.mockResolvedValueOnce({ data: { status: true } })
    await expect(svc.sendClientAssessmentImport("c1", { framework: "DISC", scores: [] })).rejects.toThrow()
  })
})

describe("client assessment import (stub mode)", () => {
  it("is not offered where the coach backend is not deployed", async () => {
    delete process.env.VITE_COACH_BACKEND
    jest.resetModules()
    const svc: Svc = await import("../coachClient.service")
    expect(svc.clientImportAvailable).toBe(false)
  })
})
