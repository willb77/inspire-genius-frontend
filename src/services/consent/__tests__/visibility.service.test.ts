/**
 * The subject's consent calls (Goals offering, Phase 3).
 *
 * Properties under test: every call goes to the AGENT ENGINE under
 * `/v1/agents/consent/visibility`; nothing accepts a subject id (the backend
 * scopes to the token); an empty envelope throws rather than reading as
 * "nobody to share with"; a lookup posts the exact address it was given.
 */
import {
  extendGrant,
  getMyGrants,
  getPeople,
  lookupPerson,
  offerAccess,
  respondToRequest,
  revokeGrant,
} from "../visibility.service"

const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}))

beforeEach(() => jest.clearAllMocks())

it("reads people from the agent engine and takes no subject id", async () => {
  mockGet.mockResolvedValue({ data: { status: true, data: { people: [], sources: { requesters: "ok" } } } })
  const out = await getPeople()
  expect(mockGet).toHaveBeenCalledWith("/v1/agents/consent/visibility/people")
  expect(out.sources.requesters).toBe("ok")
  expect(getPeople.length).toBe(0)
})

it("throws on an empty envelope instead of returning an empty list", async () => {
  mockGet.mockResolvedValue({ data: {} })
  await expect(getPeople()).rejects.toThrow(/empty envelope/)
  mockGet.mockResolvedValue({ data: { status: false, data: { people: [] } } })
  await expect(getPeople()).rejects.toThrow(/empty envelope/)
})

it("looks up ONE exact email, trimmed, never a search parameter", async () => {
  mockPost.mockResolvedValue({ data: { status: true, data: { userId: "u2", displayName: "M", email: "m@example.com" } } })
  const out = await lookupPerson("  M@Example.com ")
  expect(mockPost).toHaveBeenCalledWith("/v1/agents/consent/visibility/people/lookup", { email: "M@Example.com" })
  expect(out.userId).toBe("u2")
})

it("offers with the grantee and categories, and only sends termDays when given", async () => {
  mockPost.mockResolvedValue({ data: { status: true, data: { id: "g1", status: "granted", mode: "offered" } } })
  await offerAccess({ granteeUserId: "u2", categories: { goals: true } })
  expect(mockPost).toHaveBeenLastCalledWith("/v1/agents/consent/visibility/offer", {
    granteeUserId: "u2",
    categories: { goals: true },
  })
  await offerAccess({ granteeUserId: "u2", categories: { goals: true }, termDays: 30 })
  expect(mockPost).toHaveBeenLastCalledWith("/v1/agents/consent/visibility/offer", {
    granteeUserId: "u2",
    categories: { goals: true },
    termDays: 30,
  })
})

it("extends, revokes and responds by grant id on the agent engine", async () => {
  mockPost.mockResolvedValue({ data: { status: true, data: { id: "g1", status: "granted" } } })
  await extendGrant("g1")
  expect(mockPost).toHaveBeenLastCalledWith("/v1/agents/consent/visibility/g1/extend", { days: 365 })
  await revokeGrant("g1")
  expect(mockPost).toHaveBeenLastCalledWith("/v1/agents/consent/visibility/g1/revoke")
  await respondToRequest("g1", true, { goals: true })
  expect(mockPost).toHaveBeenLastCalledWith("/v1/agents/consent/visibility/g1/respond", {
    approve: true,
    categories: { goals: true },
  })
  await respondToRequest("g1", false)
  expect(mockPost).toHaveBeenLastCalledWith("/v1/agents/consent/visibility/g1/respond", { approve: false })
})

it("reads my grants as a list", async () => {
  mockGet.mockResolvedValue({ data: { status: true, data: [{ id: "g1", status: "pending" }] } })
  const rows = await getMyGrants()
  expect(mockGet).toHaveBeenCalledWith("/v1/agents/consent/visibility/my-grants")
  expect(rows).toHaveLength(1)
})
