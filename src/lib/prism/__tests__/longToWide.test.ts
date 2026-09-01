import fs from "fs"
import path from "path"
import { convertLongToWide, PrismCsvError, toCsv } from "@/lib/prism/longToWide"
import { PRISM_WIDE_DIM_ROW, PRISM_WIDE_GROUP_ROW } from "@/lib/prism/wideTemplate"

const SAMPLE = fs.readFileSync(
  path.join(__dirname, "fixtures/long_form_sample.csv"),
  "utf8",
)

/** Column index of a dimension header, so tests name scales not numbers. */
function col(header: string): number {
  const i = PRISM_WIDE_DIM_ROW.findIndex((h) => h.trim() === header)
  if (i < 0) throw new Error(`no such column: ${header}`)
  return i
}
const rowFor = (r: string[][], name: string) => r.find((x) => x[0] === name)!

describe("convertLongToWide", () => {
  it("produces the 97-column contract with headers copied verbatim", () => {
    const r = convertLongToWide(SAMPLE)
    expect(r.rows).toHaveLength(5)
    expect(r.rows[0]).toEqual([...PRISM_WIDE_GROUP_ROW])
    // the dimension row is the template's, with the candidate name in cell 0
    expect(r.rows[1].slice(1)).toEqual([...PRISM_WIDE_DIM_ROW].slice(1))
    expect(r.rows[1][0]).toBe("Test Subject")
    r.rows.forEach((row) => expect(row).toHaveLength(97))
    expect(r.rows.slice(2).map((x) => x[0])).toEqual(["Underlying", "Adapted", "Consistent"])
  })

  it("reports a column the source does not carry instead of inventing one", () => {
    // The long form has no Core Traits "Skew". Leaving it blank AND naming it is
    // the point: a silently-filled cell would read as a measurement.
    const r = convertLongToWide(SAMPLE)
    expect(r.missingColumns).toEqual(["Core Traits / Skew"])
    expect(r.emptyCells).toBe(3) // one per score row
    const skew = PRISM_WIDE_DIM_ROW.findIndex((h, i) => i > 0 && h.trim() === "Skew")
    r.rows.slice(2).forEach((row) => expect(row[skew]).toBe(""))
  })

  it("takes each score type directly when the source has all three", () => {
    const r = convertLongToWide(SAMPLE)
    const u = rowFor(r.rows, "Underlying")
    const a = rowFor(r.rows, "Adapted")
    const c = rowFor(r.rows, "Consistent")
    // Behaviour Preferences carries Adapted/Underlying/Consistent separately
    expect(u[col("Coordinating")]).toBe("8")
    expect(a[col("Coordinating")]).toBe("21")
    expect(c[col("Coordinating")]).toBe("9")
    expect(u[col("Focusing")]).toBe("19")
    expect(a[col("Focusing")]).toBe("9")
  })

  it("copies Underlying only where the source lacks the other types, and counts every copy", () => {
    const r = convertLongToWide(SAMPLE)
    const u = rowFor(r.rows, "Underlying")
    const a = rowFor(r.rows, "Adapted")
    // Work Aptitudes has one stored value; all three rows agree
    expect(a[col("Practical and mechanical")]).toBe(u[col("Practical and mechanical")])
    expect(r.copiedFromUnderlying).toBeGreaterThan(0)
    // every copy is attributed to a group, and the totals reconcile
    const attributed = r.repeatedGroups.reduce((n, g) => n + g.cells, 0)
    expect(attributed).toBe(r.copiedFromUnderlying)
    expect(r.repeatedGroups.map((g) => g.group)).toContain(
      "PRISM Career Development Analysis",
    )
  })

  it("accounts for every scored cell exactly once", () => {
    const r = convertLongToWide(SAMPLE)
    const scoredColumns = PRISM_WIDE_DIM_ROW.filter((h, i) => i > 0 && h.trim() !== "").length
    expect(r.filledFromLongForm + r.copiedFromUnderlying + r.emptyCells).toBe(scoredColumns * 3)
  })

  it("resolves the SD column, which the long form calls 'SD Score'", () => {
    const r = convertLongToWide(SAMPLE)
    expect(rowFor(r.rows, "Underlying")[col("SD")]).not.toBe("")
    expect(r.missingColumns.join(" ")).not.toMatch(/SD/)
  })

  it("maps Work Preference Profile columns by their prose headers", () => {
    const r = convertLongToWide(SAMPLE)
    const caution = PRISM_WIDE_DIM_ROW.findIndex((h) =>
      h.startsWith("Being cautious, but not fearful"),
    )
    expect(caution).toBeGreaterThan(0)
    expect(rowFor(r.rows, "Underlying")[caution]).not.toBe("")
  })

  it("re-derives the brain-map quadrants the source stated", () => {
    const r = convertLongToWide(SAMPLE)
    const u = rowFor(r.rows, "Underlying")
    const mean = (a: string, b: string) => (Number(u[col(a)]) + Number(u[col(b)])) / 2
    expect(mean("Finishing", "Evaluating")).toBe(92) // Gold
    expect(mean("Innovating", "Initiating")).toBe(85) // Green
    expect(mean("Supporting", "Coordinating")).toBe(44) // Blue
    expect(mean("Focusing", "Delivering")).toBe(40) // Red
  })

  it("prefers an explicit candidate name over the Person line", () => {
    expect(convertLongToWide(SAMPLE, "Someone Else").candidate).toBe("Someone Else")
  })

  it("rejects a file that is not a long-format export", () => {
    expect(() => convertLongToWide("a,b,c\n1,2,3")).toThrow(PrismCsvError)
  })

  it("rejects an export with no candidate name", () => {
    expect(() => convertLongToWide(SAMPLE.replace(/^Person,.*$/m, "Person,"))).toThrow(
      /no 'Person' line/,
    )
  })

  it("rejects a header row with no score rows beneath it", () => {
    expect(() =>
      convertLongToWide("Person,X\n\ncategory,dimension,score_type,score,detail\n"),
    ).toThrow(/no score rows/)
  })

  it("ignores the derived quadrant rows rather than treating them as columns", () => {
    const r = convertLongToWide(SAMPLE)
    // Gold/Green/Blue/Red are means of two scales, not columns in the layout
    expect(r.rows[1]).not.toContain("Gold")
    expect(r.missingColumns.join(" ")).not.toMatch(/Gold|Green|Blue|Red/)
  })
})

describe("toCsv", () => {
  it("uses CRLF and quotes only cells that need it", () => {
    expect(toCsv([["a", "b,c"], ['say "hi"', "plain"]])).toBe('a,"b,c"\r\n"say ""hi""",plain')
  })

  it("round-trips the prose headers that contain commas", () => {
    const r = convertLongToWide(SAMPLE)
    const line = toCsv(r.rows).split("\r\n")[1]
    expect(line).toContain('"Being cautious, but not fearful')
  })
})
