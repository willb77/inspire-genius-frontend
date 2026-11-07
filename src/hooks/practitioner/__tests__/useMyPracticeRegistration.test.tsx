import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMyPracticeRegistration } from "../useMyPracticeRegistration"

const getMine = jest.fn()
jest.mock("@/services/practitioner-practice/practitionerPractice.service", () => ({
  getMyPracticeRegistration: () => getMine(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useMyPracticeRegistration", () => {
  it("returns the service's state", async () => {
    getMine.mockResolvedValue({ state: "missing" })
    const { result } = renderHook(() => useMyPracticeRegistration(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ state: "missing" })
  })

  it("surfaces a failure as an error, without retrying", async () => {
    getMine.mockReset()
    getMine.mockRejectedValue(new Error("503"))
    const { result } = renderHook(() => useMyPracticeRegistration(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(getMine).toHaveBeenCalledTimes(1)
  })
})
