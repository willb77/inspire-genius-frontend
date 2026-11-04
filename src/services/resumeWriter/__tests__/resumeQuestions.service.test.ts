/**
 * RWO-8 — the résumé interview's transport: the job pair under the same self
 * route, no member id anywhere, and every outcome said rather than swallowed.
 */
const get = jest.fn()
const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}))

import { askResumeQuestions, RESUME_WRITER_QUESTIONS } from "@/services/resumeWriter/resumeWriter.service"

const ok = (data: unknown) => ({ data: { status: true, data } })
const noSleep = () => Promise.resolve()
const Q = [{ id: "q1", text: "Budget?", why: "w", requirement: "r" }]

beforeEach(() => jest.clearAllMocks())

test("starts on the self route and polls until the questions arrive", async () => {
  post.mockResolvedValue(ok({ jobId: "j1", status: "queued" }))
  get.mockResolvedValueOnce(ok({ jobId: "j1", status: "running", questions: null, error: null }))
  get.mockResolvedValueOnce(ok({ jobId: "j1", status: "complete", questions: Q, error: null }))
  await expect(askResumeQuestions({ positionText: "Job" }, { sleep: noSleep })).resolves.toEqual(Q)
  expect(RESUME_WRITER_QUESTIONS).toBe("/v1/agents/resume-writer/me/questions")
  expect(post).toHaveBeenCalledWith(RESUME_WRITER_QUESTIONS, { positionText: "Job" })
  expect(get).toHaveBeenLastCalledWith(`${RESUME_WRITER_QUESTIONS}/j1`)
})

test("switched off is { disabled: true }, with no poll", async () => {
  post.mockResolvedValue(ok({ disabled: true }))
  await expect(askResumeQuestions({}, { sleep: noSleep })).resolves.toEqual({ disabled: true })
  expect(get).not.toHaveBeenCalled()
})

test("nothing to ask after a draft is an empty list at once, with no poll", async () => {
  post.mockResolvedValue(ok({ jobId: null, status: "complete", questions: [] }))
  await expect(askResumeQuestions({ afterDraft: true, weakBullets: [] }, { sleep: noSleep })).resolves.toEqual([])
  expect(get).not.toHaveBeenCalled()
})

test("a failed or expired job is an error with the server's words", async () => {
  post.mockResolvedValue(ok({ jobId: "j1", status: "queued" }))
  get.mockResolvedValue(ok({ jobId: "j1", status: "error", questions: null, error: "We couldn't think of questions." }))
  await expect(askResumeQuestions({}, { sleep: noSleep })).rejects.toThrow("We couldn't think of questions.")
  get.mockResolvedValue(ok({ jobId: "j1", status: "expired", questions: null, error: null }))
  await expect(askResumeQuestions({}, { sleep: noSleep })).rejects.toThrow(/write your résumé without them/)
})

test("a job that never settles times out with a reason", async () => {
  post.mockResolvedValue(ok({ jobId: "j1", status: "queued" }))
  get.mockResolvedValue(ok({ jobId: "j1", status: "running", questions: null, error: null }))
  await expect(askResumeQuestions({}, { sleep: noSleep, timeoutMs: -1 })).rejects.toThrow(/taking too long/)
})
