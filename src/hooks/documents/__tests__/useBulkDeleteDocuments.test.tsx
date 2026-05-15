/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useBulkDeleteDocuments } from "../useBulkDeleteDocuments"
import { bulkDeleteDocuments } from "@/services/documents/fileService"

jest.mock("@/services/documents/fileService", () => ({ bulkDeleteDocuments: jest.fn() }))
jest.mock("@/services/audit/audit.service", () => ({ logAuditEvent: jest.fn() }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useBulkDeleteDocuments", () => {
  beforeEach(() => jest.clearAllMocks())

  it("calls bulkDeleteDocuments service", async () => {
    (bulkDeleteDocuments as jest.Mock).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useBulkDeleteDocuments(), { wrapper })
    act(() => { result.current.mutate(["f1", "f2"]) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(bulkDeleteDocuments).toHaveBeenCalledWith(["f1", "f2"])
  })
})
