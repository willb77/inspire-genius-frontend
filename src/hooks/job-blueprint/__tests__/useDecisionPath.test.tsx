/**
 * @jest-environment jsdom
 *
 * Decision path — the hooks and the service. The rule that matters most: a 403
 * (the server-side switch is off) reads as "not enabled", so nothing renders.
 */
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

jest.mock("@/lib/axios", () => ({ api: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }))

import { api } from "@/lib/axios"
import { decisionPathService } from "@/services/job-blueprint/decision-path.service"
import {
  decisionPathErrorMessage,
  useActivateRuleSet,
  useDecisionCases,
  useDecisionPathStatus,
  useDecisionRecord,
  useDecisionRuleSets,
  useNewRuleSetVersion,
  useOpenDecisionCase,
  useRecheckCase,
  useRecordDecision,
  useSaveRuleSet,
  useWithdrawCase,
} from "../useDecisionPath"

const mockApi = api as jest.Mocked<typeof api>

let lastClient: QueryClient
function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  lastClient = qc
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

/** Wait until the status query has SETTLED, so a null is the hook's answer and not "not loaded yet". */
const settled = () =>
  waitFor(() => expect(["success", "error"]).toContain(lastClient.getQueryState(["decision-path", "status"])?.status))

beforeEach(() => jest.clearAllMocks())

const BODY = { rules: [], routePolicy: [], decisionMakerEmails: ["d@x.test"] }

describe("decisionPathService paths", () => {
  it("calls /v1/blueprint/decision-path/*", async () => {
    mockApi.get.mockResolvedValue({ data: { data: {} } })
    mockApi.post.mockResolvedValue({ data: { data: {} } })
    mockApi.put.mockResolvedValue({ data: { data: {} } })
    await decisionPathService.status()
    await decisionPathService.ruleSets()
    await decisionPathService.cases()
    await decisionPathService.record("c1")
    await decisionPathService.createRuleSet(BODY)
    await decisionPathService.updateRuleSet("r1", BODY)
    await decisionPathService.newVersion("r1")
    await decisionPathService.activate("r1")
    await decisionPathService.openCase({ blueprintId: "b", ruleSetId: "r", candidateName: "n", answers: {}, attest: true })
    await decisionPathService.recheck("c1", { deg: "master" })
    await decisionPathService.decide("c1", { finalRoute: "apprentice", reason: "r" })
    await decisionPathService.amend("c1", { finalRoute: "refer", reason: "r" })
    await decisionPathService.withdraw("c1", "why")
    const B = "/v1/blueprint/decision-path"
    expect(mockApi.get.mock.calls.map((c) => c[0])).toEqual([
      `${B}/status`, `${B}/rule-sets`, `${B}/cases`, `${B}/cases/c1/record`,
    ])
    expect(mockApi.put.mock.calls[0][0]).toBe(`${B}/rule-sets/r1`)
    expect(mockApi.post.mock.calls.map((c) => c[0])).toEqual([
      `${B}/rule-sets`, `${B}/rule-sets/r1/new-version`, `${B}/rule-sets/r1/activate`, `${B}/cases`,
      `${B}/cases/c1/recheck`, `${B}/cases/c1/decision`, `${B}/cases/c1/amend`, `${B}/cases/c1/withdraw`,
    ])
    expect(mockApi.post.mock.calls[4][1]).toEqual({ answers: { deg: "master" }, attest: true })
  })
})

describe("useDecisionPathStatus", () => {
  it("is null on a 403 (switch off)", async () => {
    mockApi.get.mockRejectedValue({ response: { status: 403 } })
    const { result } = renderHook(() => useDecisionPathStatus(), { wrapper })
    await settled()
    expect(result.current).toBeNull()
  })

  it("is null unless the server says enabled", async () => {
    mockApi.get.mockResolvedValue({ data: { data: { enabled: false } } })
    const { result } = renderHook(() => useDecisionPathStatus(), { wrapper })
    await settled()
    expect(result.current).toBeNull()
  })

  it("is the status when enabled", async () => {
    mockApi.get.mockResolvedValue({ data: { data: { enabled: true, staff: true } } })
    const { result } = renderHook(() => useDecisionPathStatus(), { wrapper })
    await waitFor(() => expect(result.current?.staff).toBe(true))
  })
})

describe("queries do not fire while disabled", () => {
  it("rule sets, cases and the record wait for the gate", async () => {
    renderHook(() => [useDecisionRuleSets(false), useDecisionCases(false), useDecisionRecord("c1", false)], { wrapper })
    await new Promise((r) => setTimeout(r, 10))
    expect(mockApi.get).not.toHaveBeenCalled()
  })

  it("and fire once enabled", async () => {
    mockApi.get.mockResolvedValue({ data: { data: [] } })
    const { result } = renderHook(() => [useDecisionRuleSets(true), useDecisionCases(true), useDecisionRecord("c1", true)], { wrapper })
    await waitFor(() => expect(result.current[0].isSuccess && result.current[1].isSuccess).toBe(true))
    expect(mockApi.get).toHaveBeenCalledTimes(3)
  })
})

describe("mutations", () => {
  it("save creates without an id and updates with one; decide vs amend", async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: "x" } } })
    mockApi.put.mockResolvedValue({ data: { data: { id: "x" } } })
    const { result } = renderHook(
      () => ({
        save: useSaveRuleSet(), next: useNewRuleSetVersion(), activate: useActivateRuleSet(),
        open: useOpenDecisionCase(), recheck: useRecheckCase(), decide: useRecordDecision(), withdraw: useWithdrawCase(),
      }),
      { wrapper },
    )
    await act(async () => {
      await result.current.save.mutateAsync({ body: BODY })
      await result.current.save.mutateAsync({ id: "r1", body: BODY })
      await result.current.next.mutateAsync("r1")
      await result.current.activate.mutateAsync("r1")
      await result.current.open.mutateAsync({ blueprintId: "b", ruleSetId: "r", candidateName: "n", answers: {}, attest: true })
      await result.current.recheck.mutateAsync({ id: "c1", answers: {} })
      await result.current.decide.mutateAsync({ id: "c1", body: { finalRoute: "apprentice", reason: "r" } })
      await result.current.decide.mutateAsync({ id: "c1", body: { finalRoute: "refer", reason: "r" }, amend: true })
      await result.current.withdraw.mutateAsync({ id: "c1", reason: "why" })
    })
    expect(mockApi.put).toHaveBeenCalledTimes(1)
    const posts = mockApi.post.mock.calls.map((c) => c[0])
    expect(posts).toContain("/v1/blueprint/decision-path/cases/c1/decision")
    expect(posts).toContain("/v1/blueprint/decision-path/cases/c1/amend")
  })
})

describe("decisionPathErrorMessage", () => {
  it("uses the server's words, a list of problems, or the fallback", () => {
    expect(decisionPathErrorMessage({ response: { data: { detail: "No." } } }, "fb")).toBe("No.")
    expect(decisionPathErrorMessage({ response: { data: { detail: ["One.", "Two."] } } }, "fb")).toBe("One. Two.")
    expect(decisionPathErrorMessage({ response: { data: { detail: [{ msg: "Bad." }] } } }, "fb")).toBe("Bad.")
    expect(decisionPathErrorMessage(new Error("x"), "fb")).toBe("fb")
  })
})
