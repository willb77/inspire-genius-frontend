import {
  catalogYearSchema,
  courseSchema,
  EMPTY_COURSE,
  EMPTY_PROGRAM,
  importSchema,
  institutionSchema,
  isCatalogYear,
  programSchema,
  toCourseInput,
  toProgramInput,
} from "../curriculum.schemas"
import { canImport, catalogPath, describeGroup, formatCycle } from "../curriculumUi"

const msgs = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => i.message)

describe("curriculum schemas", () => {
  it("school: name required, UNITID 6 digits, OPEID 6-8 digits, both optional", () => {
    expect(institutionSchema.safeParse({ name: "X", unitid: "", opeid: "" }).success).toBe(true)
    expect(institutionSchema.safeParse({ name: "X", unitid: "123456", opeid: "12345678" }).success).toBe(true)
    expect(msgs(institutionSchema.safeParse({ name: " ", unitid: "12", opeid: "1" }))).toEqual([
      "A school needs a name",
      "UNITID is the 6-digit IPEDS id",
      "OPEID is 6 to 8 digits",
    ])
  })

  it("catalog year: 2026 or consecutive 2026-2027", () => {
    expect(isCatalogYear("2026")).toBe(true)
    expect(isCatalogYear("2026-2027")).toBe(true)
    expect(isCatalogYear("2026-2028")).toBe(false)
    expect(isCatalogYear("26")).toBe(false)
    expect(catalogYearSchema.safeParse({ catalogYear: "2026-2028" }).success).toBe(false)
  })

  it("course: credits a number up to 30, prerequisite picked, grade a letter", () => {
    const ok = { ...EMPTY_COURSE, code: "MAT 122", title: "Alg II", credits: "3" }
    expect(courseSchema.safeParse(ok).success).toBe(true)
    expect(msgs(courseSchema.safeParse({ ...ok, credits: "31" }))).toEqual(["Credits must be at most 30"])
    expect(msgs(courseSchema.safeParse({ ...ok, credits: "three" }))).toEqual(["Credits must be a number of 0 or more"])
    expect(
      msgs(
        courseSchema.safeParse({
          ...ok,
          prerequisites: [{ code: "", kind: "prereq", altGroup: "x", minGrade: "Z" }],
        })
      )
    ).toEqual([
      "Pick a course from the catalog",
      "Alternative group is a whole number",
      "Minimum grade is a letter grade (A–D, +/−) or P",
    ])
  })

  it("program groups: required lists a course; choose n is possible; min credits above 0", () => {
    const base = { ...EMPTY_PROGRAM, code: "P1", title: "Prog", totalCredits: "60" }
    expect(programSchema.safeParse(base).success).toBe(true)
    const group = (g: object) => ({ ...base, requirements: [{ groupName: "G", n: "", minCredits: "", courses: [], ...g }] })
    expect(msgs(programSchema.safeParse(group({ rule: "required" })))).toEqual([
      "A 'required' group lists at least one course",
    ])
    expect(msgs(programSchema.safeParse(group({ rule: "choose_n", n: "0", courses: ["A"] })))).toEqual([
      "'Choose n' needs n of 1 or more",
    ])
    expect(msgs(programSchema.safeParse(group({ rule: "choose_n", n: "3", courses: ["A"] })))).toEqual([
      "Choose 3 from 1 listed course(s) is impossible",
    ])
    expect(msgs(programSchema.safeParse(group({ rule: "min_credits", minCredits: "0" })))).toEqual([
      "'Minimum credits' needs a floor above 0",
    ])
    expect(programSchema.safeParse(group({ rule: "min_credits", minCredits: "6", courses: ["A"] })).success).toBe(true)
  })

  it("import: at least one file", () => {
    expect(msgs(importSchema.safeParse({ coursesCsv: " ", programsCsv: "" }))).toEqual([
      "Paste or load at least one CSV file",
    ])
    expect(importSchema.safeParse({ coursesCsv: "code,title,credits", programsCsv: "" }).success).toBe(true)
  })

  it("converts form values to request bodies", () => {
    expect(
      toCourseInput({
        code: " MAT 122 ",
        title: "Alg II",
        credits: "3.5",
        description: " ",
        termsOffered: ["fall"],
        prerequisites: [
          { code: "MAT 121", kind: "prereq", altGroup: "", minGrade: "c" },
          { code: "MAT 171", kind: "coreq", altGroup: "2", minGrade: "" },
        ],
      })
    ).toEqual({
      code: "MAT 122",
      title: "Alg II",
      credits: 3.5,
      description: null,
      termsOffered: ["fall"],
      prerequisites: [
        { code: "MAT 121", kind: "prereq", altGroup: null, minGrade: "C" },
        { code: "MAT 171", kind: "coreq", altGroup: 2, minGrade: null },
      ],
    })
    expect(
      toProgramInput({
        ...EMPTY_PROGRAM,
        code: "P1",
        title: "Prog",
        totalCredits: "60",
        cipCode: "11.0101",
        requirements: [
          { groupName: "Core", rule: "required", n: "9", minCredits: "9", courses: ["A"] },
          { groupName: "Pick", rule: "choose_n", n: "1", minCredits: "", courses: ["B", "C"] },
          { groupName: "Elect", rule: "min_credits", n: "", minCredits: "6", courses: ["D"] },
        ],
      })
    ).toEqual({
      code: "P1",
      title: "Prog",
      credential: "AAS",
      totalCredits: 60,
      cipCode: "11.0101",
      description: null,
      requirements: [
        { groupName: "Core", rule: "required", n: null, minCredits: null, courses: ["A"] },
        { groupName: "Pick", rule: "choose_n", n: 1, minCredits: null, courses: ["B", "C"] },
        { groupName: "Elect", rule: "min_credits", n: null, minCredits: 6, courses: ["D"] },
      ],
    })
  })
})

describe("curriculumUi helpers", () => {
  const clean = {
    ok: true,
    counts: { courses: 1, programs: 0, requirementGroups: 0, prerequisiteLinks: 0 },
    errors: [],
    unknownCodes: [],
    cycles: [],
    credits: [],
    warnings: [],
  }
  const files = { coursesCsv: "c", programsCsv: "p" }

  it("canImport: only a draft, only after a clean dry run of exactly the same text", () => {
    expect(canImport(true, null, files)).toBe(false)
    expect(canImport(true, { ...files, report: clean }, files)).toBe(true)
    expect(canImport(false, { ...files, report: clean }, files)).toBe(false)
    expect(canImport(true, { ...files, report: { ...clean, ok: false } }, files)).toBe(false)
    expect(canImport(true, { ...files, report: clean }, { ...files, coursesCsv: "c2" })).toBe(false)
    expect(canImport(true, { ...files, report: clean }, { ...files, programsCsv: "p2" })).toBe(false)
  })

  it("formats paths, cycles and groups", () => {
    expect(catalogPath("a b")).toBe("/super-admin/curriculum/catalogs/a%20b")
    expect(formatCycle(["A", "B", "A"])).toBe("A → B → A")
    const g = { groupName: "Core", n: 2, minCredits: 6, courses: ["A", "B"], position: 0 }
    expect(describeGroup({ ...g, rule: "choose_n" })).toBe("Core: choose 2 — A, B")
    expect(describeGroup({ ...g, rule: "min_credits" })).toBe("Core: at least 6 credits — A, B")
    expect(describeGroup({ ...g, rule: "required", courses: [] })).toBe("Core: all of — no courses")
  })
})
