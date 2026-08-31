/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  adminDeleteUserPrismPdf,
  adminUploadUserPrismPdf,
  getMyPrismReport,
  getMyPrismReportDownloadUrl,
  getPrismReportDownloadUrl,
  replaceMyPrismReport,
} from "../prismReport.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
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
it("replaceMyPrismReport POSTs multipart to /report/me/replace with csv (+pdf)", async () => {
    ;(mockApi.post as jest.Mock).mockResolvedValueOnce({
      data: { status: true, assessment_id: "a1", scores_written: 10,
              colours: { gold: 65.5 }, pdf_replaced: true },
    })
    const csv = new File(["raw"], "scores.csv", { type: "text/csv" })
    const pdf = new File(["%PDF-1.7 x"], "report.pdf", { type: "application/pdf" })
    const res = await replaceMyPrismReport(csv, pdf)
    expect(mockApi.post).toHaveBeenCalledTimes(1)
    const [url, form, cfg] = (mockApi.post as jest.Mock).mock.calls[0]
    expect(url).toBe("/v1/prism/report/me/replace")
    expect(form).toBeInstanceOf(FormData)
    expect((form as FormData).get("csv")).toBe(csv)
    expect((form as FormData).get("pdf")).toBe(pdf)
    expect(cfg.headers["Content-Type"]).toBe("multipart/form-data")
    expect(res.pdf_replaced).toBe(true)
  })

  it("replaceMyPrismReport omits pdf when not provided", async () => {
    ;(mockApi.post as jest.Mock).mockResolvedValueOnce({ data: { status: true } })
    const csv = new File(["raw"], "scores.csv", { type: "text/csv" })
    await replaceMyPrismReport(csv)
    const [, form] = (mockApi.post as jest.Mock).mock.calls[0]
    expect((form as FormData).get("pdf")).toBeNull()
  })

  it("adminUploadUserPrismPdf POSTs to the admin per-user prism-pdf route", async () => {
    ;(mockApi.post as jest.Mock).mockResolvedValueOnce({
      data: { status: true, s3_key: "k", file_size: 100 },
    })
    const pdf = new File(["%PDF-1.7 x"], "r.pdf", { type: "application/pdf" })
    await adminUploadUserPrismPdf("u1", pdf)
    const [url, form] = (mockApi.post as jest.Mock).mock.calls[0]
    expect(url).toBe("/v1/profile/admin/users/u1/prism-pdf")
    expect((form as FormData).get("file")).toBe(pdf)
  })

  it("adminDeleteUserPrismPdf DELETEs the admin per-user prism-pdf route", async () => {
    ;(mockApi.delete as jest.Mock).mockResolvedValueOnce({
      data: { status: true, deleted_document_rows: 2 },
    })
    const res = await adminDeleteUserPrismPdf("u1")
    expect(mockApi.delete).toHaveBeenCalledWith("/v1/profile/admin/users/u1/prism-pdf")
    expect(res.deleted_document_rows).toBe(2)
  })
})
