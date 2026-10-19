const get = jest.fn()
const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}))

import { generateMyResume, getResumeWriterSources } from "@/services/resumeWriter/resumeWriter.service"

beforeEach(() => jest.clearAllMocks())

test("reads the caller's own sources from /v1/agents/resume-writer/me and unwraps the envelope", async () => {
  get.mockResolvedValue({ data: { status: true, data: { enabled: true, dailyLimit: 5, usedToday: 1 } } })
  await expect(getResumeWriterSources()).resolves.toMatchObject({ enabled: true, usedToday: 1 })
  expect(get).toHaveBeenCalledWith("/v1/agents/resume-writer/me")
})

test("posts the target to the same self route — no member id anywhere", async () => {
  post.mockResolvedValue({ data: { status: true, data: { disabled: true } } })
  const body = { role: "Operations Manager", documentIds: ["d1"] }
  await expect(generateMyResume(body)).resolves.toEqual({ disabled: true })
  expect(post).toHaveBeenCalledWith("/v1/agents/resume-writer/me", body)
})
