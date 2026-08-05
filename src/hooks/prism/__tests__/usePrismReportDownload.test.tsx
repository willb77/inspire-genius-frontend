/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  useMyPrismReport,
  usePrismReportDownloadUrl,
} from "../usePrismReportDownload"
import {
  getMyPrismReport,
  getPrismReportDownloadUrl,
} from "@/services/prism/prismReport.service"

jest.mock("@/services/prism/prismReport.service", () => ({
  getMyPrismReport: jest.fn(),
  getPrismReportDownloadUrl: jest.fn(),
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
})
