/** MMLR-5: the card's service calls hit the growth routes the server mounts. */
const api = { get: jest.fn(), post: jest.fn() }
jest.mock("@/lib/agentApi", () => ({ getApi: () => api }))

import {
  actOnMyLinkRequest,
  createLinkRequest,
  getMyLinkRequests,
  leaveTeam,
} from "@/services/manager/development/growthService"

beforeEach(() => jest.clearAllMocks())

it("reads the member's own list", () => {
  getMyLinkRequests()
  expect(api.get).toHaveBeenCalledWith("/v1/growth/link-requests/mine")
})

it("asks with the email and the ticked categories", () => {
  createLinkRequest({ managerEmail: "lead@example.com", categories: [] })
  expect(api.post).toHaveBeenCalledWith("/v1/growth/link-requests", { managerEmail: "lead@example.com", categories: [] })
})

it.each(["withdraw", "share"] as const)("%s acts on one request", (action) => {
  actOnMyLinkRequest("r1", action)
  expect(api.post).toHaveBeenCalledWith(`/v1/growth/link-requests/r1/${action}`)
})

it("leaves the team", () => {
  leaveTeam()
  expect(api.post).toHaveBeenCalledWith("/v1/growth/team/leave")
})
