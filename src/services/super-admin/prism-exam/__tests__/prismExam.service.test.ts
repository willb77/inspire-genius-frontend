jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

import { agentApi } from "@/lib/agentApi"
import {
  activateQuestionSet,
  cancelRun,
  deleteGrant,
  getExamAccess,
  importQuestionSet,
  listGrants,
  putGrant,
  saveQuestionSet,
  setQuestionSetShared,
  diffRuns,
  getActiveQuestionSet,
  getQuestionSet,
  getRun,
  listAnswers,
  listQuestionSets,
  listRuns,
  replaceActiveQuestionSet,
  startRun,
  unwrap,
} from "../prismExam.service"

const get = agentApi.get as jest.Mock
const post = agentApi.post as jest.Mock
const put = agentApi.put as jest.Mock
const patch = agentApi.patch as jest.Mock
const del = agentApi.delete as jest.Mock
const BASE = "/v1/agents/prism-exam"

describe("prismExam.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("unwraps a {status,data} envelope and passes bare payloads through", () => {
    expect(unwrap({ status: true, data: [1] })).toEqual([1])
    expect(unwrap([1, 2])).toEqual([1, 2])
    expect(unwrap({ id: "x", status: "complete" })).toEqual({ id: "x", status: "complete" })
    expect(unwrap(null as unknown as object)).toBeNull()
  })

  it("reads question sets", async () => {
    get.mockResolvedValueOnce({ data: [{ id: "qs-1" }] })
    expect(await listQuestionSets()).toEqual([{ id: "qs-1" }])
    expect(get).toHaveBeenCalledWith(`${BASE}/question-sets`)

    get.mockResolvedValueOnce({ data: { status: true, data: { id: "qs-1", questions: [] } } })
    expect(await getActiveQuestionSet()).toEqual({ id: "qs-1", questions: [] })
    expect(get).toHaveBeenLastCalledWith(`${BASE}/question-sets/active`)

    get.mockResolvedValueOnce({ data: { id: "a b" } })
    await getQuestionSet("a b")
    expect(get).toHaveBeenLastCalledWith(`${BASE}/question-sets/a%20b`)
  })

  it("replaces the active question set with a PUT", async () => {
    put.mockResolvedValueOnce({ data: { id: "qs-2", version: 2 } })
    const input = { name: "n", pass_mark: 0.8, chapters: { c: "C" }, questions: [] }
    expect(await replaceActiveQuestionSet(input)).toEqual({ id: "qs-2", version: 2 })
    expect(put).toHaveBeenCalledWith(`${BASE}/question-sets/active`, input)
  })

  it("starts a run with trimmed label and default concurrency", async () => {
    post.mockResolvedValueOnce({ data: { run_id: "r-1", status: "queued", total: 91 } })
    expect(await startRun({ label: "  after canon  " })).toEqual({ run_id: "r-1", status: "queued", total: 91 })
    expect(post).toHaveBeenCalledWith(`${BASE}/runs`, { question_set_id: undefined, label: "after canon", concurrency: 2 })

    post.mockResolvedValueOnce({ data: { run_id: "r-2", status: "queued", total: 1 } })
    await startRun({ question_set_id: "qs-1", label: "", concurrency: 1 })
    expect(post).toHaveBeenLastCalledWith(`${BASE}/runs`, { question_set_id: "qs-1", label: undefined, concurrency: 1 })
  })

  it("lists runs, reads one, lists its answers with filters", async () => {
    get.mockResolvedValueOnce({ data: [{ id: "r-1" }] })
    expect(await listRuns(10, true)).toEqual([{ id: "r-1" }])
    expect(get).toHaveBeenCalledWith(`${BASE}/runs`, { params: { limit: 10, all_tiers: true } })

    get.mockResolvedValueOnce({ data: [] })
    await listRuns()
    expect(get).toHaveBeenLastCalledWith(`${BASE}/runs`, { params: { limit: 50, all_tiers: undefined } })

    get.mockResolvedValueOnce({ data: { id: "r-1", passed: true } })
    expect(await getRun("r-1")).toEqual({ id: "r-1", passed: true })
    expect(get).toHaveBeenLastCalledWith(`${BASE}/runs/r-1`)

    get.mockResolvedValueOnce({ data: [{ id: "a-1" }] })
    expect(await listAnswers("r-1", { verdict: "wrong", chapter: "brain" })).toEqual([{ id: "a-1" }])
    expect(get).toHaveBeenLastCalledWith(`${BASE}/runs/r-1/answers`, { params: { verdict: "wrong", chapter: "brain" } })

    get.mockResolvedValueOnce({ data: [] })
    await listAnswers("r-1")
    expect(get).toHaveBeenLastCalledWith(`${BASE}/runs/r-1/answers`, { params: { verdict: undefined, chapter: undefined } })
  })

  it("cancels a run and diffs two", async () => {
    post.mockResolvedValueOnce({ data: { id: "r-1", status: "cancelled" } })
    expect(await cancelRun("r-1")).toEqual({ id: "r-1", status: "cancelled" })
    expect(post).toHaveBeenCalledWith(`${BASE}/runs/r-1/cancel`)

    get.mockResolvedValueOnce({ data: { improved: [], regressed: [] } })
    expect(await diffRuns("r-1", "r-2")).toEqual({ improved: [], regressed: [] })
    expect(get).toHaveBeenCalledWith(`${BASE}/runs/r-1/diff/r-2`)
  })

  it("saves a named set, activates and shares one", async () => {
    post.mockResolvedValueOnce({ data: { id: "qs-7", version: 7 } })
    const input = { name: "n", pass_mark: 0.8, chapters: {}, questions: [], shared: true }
    expect(await saveQuestionSet(input)).toEqual({ id: "qs-7", version: 7 })
    expect(post).toHaveBeenCalledWith(`${BASE}/question-sets`, input)
    post.mockResolvedValueOnce({ data: { id: "qs-7", is_active: true } })
    await activateQuestionSet("qs 7")
    expect(post).toHaveBeenLastCalledWith(`${BASE}/question-sets/qs%207/activate`)
    patch.mockResolvedValueOnce({ data: { id: "qs-7", shared: true } })
    await setQuestionSetShared({ setId: "qs-7", shared: true })
    expect(patch).toHaveBeenCalledWith(`${BASE}/question-sets/qs-7`, { shared: true })
  })

  it("imports a workbook as multipart, with the dry-run flag, name and pass mark", async () => {
    post.mockResolvedValueOnce({ data: { dry_run: true, count: 1 } })
    const file = new File(["x"], "a.xlsx")
    await importQuestionSet({ file, name: "  Set  ", passMark: 0.7, dryRun: true })
    const [url, form, cfg] = post.mock.calls[0]
    expect(url).toBe(`${BASE}/question-sets/import`)
    expect(cfg).toEqual({ headers: { "Content-Type": "multipart/form-data" } })
    expect((form as FormData).get("file")).toBe(file)
    expect((form as FormData).get("dry_run")).toBe("true")
    expect((form as FormData).get("name")).toBe("Set")
    expect((form as FormData).get("pass_mark")).toBe("0.7")
    post.mockResolvedValueOnce({ data: { dry_run: false } })
    await importQuestionSet({ file, dryRun: false })
    const form2 = post.mock.calls[1][1] as FormData
    expect(form2.get("dry_run")).toBe("false")
    expect(form2.has("name")).toBe(false)
  })

  it("reads access, and lists, grants and revokes", async () => {
    get.mockResolvedValueOnce({ data: { allowed: true } })
    expect(await getExamAccess()).toEqual({ allowed: true })
    expect(get).toHaveBeenLastCalledWith(`${BASE}/access`)
    get.mockResolvedValueOnce({ data: [{ user_id: "m" }] })
    expect(await listGrants()).toEqual([{ user_id: "m" }])
    put.mockResolvedValueOnce({ data: { user_id: "m", email: "a@b.c", role: "manager" } })
    await putGrant(" a@b.c ")
    expect(put).toHaveBeenLastCalledWith(`${BASE}/grants`, { email: "a@b.c" })
    del.mockResolvedValueOnce({ data: { user_id: "m", revoked: true } })
    expect(await deleteGrant("m/1")).toEqual({ user_id: "m", revoked: true })
    expect(del).toHaveBeenCalledWith(`${BASE}/grants/m%2F1`)
  })
})
