/**
 * The Phase 4 growth calls: reviews, the review body, notes about a goal.
 */
const post = jest.fn()
const get = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post, get }) }))

import {
  createCoachingNote,
  getGoalReviews,
  getMyGoalReviews,
  ratifyGoal,
} from "../growthService"

beforeEach(() => {
  post.mockReset().mockResolvedValue({ data: { data: {} } })
  get.mockReset().mockResolvedValue({ data: { data: {} } })
})

it("ratifyGoal sends ratified + comment, defaulting to a ratification", async () => {
  await ratifyGoal("g1", "Strong.")
  expect(post).toHaveBeenCalledWith("/v1/growth/goals/g1/ratify", { ratified: true, comment: "Strong." })
  await ratifyGoal("g1", undefined, false)
  expect(post).toHaveBeenLastCalledWith("/v1/growth/goals/g1/ratify", { ratified: false, comment: "" })
})

it("reads the coach-side and self-scoped review lists from their routes", async () => {
  await getGoalReviews("m1")
  expect(get).toHaveBeenCalledWith("/v1/growth/members/m1/goal-reviews")
  await getMyGoalReviews()
  expect(get).toHaveBeenLastCalledWith("/v1/growth/me/goal-reviews")
})

it("a note about a goal posts to the member's notes with goalId set", async () => {
  await createCoachingNote("m1", { kind: "plan", body: "x", goalId: "g1", source: "manual" })
  expect(post).toHaveBeenCalledWith("/v1/growth/members/m1/notes", {
    kind: "plan", body: "x", goalId: "g1", source: "manual",
  })
})
