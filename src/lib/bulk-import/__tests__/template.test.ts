import {
  buildTemplateCsv,
  downloadTemplateCsv,
  TEMPLATE_FILENAME,
  TEMPLATE_HEADERS,
} from "@/lib/bulk-import/template"
import { parseCSV } from "@/lib/bulk-import/parsers"
import { validateRecords } from "@/lib/bulk-import/validation"

describe("import template", () => {
  it("starts with the documented headers", () => {
    expect(buildTemplateCsv().split("\r\n")[0]).toBe(TEMPLATE_HEADERS.join(","))
  })

  it("ends with a newline so spreadsheet tools keep the last row", () => {
    expect(buildTemplateCsv().endsWith("\r\n")).toBe(true)
  })

  // The whole point of shipping a template is that it is known-good. If the
  // template itself fails the importer, it is worse than no template at all.
  it("round-trips through the real parser and validates cleanly", async () => {
    const file = new File([buildTemplateCsv()], TEMPLATE_FILENAME, { type: "text/csv" })
    const records = await parseCSV(file)
    const result = validateRecords(records, "super-admin")

    expect(result.valid).toHaveLength(2)
    expect(result.invalid).toHaveLength(0)
    expect(result.ignoredColumns).toEqual([])
    expect(result.inferredColumns).toEqual([])
    // Row 1 is the MANAGER; row 2 reports to them. Order matters in the
    // template because a manager must exist before anyone can be attached.
    expect(result.valid[0].record).toMatchObject({
      fname: "Sam",
      lname: "Rivera",
      email1: "sam.rivera@example.com",
      user_type: "manager",
    })
    expect(result.valid[1].record).toMatchObject({
      fname: "Jane",
      lname: "Doe",
      email1: "jane.doe@example.com",
      user_type: "user",
      manager_email: "sam.rivera@example.com",
      department: "Operations",
      position: "Analyst",
    })
  })

  // The Manager column is the entire reason the template changed. A template
  // that quietly loses it produces users who belong to nobody — the exact
  // state this work exists to fix — and every other assertion here still passes.
  it("carries the reporting line through parse and validation", async () => {
    expect(TEMPLATE_HEADERS).toContain("Manager")
    const file = new File([buildTemplateCsv()], TEMPLATE_FILENAME, { type: "text/csv" })
    const records = await parseCSV(file)

    expect(records[1].manager_email).toBe("sam.rivera@example.com")
  })

  it("survives the BOM Excel needs — the download is what users re-upload", async () => {
    const file = new File(["\uFEFF" + buildTemplateCsv()], TEMPLATE_FILENAME, { type: "text/csv" })
    const records = await parseCSV(file)

    expect(validateRecords(records, "super-admin").valid).toHaveLength(2)
  })

  describe("downloadTemplateCsv", () => {
    const createObjectURL = jest.fn(() => "blob:mock")
    const revokeObjectURL = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
      Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, writable: true })
      Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, writable: true })
    })

    it("downloads under the documented filename and cleans up the object URL", () => {
      jest.useFakeTimers()
      const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

      downloadTemplateCsv()

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(click).toHaveBeenCalledTimes(1)
      // Anchor must not be left in the DOM.
      expect(document.querySelector(`a[download="${TEMPLATE_FILENAME}"]`)).toBeNull()

      jest.runAllTimers()
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock")

      click.mockRestore()
      jest.useRealTimers()
    })
  })
})
