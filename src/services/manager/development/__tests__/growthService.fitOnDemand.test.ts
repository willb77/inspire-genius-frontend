/**
 * TS-4b: the two on-demand calls go to the routes growth-service has, and the
 * score carries the role ONLY. The server takes the viewer from the session;
 * a viewer sent from here would be refused (the body forbids extra fields).
 */
const get = jest.fn()
const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ get, post }) }))

import { getMemberFitOnDemandRoles, scoreMemberFitOnDemand } from "../growthService"

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: { data: {} } })
  post.mockReset().mockResolvedValue({ data: { data: {} } })
})

it("reads the roles for one member", async () => {
  await getMemberFitOnDemandRoles("member-0001")
  expect(get.mock.calls).toEqual([["/v1/growth/members/member-0001/fit-on-demand/roles"]])
  expect(post).not.toHaveBeenCalled()
})

it("scores with the member in the path and only the role in the body", async () => {
  await scoreMemberFitOnDemand("member-0001", "job-b")
  expect(post.mock.calls).toEqual([["/v1/growth/members/member-0001/fit-on-demand", { jobId: "job-b" }]])
  expect(get).not.toHaveBeenCalled()
})
