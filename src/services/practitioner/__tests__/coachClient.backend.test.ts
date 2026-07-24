/**
 * Backend-mode tests for coachClient.service — the flag-on branch
 * (VITE_COACH_BACKEND === "true") that calls /v1/agents/coach/* via agentApi.
 *
 * jest rewrites import.meta.env → process.env (see jest.vite-env-transform), and
 * USE_COACH_BACKEND is read at module load — so we set the env var, then import
 * the service dynamically after resetModules. The stub-mode branch is covered by
 * coachClient.service.test.ts (flag unset).
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({ agentApi: { get: mockGet, post: mockPost } }))

type Svc = typeof import("../coachClient.service")

const env = (data: unknown) => ({ data: { status: true, data } })

describe("coachClient.service (backend mode)", () => {
  let svc: Svc

  beforeAll(async () => {
    process.env.VITE_COACH_BACKEND = "true"
    jest.resetModules()
    svc = await import("../coachClient.service")
  })

  afterAll(() => {
    delete process.env.VITE_COACH_BACKEND
  })

  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  test("listClients calls the real endpoint and maps rows", async () => {
    mockGet.mockResolvedValueOnce(
      env([
        { client_id: "u1", first_name: "Ada", last_name: "Lovelace", email: "ada@x.com", org: "Analytical", assessment_status: "ready" },
      ]),
    )
    const clients = await svc.listClients()
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/coach/clients")
    expect(clients).toEqual([
      expect.objectContaining({ id: "u1", name: "Ada Lovelace", email: "ada@x.com", org: "Analytical", prismStatus: "ready", sessions: 0, resourcesPresent: 0 }),
    ])
  })

  test("getClient maps a detail with all resource keys defaulting false", async () => {
    mockGet.mockResolvedValueOnce(env({ client_id: "u1", first_name: "Ada", assessment_status: "intake-pending" }))
    const detail = await svc.getClient("u1")
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/coach/clients/u1")
    expect(detail?.id).toBe("u1")
    expect(detail?.prismStatus).toBe("none")
    expect(Object.values(detail!.resources).every((v) => v === false)).toBe(true)
    expect(detail?.sessionsList).toEqual([])
  })

  test("getClient returns null when the backend rejects (403/404)", async () => {
    mockGet.mockRejectedValueOnce(new Error("403"))
    const detail = await svc.getClient("forbidden")
    expect(detail).toBeNull()
  })

  test("addClient posts and maps the created client", async () => {
    mockPost.mockResolvedValueOnce(env({ client_id: "new1", first_name: "New", email: "new@x.com", org: "Acme" }))
    const client = await svc.addClient({ name: "New Person", email: "new@x.com", org: "Acme" })
    expect(mockPost).toHaveBeenCalledWith("/v1/agents/coach/clients", { name: "New Person", email: "new@x.com", org: "Acme" })
    expect(client).toEqual(expect.objectContaining({ id: "new1", email: "new@x.com", org: "Acme" }))
  })

  test("bulkImportClients posts rows and returns the imported count", async () => {
    mockPost.mockResolvedValueOnce(env({ imported: 3 }))
    const result = await svc.bulkImportClients([{ name: "A", email: "a@x.com" }])
    expect(mockPost).toHaveBeenCalledWith("/v1/agents/coach/clients/import", { rows: [{ name: "A", email: "a@x.com" }] })
    expect(result).toEqual({ imported: 3 })
  })

  test("listSchedule maps backend sessions to schedule entries", async () => {
    mockGet.mockResolvedValueOnce(
      env([{ session_id: "s1", client_id: "u1", starts_at: "2026-08-01T15:00:00+00:00", duration_min: 30, topic: "Kickoff" }]),
    )
    const entries = await svc.listSchedule()
    expect(entries).toEqual([
      { id: "s1", clientName: "u1", startsAt: "2026-08-01T15:00:00+00:00", durationMin: 30, topic: "Kickoff" },
    ])
  })

  test("createSessionsBulk posts and reports created count, no client-side email", async () => {
    mockPost.mockResolvedValueOnce(
      env({ created: 1, sessions: [{ session_id: "s1", client_id: "u1", starts_at: "2026-08-01T15:00:00+00:00", duration_min: 30, topic: "K" }] }),
    )
    const result = await svc.createSessionsBulk({
      clientIds: ["u1", "not-owned"],
      startsAt: "2026-08-01T15:00:00+00:00",
      durationMin: 30,
      spacingMin: 0,
      topic: "K",
      message: "",
      sendInvites: true,
    })
    expect(mockPost).toHaveBeenCalledWith("/v1/agents/coach/schedule/sessions", expect.objectContaining({ clientIds: ["u1", "not-owned"] }))
    expect(result.created).toBe(1)
    expect(result.emailed).toBe(0)
    expect(result.entries).toHaveLength(1)
  })

  test("getCreditsSummary maps balances and keeps PUK label", async () => {
    mockGet.mockResolvedValueOnce(env({ balance: 0, allocated: 0, used: 0, provisioned: false }))
    const summary = await svc.getCreditsSummary()
    expect(summary).toEqual({ balance: 0, allocated: 0, used: 0, currency: "PUK" })
  })

  test("getClientUsage maps usage rows", async () => {
    mockGet.mockResolvedValueOnce(env([{ clientId: "u1", name: "Ada Lovelace", sessions: 2, creditsUsed: 0 }]))
    const usage = await svc.getClientUsage()
    expect(usage).toEqual([{ clientName: "Ada Lovelace", sessions: 2, creditsUsed: 0, lastActive: "" }])
  })
})
