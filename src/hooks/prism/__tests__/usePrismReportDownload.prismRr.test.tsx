/**
 * @jest-environment jsdom
 *
 * PRISM-RR P3: the replace mutation's PDF path, its section-loss 409, the
 * Behavioral-map refresh, readable errors, and the super-admin scores delete.
 */
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { toast } from "sonner"
import {
  errorDetail,
  sectionLossOf,
  useAdminDeletePrismScores,
  useReplaceMyPrismReport,
} from "../usePrismReportDownload"
import {
  adminDeleteUserPrismScores,
  replaceMyPrismReport,
} from "@/services/prism/prismReport.service"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))
jest.mock("@/services/prism/prismReport.service", () => ({
  getMyPrismReport: jest.fn(),
  getMyPrismReportDownloadUrl: jest.fn(),
  getPrismReportDownloadUrl: jest.fn(),
  replaceMyPrismReport: jest.fn(),
  adminUploadUserPrismPdf: jest.fn(),
  adminDeleteUserPrismPdf: jest.fn(),
  adminDeleteUserPrismScores: jest.fn(),
}))

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = jest.spyOn(qc, "invalidateQueries")
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidate }
}

const axiosErr = (status: number, detail: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { detail } },
  })

describe("errorDetail", () => {
  it("reads a plain string detail", () => {
    expect(errorDetail(axiosErr(422, "CSV parse failed: x"))).toBe("CSV parse failed: x")
  })
  it("reads the replace route's {code, message} object — never [object Object]", () => {
    const e = axiosErr(422, { code: "extraction_failed", message: "This PDF does not look like a PRISM report we can read." })
    expect(errorDetail(e)).toBe("This PDF does not look like a PRISM report we can read.")
  })
  it("reads FastAPI's 422 list", () => {
    const e = axiosErr(422, [{ type: "missing", loc: ["body", "csv"], msg: "Field required" }])
    expect(errorDetail(e)).toBe("csv: Field required")
  })
  it("falls back to the error message", () => {
    expect(errorDetail(new Error("Network Error"))).toBe("Network Error")
  })
})

describe("sectionLossOf", () => {
  it("returns the sections from a 409 section_loss", () => {
    const e = axiosErr(409, { code: "section_loss", sections: ["Emotional Intelligence", "Big Five"], message: "m" })
    expect(sectionLossOf(e)).toEqual(["Emotional Intelligence", "Big Five"])
  })
  it("is null for any other error, including another 409", () => {
    expect(sectionLossOf(axiosErr(422, { code: "section_loss", sections: [] }))).toBeNull()
    expect(sectionLossOf(axiosErr(409, "conflict"))).toBeNull()
    expect(sectionLossOf(new Error("x"))).toBeNull()
  })
})

describe("useReplaceMyPrismReport (PRISM-RR)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("sends a PDF on its own and passes confirmSectionLoss through", async () => {
    ;(replaceMyPrismReport as jest.Mock).mockResolvedValueOnce({
      status: true, assessment_id: "a", scores_written: 107, colours: {},
      pdf_replaced: true, csv_generated: true,
    })
    const { wrapper } = setup()
    const { result } = renderHook(() => useReplaceMyPrismReport(), { wrapper })
    const pdf = new File(["%PDF-1.7 x"], "r.pdf", { type: "application/pdf" })
    await act(async () => {
      await result.current.mutateAsync({ pdf, confirmSectionLoss: true })
    })
    expect(replaceMyPrismReport).toHaveBeenCalledWith(null, pdf, { confirmSectionLoss: true })
    expect(toast.success).toHaveBeenCalledWith("PRISM data from your PDF — 107 scores + PDF updated.")
  })

  it("refreshes the Behavioral map / Brain Map query after a replace", async () => {
    ;(replaceMyPrismReport as jest.Mock).mockResolvedValueOnce({
      status: true, assessment_id: "a", scores_written: 10, colours: {}, pdf_replaced: false,
    })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useReplaceMyPrismReport(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ csv: new File(["x"], "s.csv", { type: "text/csv" }) })
    })
    const keys = invalidate.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey))
    expect(keys).toContain(JSON.stringify(["me", "prism"]))
    expect(keys).toContain(JSON.stringify(["documents", "latest-prism"]))
  })

  it("does not toast an error for the section-loss 409 — the dialog asks instead", async () => {
    ;(replaceMyPrismReport as jest.Mock).mockRejectedValueOnce(
      axiosErr(409, { code: "section_loss", sections: ["Big Five"], message: "m" }),
    )
    const { wrapper } = setup()
    const { result } = renderHook(() => useReplaceMyPrismReport(), { wrapper })
    await act(async () => {
      await result.current
        .mutateAsync({ csv: new File(["x"], "s.csv", { type: "text/csv" }) })
        .catch(() => undefined)
    })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("toasts a readable message for a converter failure", async () => {
    ;(replaceMyPrismReport as jest.Mock).mockRejectedValueOnce(
      axiosErr(502, { code: "converter_failed", message: "The PDF converter failed. Nothing was changed." }),
    )
    const { wrapper } = setup()
    const { result } = renderHook(() => useReplaceMyPrismReport(), { wrapper })
    await act(async () => {
      await result.current
        .mutateAsync({ pdf: new File(["%PDF"], "r.pdf", { type: "application/pdf" }) })
        .catch(() => undefined)
    })
    expect(toast.error).toHaveBeenCalledWith("Replace failed: The PDF converter failed. Nothing was changed.")
  })
})

describe("useAdminDeletePrismScores", () => {
  beforeEach(() => jest.clearAllMocks())

  it("deletes for the user and reports what went, and that the PDF stayed", async () => {
    ;(adminDeleteUserPrismScores as jest.Mock).mockResolvedValueOnce({
      status: true, user_id: "u1", deleted_assessments: 1, deleted_scores: 107,
      deleted_typings: 0, deleted_prism_results: 1, deleted_csv_documents: 2,
    })
    const { wrapper } = setup()
    const { result } = renderHook(() => useAdminDeletePrismScores(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ userId: "u1" })
    })
    expect(adminDeleteUserPrismScores).toHaveBeenCalledWith("u1")
    expect((toast.success as jest.Mock).mock.calls[0][0]).toMatch(/report PDF was kept/)
  })

  it("says plainly when there was nothing to delete", async () => {
    ;(adminDeleteUserPrismScores as jest.Mock).mockResolvedValueOnce({
      status: true, user_id: "u1", deleted_assessments: 0, deleted_scores: 0,
      deleted_typings: 0, deleted_prism_results: 0, deleted_csv_documents: 0,
    })
    const { wrapper } = setup()
    const { result } = renderHook(() => useAdminDeletePrismScores(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ userId: "u1" })
    })
    expect(toast.info).toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("shows the server's reason on a 403 (switch off)", async () => {
    ;(adminDeleteUserPrismScores as jest.Mock).mockRejectedValueOnce(
      axiosErr(403, "Replacing a PRISM report from a PDF is not switched on yet on this tier."),
    )
    const { wrapper } = setup()
    const { result } = renderHook(() => useAdminDeletePrismScores(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ userId: "u1" }).catch(() => undefined)
    })
    expect(toast.error).toHaveBeenCalledWith(
      "Delete failed: Replacing a PRISM report from a PDF is not switched on yet on this tier.",
    )
  })
})
