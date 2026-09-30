import { getFitComponents, getGoalsWiring } from "@/services/job-fit/components.service"
import { getJobFitComponentsEnabled } from "@/services/switches/jobFitComponents.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn(), post: jest.fn() } }))
const get = agentApi.get as jest.Mock
const post = agentApi.post as jest.Mock

beforeEach(() => jest.clearAllMocks())

test("components: posts the jobs (capped at 50) to the agent engine and unwraps the envelope", async () => {
  post.mockResolvedValueOnce({ data: { status: true, data: { jobs: {} } } })
  const jobs = Array.from({ length: 60 }, (_, i) => ({ jobId: `j${i}`, fitScore: 50 }))
  await expect(getFitComponents(jobs)).resolves.toEqual({ jobs: {} })
  expect(post).toHaveBeenCalledWith("/v1/agents/job-fit/components", { jobs: jobs.slice(0, 50) })
})

test("wiring: reads the goals route", async () => {
  get.mockResolvedValueOnce({ data: { status: true, data: { goals: [] } } })
  await expect(getGoalsWiring()).resolves.toEqual({ goals: [] })
  expect(get).toHaveBeenCalledWith("/v1/agents/goals/wiring")
})

test.each([
  ["on", { data: { enabled: true } }, true],
  ["off", { data: { enabled: false } }, false],
  ["truthy non-boolean", { data: { enabled: 1 } }, false],
  ["no data", {}, false],
])("switch: %s", async (_l, body, expected) => {
  get.mockResolvedValueOnce({ data: body })
  await expect(getJobFitComponentsEnabled()).resolves.toBe(expected)
  expect(get).toHaveBeenCalledWith("/v1/agents/switches/job-fit-components")
})
