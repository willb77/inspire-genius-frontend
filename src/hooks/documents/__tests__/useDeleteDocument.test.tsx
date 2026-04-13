/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useDeleteDocument } from "../useDeleteDocument"
import { deleteDocument } from "@/services/documents/fileService"

jest.mock("@/services/documents/fileService", () => ({ deleteDocument: jest.fn() }))
jest.mock("@/services/audit/audit.service", () => ({ logAuditEvent: jest.fn() }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useDeleteDocument", () => {
  beforeEach(() => jest.clearAllMocks())

  it("calls deleteDocument service", async () => {
    (deleteDocument as jest.Mock).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useDeleteDocument(), { wrapper })
    act(() => { result.current.mutate("f1") })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteDocument).toHaveBeenCalledWith("f1")
  })
})
