import {
  getMyTargets,
  getRoadmap,
  makeTarget,
  rebuildRoadmap,
  removeTarget,
} from "@/services/goals/targets.service"
import { getGoalTargetsEnabled } from "@/services/switches/goalTargets.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))
const get = agentApi.get as jest.Mock
const post = agentApi.post as jest.Mock
const del = agentApi.delete as jest.Mock
const env = (data: unknown) => ({ data: { status: true, data } })

beforeEach(() => jest.clearAllMocks())

test("make: posts to the agent engine's own prefix and unwraps the envelope", async () => {
  post.mockResolvedValueOnce(env({ goal: { goalId: "g" } }))
  const body = { jobId: "j1", fitSnapshot: { fitScore: 70 } }
  await expect(makeTarget(body)).resolves.toEqual({ goal: { goalId: "g" } })
  expect(post).toHaveBeenCalledWith("/v1/agents/goal-targets", body)
})

test("reads, rebuild and remove are per goal, id encoded", async () => {
  get.mockResolvedValueOnce(env({ targets: [{ goalId: "g" }] }))
  await expect(getMyTargets()).resolves.toEqual([{ goalId: "g" }])
  expect(get).toHaveBeenLastCalledWith("/v1/agents/goal-targets/mine")

  get.mockResolvedValueOnce(env({ target: {}, roadmap: null }))
  await getRoadmap("a/b")
  expect(get).toHaveBeenLastCalledWith("/v1/agents/goal-targets/a%2Fb/roadmap")

  post.mockResolvedValueOnce(env({}))
  await rebuildRoadmap("g1")
  expect(post).toHaveBeenLastCalledWith("/v1/agents/goal-targets/g1/roadmap")

  del.mockResolvedValueOnce(env({ removed: true }))
  await removeTarget("g1")
  expect(del).toHaveBeenLastCalledWith("/v1/agents/goal-targets/g1")
})

test.each([
  ["on", { data: { enabled: true } }, true],
  ["off", { data: { enabled: false } }, false],
  ["truthy non-boolean", { data: { enabled: 1 } }, false],
  ["no data", {}, false],
])("switch: %s", async (_l, body, expected) => {
  get.mockResolvedValueOnce({ data: body })
  await expect(getGoalTargetsEnabled()).resolves.toBe(expected)
  expect(get).toHaveBeenCalledWith("/v1/agents/switches/goal-targets")
})
