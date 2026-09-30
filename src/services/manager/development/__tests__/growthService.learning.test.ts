/**
 * The two TDS-4a calls the surface was missing: closing a gap, and writing
 * progress on a learning item.
 */
const post = jest.fn()
const patch = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post, patch }) }))

import { closeGap, updateLearningItem, updateMyLearningItem } from "../growthService"

beforeEach(() => {
  post.mockReset().mockResolvedValue({ data: { data: {} } })
  patch.mockReset().mockResolvedValue({ data: { data: {} } })
})

it("closes a gap on the member-scoped close route, so a guessed id can't be closed", async () => {
  await closeGap("m1", "gap-7")
  expect(post).toHaveBeenCalledWith("/v1/growth/members/m1/gaps/gap-7/close")
})

it("writes progress on one item and sends only the fields given", async () => {
  await updateLearningItem("m1", "li-3", { progress: 60 })
  expect(patch).toHaveBeenCalledWith("/v1/growth/members/m1/learning-items/li-3", { progress: 60 })
  await updateLearningItem("m1", "li-3", { status: "complete", progress: 100 })
  expect(patch).toHaveBeenLastCalledWith("/v1/growth/members/m1/learning-items/li-3", {
    status: "complete",
    progress: 100,
  })
})

it("has a self-scoped counterpart that takes no member id at all", async () => {
  await updateMyLearningItem("li-3", { quizScore: 90 })
  expect(patch).toHaveBeenCalledWith("/v1/growth/me/learning-items/li-3", { quizScore: 90 })
})
