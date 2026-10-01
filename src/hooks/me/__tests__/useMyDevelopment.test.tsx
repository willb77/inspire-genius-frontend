/**
 * The self-scoped growth hooks behind `/my/development`.
 *
 * Three things are pinned here, each of which is invisible at runtime if wrong:
 *
 *  1. **A failed read surfaces as `isError`, never as an empty list.** For a
 *     new member the correct answer to these reads IS nothing, so a rejection
 *     swallowed into `[]` is indistinguishable from the right answer.
 *  2. **Closing a gap invalidates the gaps PREFIX**, not one target variant —
 *     otherwise someone with a target selected keeps seeing a closed gap as
 *     open.
 *  3. **The keys are their own namespace**, not `developmentKeys.*`. Those are
 *     keyed by member id and are invalidated by the coach-side writes; a
 *     collision would let a manager's write clear this surface's cache for a
 *     different scope.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const getMyGaps = jest.fn()
const createMyGap = jest.fn()
const closeMyGap = jest.fn()
const getMyLearningItems = jest.fn()
const createMyLearningItem = jest.fn()
const updateMyLearningItem = jest.fn()
const getMyMilestones = jest.fn()
const getMyFullPrism = jest.fn()

jest.mock("@/services/manager/development/growthService", () => ({
  getMyGaps: (...a: unknown[]) => getMyGaps(...a),
  createMyGap: (...a: unknown[]) => createMyGap(...a),
  closeMyGap: (...a: unknown[]) => closeMyGap(...a),
  getMyLearningItems: (...a: unknown[]) => getMyLearningItems(...a),
  createMyLearningItem: (...a: unknown[]) => createMyLearningItem(...a),
  updateMyLearningItem: (...a: unknown[]) => updateMyLearningItem(...a),
  getMyMilestones: (...a: unknown[]) => getMyMilestones(...a),
  getMyFullPrism: (...a: unknown[]) => getMyFullPrism(...a),
}))

import {
  myDevelopmentKeys,
  useCloseMyGap,
  useCreateMyGap,
  useCreateMyLearningItem,
  useMyFullPrism,
  useMyGaps,
  useMyLearningItems,
  useMyMilestones,
  useUpdateMyLearningItem,
} from "../useMyDevelopment"

let qc: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  getMyGaps.mockResolvedValue({ data: { data: [] } })
  getMyLearningItems.mockResolvedValue({ data: { data: [] } })
  getMyMilestones.mockResolvedValue({ data: { data: [] } })
  getMyFullPrism.mockResolvedValue({ data: { data: null } })
})

describe("query keys", () => {
  it("live under their own ['me','development'] namespace", () => {
    expect(myDevelopmentKeys.all).toEqual(["me", "development"])
    // Not the coach-side namespace — a shared prefix would let the manager
    // surface's invalidations reach this one.
    expect(myDevelopmentKeys.gaps()[0]).not.toBe("development")
  })

  it("puts the target variant UNDER the gaps prefix", () => {
    const prefix = myDevelopmentKeys.gapsFor()
    expect(myDevelopmentKeys.gaps("bp-1").slice(0, prefix.length)).toEqual([...prefix])
    expect(myDevelopmentKeys.gaps()).toEqual([...prefix, "default"])
  })
})

describe("reads", () => {
  it("returns the rows a successful read produced", async () => {
    getMyGaps.mockResolvedValue({
      data: { data: [{ gapId: "g1", competency: "Chairing", status: "open" }] },
    })
    const { result } = renderHook(() => useMyGaps(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })

  it("passes the target blueprint through to the service", async () => {
    const { result } = renderHook(() => useMyGaps("bp-2"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getMyGaps).toHaveBeenCalledWith("bp-2")
  })

  /** The narrow shape this table needs — the four hooks return different row
   *  types, and the assertion is about the STATE, not the rows. */
  type AnyQuery = { isError: boolean; data: unknown }
  const readCases: [string, () => AnyQuery, jest.Mock][] = [
    ["gaps", () => useMyGaps() as AnyQuery, getMyGaps],
    ["learning items", () => useMyLearningItems() as AnyQuery, getMyLearningItems],
    ["milestones", () => useMyMilestones() as AnyQuery, getMyMilestones],
    ["the full PRISM profile", () => useMyFullPrism() as AnyQuery, getMyFullPrism],
  ]

  it.each(readCases)("surfaces a failed read of %s as isError, not as empty", async (
    _label,
    hook,
    svc,
  ) => {
    svc.mockRejectedValue(new Error("boom"))
    const { result } = renderHook(hook, { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    // The distinction the whole page depends on: a failure is not an absence.
    expect(result.current.data).toBeUndefined()
  })

  it("treats a 2xx with no body as an empty collection, which is a real state", async () => {
    getMyLearningItems.mockResolvedValue({ data: {} })
    const { result } = renderHook(() => useMyLearningItems(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
    expect(result.current.isError).toBe(false)
  })

  it("reads a conflicted PRISM profile as DATA, not as an error or an absence", async () => {
    // A conflicted profile still returns a body. If the hook turned it into
    // null the surface could only say "no assessment", which is a different
    // and wrong fact about the person.
    getMyFullPrism.mockResolvedValue({
      data: { data: { hasData: false, isConflicted: true, conflictMessage: "Records disagree." } },
    })
    const { result } = renderHook(() => useMyFullPrism(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.isConflicted).toBe(true)
  })

  it("maps a body-less profile response to null, an ordinary state", async () => {
    const { result } = renderHook(() => useMyFullPrism(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})

describe("writes", () => {
  it("invalidates every gaps variant when a gap is closed", async () => {
    closeMyGap.mockResolvedValue({ data: { data: { gapId: "g1", status: "closed" } } })
    const spy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useCloseMyGap(), { wrapper })
    await result.current.mutateAsync("g1")
    // The PREFIX. `gaps()` would match only the "default" variant.
    expect(spy).toHaveBeenCalledWith({ queryKey: myDevelopmentKeys.gapsFor() })
  })

  it("invalidates every gaps variant when a gap is declared", async () => {
    createMyGap.mockResolvedValue({ data: { data: { gapId: "g2" } } })
    const spy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useCreateMyGap(), { wrapper })
    await result.current.mutateAsync({ competency: "Chairing" })
    expect(spy).toHaveBeenCalledWith({ queryKey: myDevelopmentKeys.gapsFor() })
  })

  it("refreshes the learning list after an add and after a progress save", async () => {
    createMyLearningItem.mockResolvedValue({ data: { data: { itemId: "l1" } } })
    updateMyLearningItem.mockResolvedValue({ data: { data: { itemId: "l1" } } })
    const spy = jest.spyOn(qc, "invalidateQueries")

    const add = renderHook(() => useCreateMyLearningItem(), { wrapper })
    await add.result.current.mutateAsync({ title: "Negotiation" })
    expect(spy).toHaveBeenCalledWith({ queryKey: myDevelopmentKeys.learning() })

    spy.mockClear()
    const save = renderHook(() => useUpdateMyLearningItem(), { wrapper })
    await save.result.current.mutateAsync({ itemId: "l1", input: { progress: 40 } })
    expect(updateMyLearningItem).toHaveBeenCalledWith("l1", { progress: 40 })
    expect(spy).toHaveBeenCalledWith({ queryKey: myDevelopmentKeys.learning() })
  })

  type AnyMutation = { mutateAsync: (v: never) => Promise<unknown> }
  const writeCases: [string, () => AnyMutation, jest.Mock, never][] = [
    [
      "a declared gap",
      () => useCreateMyGap() as unknown as AnyMutation,
      createMyGap,
      { competency: "x" } as never,
    ],
    [
      "a progress save",
      () => useUpdateMyLearningItem() as unknown as AnyMutation,
      updateMyLearningItem,
      { itemId: "l1", input: {} } as never,
    ],
  ]

  it.each(writeCases)("rejects rather than reporting success when %s comes back empty", async (
    _label,
    hook,
    svc,
    vars,
  ) => {
    // A 2xx with no `data` is not a saved row. Resolving here would show the
    // person a success for a write that did not happen — the `toast.success`
    // with no mutation behind it, one layer down.
    svc.mockResolvedValue({ data: {} })
    const { result } = renderHook(hook, { wrapper })
    await expect(result.current.mutateAsync(vars)).rejects.toThrow()
  })
})
