/**
 * The learning-item hooks. The one thing worth pinning on both is that an
 * envelope the server acknowledged WITHOUT a row is a failure — otherwise a
 * surface reports "saved" over a write that produced nothing, which is the
 * defect class TDS-4a exists to remove.
 */
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"

const createLearningItem = jest.fn()
const updateLearningItem = jest.fn()
jest.mock("@/services/manager/development/growthService", () => ({
  createLearningItem: (...a: unknown[]) => createLearningItem(...a),
  updateLearningItem: (...a: unknown[]) => updateLearningItem(...a),
}))

import { useLearningPlan, useUpdateLearningItem } from "../useLearningPlan"
import { developmentKeys } from "../queryKeys"

let client: QueryClient
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
})

it("writes only the fields it was given, and returns the item the server sent", async () => {
  updateLearningItem.mockResolvedValue({ data: { data: { itemId: "li-1", progress: 60 } } })
  const { result } = renderHook(() => useUpdateLearningItem("m-1"), { wrapper })
  const out = await result.current.mutateAsync({ itemId: "li-1", input: { progress: 60 } })
  expect(updateLearningItem).toHaveBeenCalledWith("m-1", "li-1", { progress: 60 })
  expect(out.progress).toBe(60)
})

it("an empty PATCH envelope is a failure, not a saved item", async () => {
  updateLearningItem.mockResolvedValue({ data: { data: null } })
  const { result } = renderHook(() => useUpdateLearningItem("m-1"), { wrapper })
  await expect(
    result.current.mutateAsync({ itemId: "li-1", input: { progress: 60 } }),
  ).rejects.toThrow(/was not updated/i)
})

it("refetches the dossier after a save, because that is where the learning list lives", async () => {
  updateLearningItem.mockResolvedValue({ data: { data: { itemId: "li-1" } } })
  const spy = jest.spyOn(client, "invalidateQueries")
  const { result } = renderHook(() => useUpdateLearningItem("m-1"), { wrapper })
  await result.current.mutateAsync({ itemId: "li-1", input: { status: "complete" } })
  expect(spy).toHaveBeenCalledWith({ queryKey: developmentKeys.dossier("m-1") })
})

it("an empty CREATE envelope is a failure too", async () => {
  createLearningItem.mockResolvedValue({ data: { data: undefined } })
  const { result } = renderHook(() => useLearningPlan("m-1"), { wrapper })
  await expect(result.current.mutateAsync({ title: "x" })).rejects.toThrow(
    /Create learning item failed/i,
  )
})
