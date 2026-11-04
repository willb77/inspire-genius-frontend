/**
 * @jest-environment jsdom
 *
 * DOC-AV-1 — the upload hook shows "checking the file…" only while the server
 * is waiting on the virus scan, and a refused file fails the upload.
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { toast } from "sonner"
import { useDocumentUpload } from "../useDocumentUpload"
import { initiateUpload, uploadToS3, triggerProcessing } from "@/services/documents/documentService"
import { DocumentRejectedError } from "@/lib/documents/scan"

jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: jest.fn(),
  uploadToS3: jest.fn(),
  triggerProcessing: jest.fn(),
}))
jest.mock("@/services/audit/audit.service", () => ({ logAuditEvent: jest.fn() }))
jest.mock("sonner", () => ({ toast: { loading: jest.fn(), dismiss: jest.fn() } }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(initiateUpload as jest.Mock).mockResolvedValue({ document_id: "d1", upload_url: "u", upload_fields: {} })
  ;(uploadToS3 as jest.Mock).mockResolvedValue(undefined)
})

const file = new File(["x"], "cv.pdf", { type: "application/pdf" })

it("passes onChecking; when the server waits, the notice shows and is dismissed", async () => {
  ;(triggerProcessing as jest.Mock).mockImplementation(async (_id, opts) => {
    opts.onChecking()
    return { id: "d1", status: "ready" }
  })
  const { result } = renderHook(() => useDocumentUpload(), { wrapper })
  act(() => result.current.mutate({ file }))
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(triggerProcessing).toHaveBeenCalledWith("d1", { onChecking: expect.any(Function) })
  expect(toast.loading).toHaveBeenCalledWith("Checking cv.pdf for viruses…", expect.anything())
  expect(toast.dismiss).toHaveBeenCalledTimes(1)
})

it("shows no notice when the server didn't wait", async () => {
  ;(triggerProcessing as jest.Mock).mockResolvedValue({ id: "d1", status: "ready" })
  const { result } = renderHook(() => useDocumentUpload(), { wrapper })
  act(() => result.current.mutate({ file }))
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(toast.loading).not.toHaveBeenCalled()
  expect(toast.dismiss).not.toHaveBeenCalled()
})

it("a refused file fails the upload with the reason, and the notice is still dismissed", async () => {
  ;(triggerProcessing as jest.Mock).mockImplementation(async (_id, opts) => {
    opts.onChecking()
    throw new DocumentRejectedError("A threat was found in this file")
  })
  const { result } = renderHook(() => useDocumentUpload(), { wrapper })
  act(() => result.current.mutate({ file }))
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.error?.message).toBe("This file wasn't accepted: A threat was found in this file")
  expect(toast.dismiss).toHaveBeenCalledTimes(1)
})
