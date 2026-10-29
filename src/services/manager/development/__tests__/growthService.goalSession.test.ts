/**
 * The goal-session body. growth-service's `GoalSessionBody` reads `mode`; this
 * sent `{ action }` until 2026-10-29, which Pydantic dropped, so every call was
 * recorded as "invite" whatever was asked.
 */
const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post }) }))

import { postGoalSession } from "../growthService"

beforeEach(() => post.mockReset().mockResolvedValue({ data: { data: {} } }))

it.each(["invite", "resume"] as const)("sends mode=%s, the field the server reads", async (mode) => {
  await postGoalSession("m1", mode)
  expect(post).toHaveBeenCalledWith("/v1/growth/members/m1/goal-session", { mode })
})
