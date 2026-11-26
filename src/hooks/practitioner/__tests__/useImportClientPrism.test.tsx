/**
 * @jest-environment jsdom
 *
 * TDS U12: after a coach PRISM import the client's PRISM reader and record are
 * refetched, so the page shows the new state without a reload.
 */
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { useImportClientPrism } from "../useCoachClient"

const mockImport = jest.fn()
jest.mock("@/services/practitioner/coachClient.service", () => ({
  importClientPrismCsv: (...args: unknown[]) => mockImport(...args),
}))

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const spy = jest.spyOn(qc, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { spy, ...renderHook(() => useImportClientPrism(), { wrapper }) }
}

const file = new File(["x"], "prism.csv", { type: "text/csv" })

it("refreshes this client's PRISM reader and record after an import", async () => {
  mockImport.mockResolvedValueOnce({ assessmentId: "a-1", scoreCount: 1, typingCount: 0 })
  const { result, spy } = setup()
  await act(async () => {
    await result.current.mutateAsync({ clientId: "cl-1", file })
  })
  expect(mockImport).toHaveBeenCalledWith("cl-1", file)
  const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey))
  expect(keys).toContain(JSON.stringify(["practitioner", "client", "cl-1", "prism"]))
  expect(keys).toContain(JSON.stringify(["practitioner", "client", "cl-1"]))
})

it("refreshes nothing when the import is refused", async () => {
  mockImport.mockRejectedValueOnce(new Error("409"))
  const { result, spy } = setup()
  act(() => {
    result.current.mutate({ clientId: "cl-1", file })
  })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(spy).not.toHaveBeenCalled()
})
