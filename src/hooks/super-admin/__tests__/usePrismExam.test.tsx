import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  ACTIVE_POLL_MS,
  isRunActive,
  useActiveQuestionSet,
  useCancelExamRun,
  useExamAnswers,
  useExamDiff,
  useExamQuestionSet,
  useExamQuestionSets,
  useExamRun,
  useExamRuns,
  useReplaceQuestionSet,
  useStartExamRun,
} from "../usePrismExam"

jest.mock("@/services/super-admin/prism-exam/prismExam.service", () => ({
  listQuestionSets: jest.fn(),
  getActiveQuestionSet: jest.fn(),
  getQuestionSet: jest.fn(),
  replaceActiveQuestionSet: jest.fn(),
  startRun: jest.fn(),
  listRuns: jest.fn(),
  getRun: jest.fn(),
  listAnswers: jest.fn(),
  cancelRun: jest.fn(),
  diffRuns: jest.fn(),
}))

import * as service from "@/services/super-admin/prism-exam/prismExam.service"

let qc: QueryClient
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("usePrismExam", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it("knows which statuses are active", () => {
    expect(isRunActive({ status: "queued" })).toBe(true)
    expect(isRunActive({ status: "running" })).toBe(true)
    expect(isRunActive({ status: "complete" })).toBe(false)
    expect(isRunActive(undefined)).toBe(false)
    expect(ACTIVE_POLL_MS).toBeGreaterThan(0)
  })

  it("reads question sets, the active set, and one by id", async () => {
    ;(service.listQuestionSets as jest.Mock).mockResolvedValue([{ id: "qs-1" }])
    ;(service.getActiveQuestionSet as jest.Mock).mockResolvedValue({ id: "qs-1", questions: [] })
    ;(service.getQuestionSet as jest.Mock).mockResolvedValue({ id: "qs-9" })
    const sets = renderHook(() => useExamQuestionSets(), { wrapper })
    const active = renderHook(() => useActiveQuestionSet(), { wrapper })
    const off = renderHook(() => useExamQuestionSet(undefined), { wrapper })
    const one = renderHook(() => useExamQuestionSet("qs-9"), { wrapper })
    await waitFor(() => expect(sets.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(active.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(one.result.current.isSuccess).toBe(true))
    expect(off.result.current.fetchStatus).toBe("idle")
    expect(service.getQuestionSet).toHaveBeenCalledWith("qs-9")
  })

  it("lists runs and reads one; polls only while active", async () => {
    ;(service.listRuns as jest.Mock).mockResolvedValue([{ id: "r-1", status: "complete" }])
    ;(service.getRun as jest.Mock).mockResolvedValue({ id: "r-1", status: "complete" })
    const runs = renderHook(() => useExamRuns(10, true), { wrapper })
    const run = renderHook(() => useExamRun("r-1"), { wrapper })
    const none = renderHook(() => useExamRun(undefined), { wrapper })
    await waitFor(() => expect(runs.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(run.result.current.isSuccess).toBe(true))
    expect(service.listRuns).toHaveBeenCalledWith(10, true)
    expect(service.getRun).toHaveBeenCalledWith("r-1")
    expect(none.result.current.fetchStatus).toBe("idle")
    // A complete run does not poll; a queued one would (interval is a function of state).
    const query = qc.getQueryCache().find({ queryKey: ["prism-exam", "run", "r-1"] })
    const interval = query?.options.refetchInterval
    expect(typeof interval).toBe("function")
    expect((interval as (q: unknown) => number | false)({ state: { data: { status: "complete" } } })).toBe(false)
    expect((interval as (q: unknown) => number | false)({ state: { data: { status: "running" } } })).toBe(ACTIVE_POLL_MS)
    const runsQuery = qc.getQueryCache().find({ queryKey: ["prism-exam", "runs", 10, true] })
    const runsInterval = runsQuery?.options.refetchInterval as (q: unknown) => number | false
    expect(runsInterval({ state: { data: [{ status: "complete" }] } })).toBe(false)
    expect(runsInterval({ state: { data: [{ status: "queued" }] } })).toBe(ACTIVE_POLL_MS)
  })

  it("lists answers with filters, polling when told the run is active", async () => {
    ;(service.listAnswers as jest.Mock).mockResolvedValue([{ id: "a-1" }])
    const { result } = renderHook(() => useExamAnswers("r-1", { verdict: "wrong" }, true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(service.listAnswers).toHaveBeenCalledWith("r-1", { verdict: "wrong" })
    const q = qc.getQueryCache().find({ queryKey: ["prism-exam", "answers", "r-1", "wrong", ""] })
    expect(q?.options.refetchInterval).toBe(ACTIVE_POLL_MS)
    const idle = renderHook(() => useExamAnswers(undefined), { wrapper })
    expect(idle.result.current.fetchStatus).toBe("idle")
  })

  it("starts, cancels and replaces, invalidating the lists", async () => {
    ;(service.startRun as jest.Mock).mockResolvedValue({ run_id: "r-2", status: "queued", total: 91 })
    ;(service.cancelRun as jest.Mock).mockResolvedValue({ id: "r-2", status: "cancelled" })
    ;(service.replaceActiveQuestionSet as jest.Mock).mockResolvedValue({ id: "qs-2", version: 2 })
    const spy = jest.spyOn(qc, "invalidateQueries")
    qc.setQueryData(["prism-exam", "run", "r-2"], { id: "r-2", status: "running", done: 3 })

    const start = renderHook(() => useStartExamRun(), { wrapper })
    await act(async () => {
      await start.result.current.mutateAsync({ label: "x" })
    })
    expect(service.startRun).toHaveBeenCalledWith({ label: "x" })
    expect(spy).toHaveBeenCalledWith({ queryKey: ["prism-exam", "runs"] })

    const cancel = renderHook(() => useCancelExamRun(), { wrapper })
    await act(async () => {
      await cancel.result.current.mutateAsync("r-2")
    })
    expect(qc.getQueryData(["prism-exam", "run", "r-2"])).toEqual({ id: "r-2", status: "cancelled", done: 3 })
    expect(spy).toHaveBeenCalledWith({ queryKey: ["prism-exam", "run", "r-2"] })

    const replace = renderHook(() => useReplaceQuestionSet(), { wrapper })
    await act(async () => {
      await replace.result.current.mutateAsync({ name: "n", pass_mark: 0.8, chapters: {}, questions: [] })
    })
    expect(spy).toHaveBeenCalledWith({ queryKey: ["prism-exam", "question-set"] })
  })

  it("diffs two runs only when both are given and differ", async () => {
    ;(service.diffRuns as jest.Mock).mockResolvedValue({ improved: [] })
    const same = renderHook(() => useExamDiff("r-1", "r-1"), { wrapper })
    const half = renderHook(() => useExamDiff("r-1", undefined), { wrapper })
    const both = renderHook(() => useExamDiff("r-1", "r-2"), { wrapper })
    await waitFor(() => expect(both.result.current.isSuccess).toBe(true))
    expect(same.result.current.fetchStatus).toBe("idle")
    expect(half.result.current.fetchStatus).toBe("idle")
    expect(service.diffRuns).toHaveBeenCalledWith("r-1", "r-2")
  })
})
