import { agentApi } from "@/lib/agentApi"
import { getDegreePlan, saveDegreePlanInputs } from "@/services/career-discovery/careerDiscovery.service"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn(), put: jest.fn() } }))

const api = agentApi as unknown as { get: jest.Mock; put: jest.Mock }

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: { status: true, data: { available: true } } })
  api.put.mockReset().mockResolvedValue({ data: { status: true, data: { saved: {} } } })
})

test("the plan is read from the Discovery prefix on the Agent Engine", async () => {
  await getDegreePlan()
  expect(api.get).toHaveBeenCalledWith("/v1/agents/career-discovery/education/degree-plan")
})

test("inputs are PUT to their own path with exactly the body given", async () => {
  const body = {
    completedCourseIds: ["k-mat"], load: "part_time" as const, creditsPerTerm: 9,
    startTerm: { season: "fall" as const, year: 2026 }, summer: false, extraProgramIds: [],
  }
  await saveDegreePlanInputs(body)
  expect(api.put).toHaveBeenCalledWith("/v1/agents/career-discovery/education/degree-plan/inputs", body)
})
