/**
 * My Goals hooks (Goals offering, Phase 3).
 *
 * The claim under test is the cache contract: publish and unpublish touch
 * BOTH stores, so both queries must be invalidated together — otherwise a
 * goal is a draft and published at once for a render. And no hook toasts.
 */
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import {
  myGoalsKeys,
  useCreateGoal,
  useMyGoals,
  usePublishGoal,
  useSetGoalVisibility,
  useUnpublishGoal,
} from "../useMyGoals"
import { summitKeys } from "../useGoalSession"

const mockGetMyGoals = jest.fn()
const mockPublish = jest.fn()
const mockUnpublish = jest.fn()
const mockSetVisibility = jest.fn()
const mockCreate = jest.fn()
jest.mock("@/services/summit/goals.service", () => ({
  getMyGoals: () => mockGetMyGoals(),
  publishGoal: (...a: unknown[]) => mockPublish(...a),
  unpublishGoal: (...a: unknown[]) => mockUnpublish(...a),
  setGoalVisibility: (...a: unknown[]) => mockSetVisibility(...a),
  createGoal: (...a: unknown[]) => mockCreate(...a),
  getGoalSession: jest.fn(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
}))

function wrapperFor(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

beforeEach(() => jest.clearAllMocks())

it("reads my goals under its own key", async () => {
  mockGetMyGoals.mockResolvedValue({ memberId: "m1", goals: [], coverage: [] })
  const qc = makeClient()
  const { result } = renderHook(() => useMyGoals(), { wrapper: wrapperFor(qc) })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(qc.getQueryData(myGoalsKeys.mine)).toEqual({ memberId: "m1", goals: [], coverage: [] })
})

describe("mutations invalidate both stores", () => {
  for (const [name, useHook, mock, arg] of [
    ["publish", usePublishGoal, mockPublish, "s1"],
    ["unpublish", useUnpublishGoal, mockUnpublish, "s1"],
    ["create", useCreateGoal, mockCreate, { title: "x", category: "job" }],
  ] as const) {
    it(`${name} invalidates the session AND the shared list`, async () => {
      mock.mockResolvedValue({})
      const qc = makeClient()
      const spy = jest.spyOn(qc, "invalidateQueries")
      const { result } = renderHook(() => (useHook as () => { mutateAsync: (a: unknown) => Promise<unknown> })(), {
        wrapper: wrapperFor(qc),
      })
      await act(async () => {
        await result.current.mutateAsync(arg)
      })
      const keys = spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey))
      expect(keys).toContain(JSON.stringify(summitKeys.session))
      expect(keys).toContain(JSON.stringify(myGoalsKeys.mine))
    })
  }
})

it("visibility invalidates the shared list and passes the literal through", async () => {
  mockSetVisibility.mockResolvedValue({})
  const qc = makeClient()
  const spy = jest.spyOn(qc, "invalidateQueries")
  const { result } = renderHook(() => useSetGoalVisibility(), { wrapper: wrapperFor(qc) })
  await act(async () => {
    await result.current.mutateAsync({ goalId: "b1", visibility: "private" })
  })
  expect(mockSetVisibility).toHaveBeenCalledWith("b1", "private")
  const keys = spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey))
  expect(keys).toContain(JSON.stringify(myGoalsKeys.mine))
})

it("a failed publish surfaces as an error, and invalidates nothing", async () => {
  mockPublish.mockRejectedValue(new Error("nope"))
  const qc = makeClient()
  const spy = jest.spyOn(qc, "invalidateQueries")
  const { result } = renderHook(() => usePublishGoal(), { wrapper: wrapperFor(qc) })
  await act(async () => {
    await result.current.mutateAsync("s1").catch(() => undefined)
  })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(spy).not.toHaveBeenCalled()
})
