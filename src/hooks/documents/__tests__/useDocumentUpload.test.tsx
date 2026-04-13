/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useDocumentUpload } from "../useDocumentUpload"
import { initiateUpload, uploadToS3, triggerProcessing } from "@/services/documents/documentService"

jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: jest.fn(),
  uploadToS3: jest.fn(),
  triggerProcessing: jest.fn(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useDocumentUpload", () => {
  beforeEach(() => jest.clearAllMocks())

  it("performs 3-step upload flow", async () => {
    const presigned = { document_id: "d1", upload_url: "https://s3.example.com", upload_fields: {}, s3_key: "k", expires_in: 3600 }
    const doc = { id: "d1", filename: "test.pdf" };
    (initiateUpload as jest.Mock).mockResolvedValueOnce(presigned);
    (uploadToS3 as jest.Mock).mockResolvedValueOnce(undefined);
    (triggerProcessing as jest.Mock).mockResolvedValueOnce(doc)

    const file = new File(["data"], "test.pdf", { type: "application/pdf" })
    const { result } = renderHook(() => useDocumentUpload(), { wrapper })
    act(() => { result.current.mutate({ file }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(initiateUpload).toHaveBeenCalled()
    expect(uploadToS3).toHaveBeenCalled()
    expect(triggerProcessing).toHaveBeenCalledWith("d1")
    expect(result.current.data).toEqual(doc)
  })
})
