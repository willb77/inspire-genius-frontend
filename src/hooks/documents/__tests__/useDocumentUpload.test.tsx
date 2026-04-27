/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useDocumentUpload } from "../useDocumentUpload"
import { uploadDocuments } from "@/services/documents/fileService"
import { vectorizeDocument } from "@/services/documents/documentService"

jest.mock("@/services/documents/fileService", () => ({
  uploadDocuments: jest.fn(),
}))
jest.mock("@/services/documents/documentService", () => ({
  // Stubs for the still-imported (but currently unused) presigned-URL helpers.
  initiateUpload: jest.fn(),
  uploadToS3: jest.fn(),
  triggerProcessing: jest.fn(),
  vectorizeDocument: jest.fn(),
}))
jest.mock("@/services/audit/audit.service", () => ({
  logAuditEvent: jest.fn(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useDocumentUpload", () => {
  beforeEach(() => jest.clearAllMocks())

  it("uploads via monolith multipart and best-effort vectorizes", async () => {
    (uploadDocuments as jest.Mock).mockResolvedValueOnce({
      uploaded_files: [
        { file_id: "d1", filename: "test.pdf", file_type: "pdf", file_key: "k" },
      ],
    });
    (vectorizeDocument as jest.Mock).mockResolvedValueOnce({
      document_id: "d1",
      chunks_stored: 1,
      status: "completed",
      message: "ok",
    })

    const file = new File(["data"], "test.pdf", { type: "application/pdf" })
    const { result } = renderHook(() => useDocumentUpload(), { wrapper })
    act(() => { result.current.mutate({ file }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(uploadDocuments).toHaveBeenCalledWith([file], undefined)
    // Fire-and-forget — verify the call is dispatched with both
    // document_id and file_id set to the monolith file id (so the
    // agent-engine endpoint can resolve via either path).
    expect(vectorizeDocument).toHaveBeenCalledWith(expect.objectContaining({
      document_id: "d1",
      file_id: "d1",
    }))
    expect(result.current.data?.id).toBe("d1")
    expect(result.current.data?.filename).toBe("test.pdf")
  })

  it("still succeeds even when vectorization throws", async () => {
    (uploadDocuments as jest.Mock).mockResolvedValueOnce({
      uploaded_files: [
        { file_id: "d2", filename: "x.pdf", file_type: "pdf", file_key: "k" },
      ],
    });
    (vectorizeDocument as jest.Mock).mockRejectedValueOnce(new Error("boom"))

    const file = new File(["data"], "x.pdf", { type: "application/pdf" })
    const { result } = renderHook(() => useDocumentUpload(), { wrapper })
    act(() => { result.current.mutate({ file }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe("d2")
  })
})
