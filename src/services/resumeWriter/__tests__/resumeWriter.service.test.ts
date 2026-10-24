const get = jest.fn()
const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}))

import {
  generateMyResume,
  generateMyResumeJob,
  getResumeJob,
  getResumeWriterSources,
  startResumeJob,
} from "@/services/resumeWriter/resumeWriter.service"

beforeEach(() => jest.clearAllMocks())

const ok = (data: unknown) => ({ data: { status: true, data } })
const noSleep = () => Promise.resolve()

/** An axios-shaped error, as `axios.isAxiosError` recognises it. */
function httpError(status: number, detail: unknown) {
  return Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    response: { status, data: { detail } },
  })
}

test("reads the caller's own sources from /v1/agents/resume-writer/me and unwraps the envelope", async () => {
  get.mockResolvedValue({ data: { status: true, data: { enabled: true, dailyLimit: 5, usedToday: 1 } } })
  await expect(getResumeWriterSources()).resolves.toMatchObject({ enabled: true, usedToday: 1 })
  expect(get).toHaveBeenCalledWith("/v1/agents/resume-writer/me")
})

test("RW2: a jobId is sent as a query parameter on the same self route", async () => {
  get.mockResolvedValue(ok({ enabled: true }))
  await getResumeWriterSources("job-1")
  expect(get).toHaveBeenCalledWith("/v1/agents/resume-writer/me", { params: { jobId: "job-1" } })
})

test("posts the target to the same self route — no member id anywhere", async () => {
  post.mockResolvedValue({ data: { status: true, data: { disabled: true } } })
  const body = { role: "Operations Manager", documentIds: ["d1"] }
  await expect(generateMyResume(body)).resolves.toEqual({ disabled: true })
  expect(post).toHaveBeenCalledWith("/v1/agents/resume-writer/me", body)
})

test("RW2: the job pair is under the self route", async () => {
  post.mockResolvedValue(ok({ jobId: "a/b", status: "queued" }))
  get.mockResolvedValue(ok({ jobId: "a/b", status: "queued", result: null, error: null }))
  await startResumeJob({ jobId: "job-1" })
  await getResumeJob("a/b")
  expect(post).toHaveBeenCalledWith("/v1/agents/resume-writer/me/jobs", { jobId: "job-1" })
  expect(get).toHaveBeenCalledWith("/v1/agents/resume-writer/me/jobs/a%2Fb")
})

describe("generateMyResumeJob", () => {
  const DRAFT = { headline: "H", target: "T" }

  test("polls until the job is complete and returns its résumé", async () => {
    post.mockResolvedValue(ok({ jobId: "j", status: "queued" }))
    get
      .mockResolvedValueOnce(ok({ jobId: "j", status: "queued", result: null, error: null }))
      .mockResolvedValueOnce(ok({ jobId: "j", status: "running", result: null, error: null }))
      .mockResolvedValueOnce(ok({ jobId: "j", status: "complete", result: DRAFT, error: null }))
    await expect(generateMyResumeJob({ jobId: "job-1" }, { sleep: noSleep })).resolves.toEqual(DRAFT)
    expect(get).toHaveBeenCalledTimes(3)
  })

  test("switched off is passed through without a poll", async () => {
    post.mockResolvedValue(ok({ disabled: true }))
    await expect(generateMyResumeJob({}, { sleep: noSleep })).resolves.toEqual({ disabled: true })
    expect(get).not.toHaveBeenCalled()
  })

  test.each([
    ["error", "Résumé generation failed — try again."],
    ["expired", "This draft was already shown. Generate it again to see it."],
  ])("a %s job throws the server's words", async (status, error) => {
    post.mockResolvedValue(ok({ jobId: "j", status: "queued" }))
    get.mockResolvedValue(ok({ jobId: "j", status, result: null, error }))
    await expect(generateMyResumeJob({}, { sleep: noSleep })).rejects.toThrow(error)
  })

  test("a complete job with nothing in it is an error, never an empty draft", async () => {
    post.mockResolvedValue(ok({ jobId: "j", status: "queued" }))
    get.mockResolvedValue(ok({ jobId: "j", status: "complete", result: null, error: null }))
    await expect(generateMyResumeJob({}, { sleep: noSleep })).rejects.toThrow(/couldn't be written/)
  })

  test("gives up after the timeout", async () => {
    post.mockResolvedValue(ok({ jobId: "j", status: "queued" }))
    get.mockResolvedValue(ok({ jobId: "j", status: "running", result: null, error: null }))
    await expect(generateMyResumeJob({}, { sleep: noSleep, timeoutMs: -1 })).rejects.toThrow(/longer than it should/)
  })

  test.each([
    [404, "Not Found"],
    [405, "Method Not Allowed"],
  ])("an engine without the jobs route (%s) falls back to the one-request route", async (status, detail) => {
    post.mockRejectedValueOnce(httpError(status, detail)).mockResolvedValueOnce(ok(DRAFT))
    await expect(generateMyResumeJob({ role: "Lead" }, { sleep: noSleep })).resolves.toEqual(DRAFT)
    expect(post).toHaveBeenLastCalledWith("/v1/agents/resume-writer/me", { role: "Lead" })
  })

  test("a refusal is never retried on the other route", async () => {
    const refusal = httpError(404, "That role isn't available to you.")
    post.mockRejectedValueOnce(refusal)
    await expect(generateMyResumeJob({ jobId: "x" }, { sleep: noSleep })).rejects.toBe(refusal)
    expect(post).toHaveBeenCalledTimes(1)
  })
})
