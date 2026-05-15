/**
 * @jest-environment jsdom
 *
 * useDocumentUpload tests — post-B.2 rewire (2026-05-13). The hook now
 * routes through document-service: presigned URL → S3 PUT → /process.
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useDocumentUpload } from "../useDocumentUpload"
import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
} from "@/services/documents/documentService"

jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: jest.fn(),
  uploadToS3: jest.fn(),
  triggerProcessing: jest.fn(),
}))
jest.mock("@/services/audit/audit.service", () => ({
  logAuditEvent: jest.fn(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useDocumentUpload (B.2 flow)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("runs presigned URL → S3 → process and returns the DocumentOut", async () => {
    ;(initiateUpload as jest.Mock).mockResolvedValueOnce({
      document_id: "d1",
      upload_url: "https://s3.example/u",
      upload_fields: { key: "k" },
      s3_key: "user/d1.pdf",
      expires_in: 900,
    })
    ;(uploadToS3 as jest.Mock).mockResolvedValueOnce(undefined)
    ;(triggerProcessing as jest.Mock).mockResolvedValueOnce({
      id: "d1",
      filename: "test.pdf",
      doc_kind: "pdf",
      status: "processing",
    })

    const file = new File(["data"], "test.pdf", { type: "application/pdf" })
    const { result } = renderHook(() => useDocumentUpload(), { wrapper })
    act(() => {
      result.current.mutate({ file })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(initiateUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "test.pdf",
        content_type: "application/pdf",
        file_size: file.size,
      }),
    )
    expect(uploadToS3).toHaveBeenCalledWith(
      "https://s3.example/u",
      { key: "k" },
      file,
      undefined,
    )
    expect(triggerProcessing).toHaveBeenCalledWith("d1")
    expect(result.current.data?.id).toBe("d1")
    expect(result.current.data?.filename).toBe("test.pdf")
  })

  it("propagates errors from triggerProcessing", async () => {
    ;(initiateUpload as jest.Mock).mockResolvedValueOnce({
      document_id: "d2",
      upload_url: "https://s3.example/u",
      upload_fields: {},
      s3_key: "user/d2.pdf",
      expires_in: 900,
    })
    ;(uploadToS3 as jest.Mock).mockResolvedValueOnce(undefined)
    ;(triggerProcessing as jest.Mock).mockRejectedValueOnce(
      new Error("processing failed"),
    )

    const file = new File(["data"], "x.pdf", { type: "application/pdf" })
    const { result } = renderHook(() => useDocumentUpload(), { wrapper })
    act(() => {
      result.current.mutate({ file })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe("processing failed")
  })
})
