/**
 * TDS U12 (CSA #2210): the coach PRISM import posts the CSV to the coach route
 * named by the page's client id, and sends no user id: the server resolves the
 * client's own account from the link. Off where the coach backend is not deployed.
 */
const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn(), post: mockPost } }))

type Svc = typeof import("../coachClient.service")

function csv() {
  return new File(["Dimension,Score\n"], "prism.csv", { type: "text/csv" })
}

describe("importClientPrismCsv (backend mode)", () => {
  let svc: Svc

  beforeAll(async () => {
    process.env.VITE_COACH_BACKEND = "true"
    jest.resetModules()
    svc = await import("../coachClient.service")
  })

  afterAll(() => {
    delete process.env.VITE_COACH_BACKEND
  })

  beforeEach(() => mockPost.mockReset())

  test("posts the file, and only the file, to the client's coach route", async () => {
    mockPost.mockResolvedValueOnce({
      data: { status: true, data: { clientId: "cl 1", assessmentId: "a-1", framework: "PRISM", scoreCount: 40, typingCount: 2 } },
    })
    const file = csv()
    const out = await svc.importClientPrismCsv("cl 1", file)

    expect(mockPost).toHaveBeenCalledTimes(1)
    const [url, body] = mockPost.mock.calls[0]
    expect(url).toBe("/v1/agents/coach/clients/cl%201/prism/import")
    expect(body).toBeInstanceOf(FormData)
    const form = body as FormData
    expect(form.get("file")).toBe(file)
    expect(form.has("user_id")).toBe(false)
    expect(Array.from(form.keys())).toEqual(["file"])
    expect(out).toEqual({ assessmentId: "a-1", scoreCount: 40, typingCount: 2 })
  })

  test("a reply that confirms nothing is a failure, not a success", async () => {
    mockPost.mockResolvedValueOnce({ data: { status: true, data: {} } })
    await expect(svc.importClientPrismCsv("cl-1", csv())).rejects.toThrow("did not confirm")
  })

  test("a refusal propagates, so the dialog can show the server's reason", async () => {
    const err = Object.assign(new Error("409"), { response: { status: 409, data: { detail: "not linked" } } })
    mockPost.mockRejectedValueOnce(err)
    await expect(svc.importClientPrismCsv("cl-1", csv())).rejects.toBe(err)
  })
})

describe("importClientPrismCsv (coach backend not deployed)", () => {
  test("refuses without calling anything", async () => {
    delete process.env.VITE_COACH_BACKEND
    jest.resetModules()
    const svc: Svc = await import("../coachClient.service")
    mockPost.mockReset()
    await expect(svc.importClientPrismCsv("cl-1", csv())).rejects.toThrow("not available here")
    expect(mockPost).not.toHaveBeenCalled()
  })
})
