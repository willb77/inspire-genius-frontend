/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useDocumentSearch } from "../useDocumentSearch"
import { searchDocuments } from "@/services/documents/documentService"

jest.mock("@/services/documents/documentService", () => ({ searchDocuments: jest.fn() }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useDocumentSearch", () => {
  beforeEach(() => jest.clearAllMocks())

  it("calls searchDocuments on mutate", async () => {
    const resp = { hits: [], total: 0, query: "test" };
    (searchDocuments as jest.Mock).mockResolvedValueOnce(resp)
    const { result } = renderHook(() => useDocumentSearch(), { wrapper })
    act(() => { result.current.mutate({ query: "test" }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(searchDocuments).toHaveBeenCalledWith({ query: "test" })
    expect(result.current.data).toEqual(resp)
  })
})
