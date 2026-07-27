/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useDraftBenchmark } from "../useDraftBenchmark"

const draftBenchmark = jest.fn()
jest.mock("@/services/job-blueprint", () => ({
  draftService: { draftBenchmark: (...args: unknown[]) => draftBenchmark(...args) },
}))

const toastError = jest.fn()
jest.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useDraftBenchmark", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns the drafted benchmark on success", async () => {
    const payload = { role_title: "CIO", archetype: "executive", rationale: "r", behaviors: [{ dimension_id: 1 }], aptitudes: [], core_traits: [] }
    draftBenchmark.mockResolvedValue({ data: payload })

    const { result } = renderHook(() => useDraftBenchmark(), { wrapper })
    act(() => { result.current.mutate({ role_title: "CIO", archetype: "executive" }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(payload)
    expect(draftBenchmark).toHaveBeenCalledWith({ role_title: "CIO", archetype: "executive" })
  })

  it("surfaces a toast and errors when no blueprint is returned", async () => {
    draftBenchmark.mockResolvedValue({ data: null })

    const { result } = renderHook(() => useDraftBenchmark(), { wrapper })
    act(() => { result.current.mutate({ role_title: "CIO" }) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toastError).toHaveBeenCalled()
  })
})
