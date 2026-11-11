import {
  getSavedJobs,
  getSavedJobsEnabled,
  removeSavedJob,
  saveJob,
} from "@/services/job-fit/savedJobs.service"
import { agentApi } from "@/lib/agentApi"
import { api } from "@/lib/axios"

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))
jest.mock("@/lib/axios", () => ({ api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }))
const get = agentApi.get as jest.Mock
const post = agentApi.post as jest.Mock
const del = agentApi.delete as jest.Mock

beforeEach(() => jest.clearAllMocks())

afterEach(() => {
  // Every Favorites call goes to the agent engine, never the monolith instance.
  expect((api.get as jest.Mock).mock.calls).toHaveLength(0)
  expect((api.post as jest.Mock).mock.calls).toHaveLength(0)
  expect((api.delete as jest.Mock).mock.calls).toHaveLength(0)
})

test("list: reads /v1/agents/saved-jobs and unwraps the envelope", async () => {
  const jobs = [{ jobId: "j1", roleTitle: "Analyst", savedAt: "2026-11-10T00:00:00+00:00" }]
  get.mockResolvedValueOnce({ data: { status: true, data: { savedJobs: jobs } } })
  await expect(getSavedJobs()).resolves.toEqual(jobs)
  expect(get).toHaveBeenCalledWith("/v1/agents/saved-jobs")
})

test("save: posts only the job — never a user id", async () => {
  const out = { savedJob: { jobId: "j1", roleTitle: "Analyst", savedAt: null }, created: true }
  post.mockResolvedValueOnce({ data: { status: true, data: out } })
  await expect(saveJob({ jobId: "j1", roleTitle: "Analyst" })).resolves.toEqual(out)
  expect(post).toHaveBeenCalledWith("/v1/agents/saved-jobs", { jobId: "j1", roleTitle: "Analyst" })
  const body = post.mock.calls[0][1] as Record<string, unknown>
  expect(Object.keys(body).sort()).toEqual(["jobId", "roleTitle"])
})

test("remove: deletes by job id, encoded", async () => {
  del.mockResolvedValueOnce({ data: { status: true, data: { jobId: "a/b", removed: true } } })
  await expect(removeSavedJob("a/b")).resolves.toEqual({ jobId: "a/b", removed: true })
  expect(del).toHaveBeenCalledWith("/v1/agents/saved-jobs/a%2Fb")
})

test.each([
  ["on", { data: { enabled: true } }, true],
  ["off", { data: { enabled: false } }, false],
  ["truthy non-boolean", { data: { enabled: 1 } }, false],
  ["no data", {}, false],
])("status: %s", async (_l, body, expected) => {
  get.mockResolvedValueOnce({ data: body })
  await expect(getSavedJobsEnabled()).resolves.toBe(expected)
  expect(get).toHaveBeenCalledWith("/v1/agents/saved-jobs/status")
})
