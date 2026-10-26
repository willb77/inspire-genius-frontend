import { latestPrismDisplayName } from "@/lib/prism/latestPrismDisplayName"
import {
  CSV_MAX_BYTES,
  PDF_CONVERT_MAX_BYTES,
  PDF_WITH_CSV_MAX_BYTES,
  oversizeMessage,
  prismFileKind,
} from "@/lib/prism/prismUpload"

const sized = (name: string, size: number, type = "") => {
  const f = new File(["x"], name, { type })
  Object.defineProperty(f, "size", { value: size })
  return f
}

describe("latestPrismDisplayName (D4)", () => {
  it("shows the PDF's and the CSV's names when both are sent", () => {
    expect(
      latestPrismDisplayName({ file_name: "prism_report_2026-10-26.csv", pdf_file_name: "Report.pdf", csv_file_name: "Report.csv" }),
    ).toBe("Report.pdf · Report.csv")
  })
  it("shows whichever one name is sent", () => {
    expect(latestPrismDisplayName({ file_name: "x.csv", pdf_file_name: "Report.pdf", csv_file_name: null })).toBe("Report.pdf")
    expect(latestPrismDisplayName({ file_name: "x.csv", pdf_file_name: "  ", csv_file_name: "S.csv" })).toBe("S.csv")
  })
  it("falls back to file_name from an older document-service", () => {
    expect(latestPrismDisplayName({ file_name: "prism_report_2026-10-26.csv" })).toBe("prism_report_2026-10-26.csv")
  })
  it("is undefined with no document", () => {
    expect(latestPrismDisplayName(null)).toBeUndefined()
    expect(latestPrismDisplayName(undefined)).toBeUndefined()
  })
})

describe("prismFileKind", () => {
  it("sorts by extension or MIME type", () => {
    expect(prismFileKind(new File([""], "Report.PDF"))).toBe("pdf")
    expect(prismFileKind(new File([""], "noext", { type: "application/pdf" }))).toBe("pdf")
    expect(prismFileKind(new File([""], "scores.csv"))).toBe("csv")
    expect(prismFileKind(new File([""], "noext", { type: "text/csv" }))).toBe("csv")
    expect(prismFileKind(new File([""], "report.docx"))).toBeNull()
  })
})

describe("oversizeMessage (switch-on caps, P2-F1)", () => {
  it("allows a PDF on its own at exactly 4 MB and refuses one byte more", () => {
    expect(oversizeMessage(null, sized("r.pdf", PDF_CONVERT_MAX_BYTES))).toBeNull()
    expect(oversizeMessage(null, sized("r.pdf", PDF_CONVERT_MAX_BYTES + 1))).toMatch(/up to 4 MB/)
  })
  it("allows a larger PDF beside a CSV, up to 10 MB", () => {
    const csv = sized("s.csv", 10)
    expect(oversizeMessage(csv, sized("r.pdf", PDF_CONVERT_MAX_BYTES + 1))).toBeNull()
    expect(oversizeMessage(csv, sized("r.pdf", PDF_WITH_CSV_MAX_BYTES + 1))).toMatch(/10 MB/)
  })
  it("refuses a CSV over 2 MB", () => {
    expect(oversizeMessage(sized("s.csv", CSV_MAX_BYTES + 1), null)).toMatch(/2 MB/)
  })
  it("is null with nothing chosen", () => {
    expect(oversizeMessage(null, null)).toBeNull()
  })
})
