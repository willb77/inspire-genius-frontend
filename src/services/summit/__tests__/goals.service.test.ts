/**
 * The shared-record calls added in Phase 3 (Goals offering).
 *
 * Two properties matter more than happy-path parsing:
 *  1. Everything goes through `getApi()` under `/v1/agents/goals` — the only
 *     prefix API Gateway routes to the agent engine. A bare `/v1/goals/...`
 *     404s in the browser while passing every test.
 *  2. The envelope: the Phase 1 routes return `{status, data}` and the session
 *     routes do not. Unwrapping the wrong one yields `undefined`, silently.
 */
import {
  createGoal,
  getMyGoals,
  publishGoal,
  setGoalVisibility,
  unpublishGoal,
} from "../goals.service"

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPatch = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  getApi: () => ({
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
  }),
}))

beforeEach(() => jest.clearAllMocks())

const SHARED = {
  goalId: "b1",
  memberId: "m1",
  title: "Ship it",
  category: "current_job",
  horizon: "short",
  motivation: "",
  prismAlignment: { kind: "leverages" },
  executionStyle: "",
  successMetric: "",
  firstStep: "",
  ownerCoach: "",
  status: "provisional",
  provenanceQuotes: [],
  source: "member",
  visibility: "shareable",
  publishedFrom: "s1",
  publishedAt: "2026-09-04T00:00:00Z",
}

it("reads /mine through the agent-engine prefix and unwraps the envelope", async () => {
  mockGet.mockResolvedValue({ data: { status: true, data: { memberId: "m1", goals: [SHARED], coverage: [] } } })
  const out = await getMyGoals()
  expect(mockGet).toHaveBeenCalledWith("/v1/agents/goals/mine")
  expect(out.goals[0].goalId).toBe("b1")
})

it("publishes by the SESSION goal id and unwraps the shared row", async () => {
  mockPost.mockResolvedValue({ data: { status: true, data: SHARED } })
  const out = await publishGoal("s1")
  expect(mockPost).toHaveBeenCalledWith("/v1/agents/goals/s1/publish")
  expect(out.publishedFrom).toBe("s1")
})

it("unpublishes by the SESSION goal id", async () => {
  mockPost.mockResolvedValue({ data: { status: true, data: { publishedFrom: "s1", removed: true } } })
  const out = await unpublishGoal("s1")
  expect(mockPost).toHaveBeenCalledWith("/v1/agents/goals/s1/unpublish")
  expect(out.removed).toBe(true)
})

it("sets visibility by the SHARED goal id with the literal the schema accepts", async () => {
  mockPatch.mockResolvedValue({ data: { status: true, data: { ...SHARED, visibility: "private" } } })
  const out = await setGoalVisibility("b1", "private")
  expect(mockPatch).toHaveBeenCalledWith("/v1/agents/goals/b1/visibility", { visibility: "private" })
  expect(out.visibility).toBe("private")
})

it("creates a session goal at the bare prefix (no envelope on the session routes)", async () => {
  mockPost.mockResolvedValue({ data: { goal_id: "s2", title: "Learn SQL", category: "job", status: "proposed" } })
  const out = await createGoal({ title: "Learn SQL", category: "job" })
  expect(mockPost).toHaveBeenCalledWith("/v1/agents/goals", { title: "Learn SQL", category: "job" })
  expect(out.goal_id).toBe("s2")
})

it("encodes ids in the path", async () => {
  mockPost.mockResolvedValue({ data: { status: true, data: SHARED } })
  await publishGoal("a b/c")
  expect(mockPost).toHaveBeenCalledWith("/v1/agents/goals/a%20b%2Fc/publish")
})
