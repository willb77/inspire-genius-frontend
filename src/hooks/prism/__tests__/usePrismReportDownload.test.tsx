/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  useAdminDeletePrismPdf,
  useAdminUploadPrismPdf,
  useMyPrismReport,
  useMyPrismReportDownloadUrl,
  usePrismReportDownloadUrl,
  useReplaceMyPrismReport,
} from "../usePrismReportDownload"
import {
  adminDeleteUserPrismPdf,
  adminUploadUserPrismPdf,
  getMyPrismReport,
  getMyPrismReportDownloadUrl,
  getPrismReportDownloadUrl,
  replaceMyPrismReport,
} from "@/services/prism/prismReport.service"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/services/prism/prismReport.service", () => ({
  getMyPrismReport: jest.fn(),
  getMyPrismReportDownloadUrl: jest.fn(),
  getPrismReportDownloadUrl: jest.fn(),
  replaceMyPrismReport: jest.fn(),
  adminUploadUserPrismPdf: jest.fn(),
  adminDeleteUserPrismPdf: jest.fn(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("usePrismReportDownload", () => {
  beforeEach(() => jest.clearAllMocks())

  it("useMyPrismReport fetches the caller's latest report", async () => {
    ;(getMyPrismReport as jest.Mock).mockResolvedValueOnce({
      available: true,
      request_id: "r1",
      pdf_available: true,
    })
    const { result } = renderHook(() => useMyPrismReport(true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getMyPrismReport).toHaveBeenCalled()
    expect(result.current.data?.request_id).toBe("r1")
  })

  it("useMyPrismReport is disabled when not enabled", () => {
    renderHook(() => useMyPrismReport(false), { wrapper })
    expect(getMyPrismReport).not.toHaveBeenCalled()
  })

  it("usePrismReportDownloadUrl fetches a presigned URL for a request", async () => {
    ;(getPrismReportDownloadUrl as jest.Mock).mockResolvedValueOnce({
      status: true,
      url: "https://s3/x.pdf",
      kind: "pdf",
      filename: "x.pdf",
      expires_in: 300,
    })
    const { result } = renderHook(() => usePrismReportDownloadUrl(), { wrapper })
    let url = ""
    await act(async () => {
      const res = await result.current.mutateAsync({ requestId: "r1", kind: "pdf" })
      url = res.url
    })
    expect(getPrismReportDownloadUrl).toHaveBeenCalledWith("r1", "pdf")
    expect(url).toBe("https://s3/x.pdf")
  })

  it("useMyPrismReportDownloadUrl fetches a request-independent presigned URL", async () => {
    ;(getMyPrismReportDownloadUrl as jest.Mock).mockResolvedValueOnce({
      status: true,
      url: "https://s3/me.pdf",
      kind: "pdf",
      filename: "me.pdf",
      expires_in: 300,
    })
    const { result } = renderHook(() => useMyPrismReportDownloadUrl(), { wrapper })
    let url = ""
    await act(async () => {
      const res = await result.current.mutateAsync({ kind: "pdf" })
      url = res.url
    })
    expect(getMyPrismReportDownloadUrl).toHaveBeenCalledWith("pdf")
    expect(url).toBe("https://s3/me.pdf")
  })

  it("useMyPrismReportDownloadUrl defaults kind to pdf when called with no args", async () => {
    ;(getMyPrismReportDownloadUrl as jest.Mock).mockResolvedValueOnce({
      status: true,
      url: "u",
      kind: "pdf",
      filename: "f",
      expires_in: 300,
    })
    const { result } = renderHook(() => useMyPrismReportDownloadUrl(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync()
    })
    expect(getMyPrismReportDownloadUrl).toHaveBeenCalledWith("pdf")
  })
it("useReplaceMyPrismReport calls the service with csv + pdf", async () => {
    ;(replaceMyPrismReport as jest.Mock).mockResolvedValueOnce({
      status: true, assessment_id: "a", scores_written: 10,
      colours: {}, pdf_replaced: true,
    })
    const { result } = renderHook(() => useReplaceMyPrismReport(), { wrapper })
    const csv = new File(["x"], "s.csv", { type: "text/csv" })
    const pdf = new File(["%PDF-1.7 x"], "r.pdf", { type: "application/pdf" })
    await act(async () => {
      await result.current.mutateAsync({ csv, pdf })
    })
    expect(replaceMyPrismReport).toHaveBeenCalledWith(csv, pdf)
  })

  it("useAdminUploadPrismPdf calls the service with userId + pdf", async () => {
    ;(adminUploadUserPrismPdf as jest.Mock).mockResolvedValueOnce({
      status: true, s3_key: "k", file_size: 1,
    })
    const { result } = renderHook(() => useAdminUploadPrismPdf(), { wrapper })
    const pdf = new File(["%PDF-1.7 x"], "r.pdf", { type: "application/pdf" })
    await act(async () => {
      await result.current.mutateAsync({ userId: "u1", pdf })
    })
    expect(adminUploadUserPrismPdf).toHaveBeenCalledWith("u1", pdf)
  })

  it("useAdminDeletePrismPdf calls the service with userId", async () => {
    ;(adminDeleteUserPrismPdf as jest.Mock).mockResolvedValueOnce({
      status: true, deleted_document_rows: 1,
    })
    const { result } = renderHook(() => useAdminDeletePrismPdf(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ userId: "u1" })
    })
    expect(adminDeleteUserPrismPdf).toHaveBeenCalledWith("u1")
  })
})
