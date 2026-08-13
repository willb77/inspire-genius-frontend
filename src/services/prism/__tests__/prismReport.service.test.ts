/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  getMyPrismReport,
  getMyPrismReportDownloadUrl,
  getPrismReportDownloadUrl,
} from "../prismReport.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("prismReport.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("getMyPrismReport GETs /v1/prism/report/me and returns the raw body", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { available: true, request_id: "r1", pdf_available: true },
    })
    const res = await getMyPrismReport()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/prism/report/me")
    expect(res.available).toBe(true)
    expect(res.request_id).toBe("r1")
  })

  it("getPrismReportDownloadUrl GETs the download route with the kind param", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { status: true, url: "https://s3/x.pdf", kind: "pdf", filename: "x.pdf", expires_in: 300 },
    })
    const res = await getPrismReportDownloadUrl("r1", "pdf")
    expect(mockApi.get).toHaveBeenCalledWith(
      "/v1/prism/requests/r1/report/download",
      { params: { kind: "pdf" } },
    )
    expect(res.url).toBe("https://s3/x.pdf")
  })

  it("getPrismReportDownloadUrl defaults kind to pdf", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { status: true, url: "u", kind: "pdf", filename: "f", expires_in: 300 },
    })
    await getPrismReportDownloadUrl("r2")
    expect(mockApi.get).toHaveBeenCalledWith(
      "/v1/prism/requests/r2/report/download",
      { params: { kind: "pdf" } },
    )
  })

  it("getMyPrismReportDownloadUrl GETs the request-independent route", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { status: true, url: "https://s3/me.pdf", kind: "pdf", filename: "me.pdf", expires_in: 300 },
    })
    const res = await getMyPrismReportDownloadUrl("pdf")
    expect(mockApi.get).toHaveBeenCalledWith(
      "/v1/prism/report/me/download",
      { params: { kind: "pdf" } },
    )
    expect(res.url).toBe("https://s3/me.pdf")
  })

  it("getMyPrismReportDownloadUrl defaults kind to pdf", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { status: true, url: "u", kind: "pdf", filename: "f", expires_in: 300 },
    })
    await getMyPrismReportDownloadUrl()
    expect(mockApi.get).toHaveBeenCalledWith(
      "/v1/prism/report/me/download",
      { params: { kind: "pdf" } },
    )
  })
})
