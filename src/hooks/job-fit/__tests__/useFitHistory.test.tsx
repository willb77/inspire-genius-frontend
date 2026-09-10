/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }))
const svc = { getHistory: jest.fn(), getSnapshot: jest.fn(), saveSnapshot: jest.fn() }
jest.mock("@/services/job-fit/fit.service", () => ({
  fitService: {
    getHistory: (...a: unknown[]) => svc.getHistory(...a),
    getSnapshot: (...a: unknown[]) => svc.getSnapshot(...a),
    saveSnapshot: (...a: unknown[]) => svc.saveSnapshot(...a),
  },
}))

import { useFitHistory, useFitSnapshot, useSaveFitReport, FIT_HISTORY_KEY } from "../useFitHistory"

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  return { qc, wrapper }
}

beforeEach(() => {
  svc.getHistory.mockReset(); svc.getSnapshot.mockReset(); svc.saveSnapshot.mockReset()
  ;(toast.error as jest.Mock).mockReset()
})

test("useFitHistory returns the rows and an empty list for an empty envelope", async () => {
  svc.getHistory.mockResolvedValueOnce({ data: { data: [{ id: "s1", source: "detail" }] } })
  const { wrapper } = wrap()
  const { result } = renderHook(() => useFitHistory(), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual([{ id: "s1", source: "detail" }])
})

test("useFitSnapshot does not retry a 404", async () => {
  svc.getSnapshot.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
  const { wrapper } = wrap()
  const { result } = renderHook(() => useFitSnapshot("missing"), { wrapper })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(svc.getSnapshot).toHaveBeenCalledTimes(1)
})

test("useSaveFitReport posts, then invalidates the history list; a failure toasts", async () => {
  svc.saveSnapshot.mockResolvedValueOnce({ data: { data: { id: "s9", source: "saved" } } })
  const { qc, wrapper } = wrap()
  const spy = jest.spyOn(qc, "invalidateQueries")
  const { result } = renderHook(() => useSaveFitReport(), { wrapper })
  await result.current.mutateAsync({ roleTitle: "Ops", fitScore: 70, payload: {} })
  expect(svc.saveSnapshot).toHaveBeenCalledWith({ roleTitle: "Ops", fitScore: 70, payload: {} })
  expect(spy).toHaveBeenCalledWith({ queryKey: FIT_HISTORY_KEY })

  svc.saveSnapshot.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503 } })
  await expect(result.current.mutateAsync({ payload: {} })).rejects.toBeTruthy()
  expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/couldn't save/i))
})

test("an empty envelope on save is an error, not a silent success", async () => {
  svc.saveSnapshot.mockResolvedValueOnce({ data: { data: null } })
  const { wrapper } = wrap()
  const { result } = renderHook(() => useSaveFitReport(), { wrapper })
  await expect(result.current.mutateAsync({ payload: {} })).rejects.toBeTruthy()
})
