/**
 * TDS-P1 (a): a roadmap status change goes to the route growth-service has.
 *
 * It PATCHed `/members/{id}/milestones` with the id in the body; growth only
 * routes `PATCH /members/{id}/milestones/{milestone_id}`, so every change was a
 * 405 that the roadmap never reported.
 */
const patch = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ patch }) }))

import { updateMilestone } from "../growthService"

beforeEach(() => {
  patch.mockReset().mockResolvedValue({ data: { data: {} } })
})

it("puts the milestone id in the path and keeps it out of the body", async () => {
  await updateMilestone("m1", { milestoneId: "ms-7", status: "in_progress" })
  expect(patch).toHaveBeenCalledWith("/v1/growth/members/m1/milestones/ms-7", { status: "in_progress" })
})

it("sends only the fields given", async () => {
  await updateMilestone("m1", { milestoneId: "ms-7", status: "blocked", blockedReason: "Waiting on IT" })
  expect(patch).toHaveBeenCalledWith("/v1/growth/members/m1/milestones/ms-7", {
    status: "blocked",
    blockedReason: "Waiting on IT",
  })
})

it("encodes an id that is not URL-safe", async () => {
  await updateMilestone("m1", { milestoneId: "a/b", status: "done" })
  expect(patch).toHaveBeenCalledWith("/v1/growth/members/m1/milestones/a%2Fb", { status: "done" })
})
