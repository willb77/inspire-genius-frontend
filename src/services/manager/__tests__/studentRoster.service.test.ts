/**
 * Roster service.
 *
 * Two properties matter here and neither is about happy-path parsing:
 *
 *  1. It calls the AGENT ENGINE, not the monolith. `/v1/agents/roster` exists
 *     only behind the agent-engine's API Gateway integration; sending it to the
 *     monolith `api` instance yields a 404 that a caller would render as an
 *     empty roster.
 *  2. It never accepts a manager id. The backend resolves the manager from the
 *     token, and a client-side `managerId` argument would be the other half of
 *     an authorization bypass that looks like an ordinary parameter.
 */

import { getStudentRoster, requestStudentAccess } from "../studentRoster.service"

const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}))

beforeEach(() => jest.clearAllMocks())

it("calls the agent-engine roster path", async () => {
  mockGet.mockResolvedValue({ data: { status: true, data: { students: [] } } })
  await getStudentRoster()
  expect(mockGet).toHaveBeenCalledWith("/v1/agents/roster/students")
})

it("takes no arguments — there is no manager id to pass", () => {
  // `length` is the count of declared parameters. If somebody adds a
  // `managerId` argument, this fails and the reviewer has to justify it.
  expect(getStudentRoster.length).toBe(0)
})

it("throws on an empty envelope instead of returning an empty roster", async () => {
  mockGet.mockResolvedValue({ data: { status: true } })
  await expect(getStudentRoster()).rejects.toThrow(/returned no data/i)
})

it("defaults a missing students array rather than crashing the page", async () => {
  mockGet.mockResolvedValue({
    data: { data: { rosterEmptyReason: "no_direct_reports", viewerProfileResolved: true } },
  })
  const out = await getStudentRoster()
  expect(out.students).toEqual([])
  expect(out.rosterEmptyReason).toBe("no_direct_reports")
})

it("passes a request through to the consent endpoint", async () => {
  mockPost.mockResolvedValue({ data: {} })
  await requestStudentAccess({
    studentUserId: "u-amy",
    categories: { prism: true },
    reason: "Termly check-in",
  })
  expect(mockPost).toHaveBeenCalledWith("/v1/agents/consent/visibility/request", {
    studentUserId: "u-amy",
    categories: { prism: true },
    reason: "Termly check-in",
  })
})
