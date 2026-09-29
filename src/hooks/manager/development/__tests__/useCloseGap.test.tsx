/**
 * useCloseGapPlan (TDS-4a) — the sequence, and what each failure says.
 *
 * The defect being removed is a button that reported success without acting. The
 * way it comes back is a PARTIAL success reported as success, so what is pinned
 * here is (a) the close call actually happens, (b) it happens LAST, and (c) each
 * failure message names what was written and what was not.
 */
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"

const createLearningItem = jest.fn()
const createMilestone = jest.fn()
const closeGap = jest.fn()
const calls: string[] = []

jest.mock("@/services/manager/development/growthService", () => ({
  createLearningItem: (...a: unknown[]) => {
    calls.push("learning")
    return createLearningItem(...a)
  },
  createMilestone: (...a: unknown[]) => {
    calls.push("milestone")
    return createMilestone(...a)
  },
  closeGap: (...a: unknown[]) => {
    calls.push("close")
    return closeGap(...a)
  },
}))

import { useCloseGapPlan } from "../useCloseGap"
import { developmentKeys } from "../queryKeys"
import type { DevelopmentGap } from "@/types/development"

const gap = (over: Partial<DevelopmentGap> = {}): DevelopmentGap => ({
  gapId: "gap-1",
  memberId: "m-1",
  competency: "Delegation",
  currentLevel: 2,
  targetLevel: 4,
  severity: "moderate",
  source: "behavioral",
  status: "open",
  ...over,
})

let client: QueryClient
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  calls.length = 0
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  createLearningItem.mockResolvedValue({ data: { data: { itemId: "li-1" } } })
  createMilestone.mockResolvedValue({ data: { data: { milestoneId: "ms-1" } } })
  closeGap.mockResolvedValue({ data: { data: gap({ status: "closed" }) } })
})

it("closes the gap the label names, and closes it LAST", async () => {
  const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
  const out = await result.current.mutateAsync({ gap: gap({ goalId: "g-1" }) })
  expect(calls).toEqual(["learning", "milestone", "close"])
  expect(closeGap).toHaveBeenCalledWith("m-1", "gap-1")
  expect(out.gap.status).toBe("closed")
})

it("seeds the learning item against the gap, and the milestone against its goal", async () => {
  const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
  await result.current.mutateAsync({ gap: gap({ goalId: "g-1" }) })
  expect(createLearningItem).toHaveBeenCalledWith("m-1", {
    gapId: "gap-1",
    goalId: "g-1",
    title: "Close gap: Delegation",
  })
  expect(createMilestone).toHaveBeenCalledWith("m-1", {
    goalId: "g-1",
    title: "Close Delegation gap",
    horizon: "d90",
    gapIds: ["gap-1"],
  })
})

it("still closes a gap that serves no goal — the milestone is the optional step", async () => {
  const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
  const out = await result.current.mutateAsync({ gap: gap() })
  expect(calls).toEqual(["learning", "close"])
  expect(createMilestone).not.toHaveBeenCalled()
  expect(out.milestone).toBeUndefined()
})

describe("a partial success is never reported as a success", () => {
  it("does not close the gap when the learning item failed", async () => {
    createLearningItem.mockRejectedValue({ response: { data: { detail: "no such gap" } } })
    const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
    await expect(result.current.mutateAsync({ gap: gap({ goalId: "g-1" }) })).rejects.toThrow(
      /learning item couldn't be created, so the gap was left open\. no such gap/,
    )
    expect(closeGap).not.toHaveBeenCalled()
    expect(createMilestone).not.toHaveBeenCalled()
  })

  it("does not close the gap when the milestone failed, and says the item WAS created", async () => {
    createMilestone.mockRejectedValue({ response: { data: { detail: "goal is not shared" } } })
    const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
    await expect(result.current.mutateAsync({ gap: gap({ goalId: "g-1" }) })).rejects.toThrow(
      /learning item was created, but the milestone wasn't — the gap was left open\. goal is not shared/,
    )
    expect(closeGap).not.toHaveBeenCalled()
  })

  it("says the gap is STILL OPEN when only the close failed", async () => {
    closeGap.mockRejectedValue({ response: { status: 404, data: { detail: "Gap not found" } } })
    const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
    await expect(result.current.mutateAsync({ gap: gap({ goalId: "g-1" }) })).rejects.toThrow(
      /learning item and milestone were created, but the gap could not be closed — it is still open\. Gap not found/,
    )
  })

  it("an empty close envelope is a failure, not a closed gap", async () => {
    closeGap.mockResolvedValue({ data: { data: null } })
    const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
    await expect(result.current.mutateAsync({ gap: gap() })).rejects.toThrow(/still open/)
  })

  it("renders a 422 detail array as a STRING, never as an object", async () => {
    closeGap.mockRejectedValue({
      response: { data: { detail: [{ loc: ["body", "gapId"], msg: "Input should be a valid string" }] } },
    })
    const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
    await expect(result.current.mutateAsync({ gap: gap() })).rejects.toThrow(/gapId/)
  })
})

describe("the surface reflects the gap the server returned", () => {
  it("replaces the gap in EVERY target-blueprint variant of the cache", async () => {
    const openGap = gap()
    client.setQueryData(developmentKeys.gaps("m-1"), [openGap])
    client.setQueryData(developmentKeys.gaps("m-1", "bp-1"), [openGap])
    const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
    await result.current.mutateAsync({ gap: openGap })
    await waitFor(() => {
      expect(client.getQueryData<DevelopmentGap[]>(developmentKeys.gaps("m-1"))?.[0].status).toBe("closed")
    })
    // The target-specific key is the one a naive `gaps(memberId)` invalidation
    // would miss, leaving a closed gap still offering to be closed.
    expect(
      client.getQueryData<DevelopmentGap[]>(developmentKeys.gaps("m-1", "bp-1"))?.[0].status,
    ).toBe("closed")
  })

  it("leaves a cache it has no gaps for alone", async () => {
    client.setQueryData(developmentKeys.gaps("m-1"), undefined)
    const { result } = renderHook(() => useCloseGapPlan("m-1"), { wrapper })
    await result.current.mutateAsync({ gap: gap() })
    expect(client.getQueryData(developmentKeys.gaps("m-1"))).toBeUndefined()
  })
})
