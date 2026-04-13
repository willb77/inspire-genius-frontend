/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useUploadDocuments } from "../useUploadDocuments"
import { uploadDocuments } from "@/services/documents/fileService"

jest.mock("@/services/documents/fileService", () => ({ uploadDocuments: jest.fn() }))
jest.mock("@/services/audit/audit.service", () => ({ logAuditEvent: jest.fn() }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useUploadDocuments", () => {
  beforeEach(() => jest.clearAllMocks())

  it("calls uploadDocuments with files", async () => {
    (uploadDocuments as jest.Mock).mockResolvedValueOnce({ uploaded: 1 })
    const file = new File(["content"], "test.txt", { type: "text/plain" })
    const { result } = renderHook(() => useUploadDocuments(), { wrapper })
    act(() => { result.current.mutate({ files: [file] }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(uploadDocuments).toHaveBeenCalledWith([file], undefined)
  })
})
