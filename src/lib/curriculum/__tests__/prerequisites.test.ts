import { buildProgramGraph, formatRequisites } from "../prerequisites"
import type { Course, Program } from "@/types/curriculum"

const course = (code: string, prerequisites: Course["prerequisites"] = []): Course => ({
  code,
  title: `${code} title`,
  credits: 3,
  description: null,
  termsOffered: [],
  prerequisites,
})
const pre = (code: string, altGroup = 1, kind: "prereq" | "coreq" = "prereq", minGrade: string | null = null) => ({
  code,
  kind,
  altGroup,
  minGrade,
})

const program = (groups: string[][]): Program => ({
  code: "P1",
  title: "Program",
  credential: "AAS",
  totalCredits: 60,
  cipCode: null,
  description: null,
  requirements: groups.map((courses, i) => ({
    groupName: `G${i}`,
    rule: "required",
    n: null,
    minCredits: null,
    courses,
    position: i,
  })),
})

describe("formatRequisites", () => {
  it("joins alternatives with 'or', groups with ';', and labels coreqs and grades", () => {
    expect(formatRequisites([])).toBe("—")
    expect(
      formatRequisites([pre("MAT 121", 1, "prereq", "C"), pre("MAT 171", 1), pre("ENG 111", 2), pre("LAB 1", 3, "coreq")])
    ).toBe("MAT 121 (min C) or MAT 171; ENG 111; coreq LAB 1")
  })
})

describe("buildProgramGraph", () => {
  const courses = [
    course("MAT 121"),
    course("MAT 122", [pre("MAT 121")]),
    course("MAT 271", [pre("MAT 122"), pre("LAB 271", 2, "coreq")]),
    course("LAB 271"),
    course("ART 100"),
  ]

  it("includes the prerequisite closure, depths by prerequisite chain, coreqs at the same depth", () => {
    const g = buildProgramGraph(program([["MAT 271"]]), courses)
    const depth = Object.fromEntries(g.nodes.map((n) => [n.code, n.depth]))
    expect(depth).toEqual({ "LAB 271": 0, "MAT 121": 0, "MAT 122": 1, "MAT 271": 2 })
    expect(g.nodes.find((n) => n.code === "MAT 271")?.inProgram).toBe(true)
    expect(g.nodes.find((n) => n.code === "MAT 121")?.inProgram).toBe(false)
    expect(g.edges).toEqual(
      expect.arrayContaining([
        { from: "MAT 121", to: "MAT 122", kind: "prereq" },
        { from: "MAT 122", to: "MAT 271", kind: "prereq" },
        { from: "LAB 271", to: "MAT 271", kind: "coreq" },
      ])
    )
    expect(g.nodes.map((n) => n.code)).not.toContain("ART 100")
    expect(g.missing).toEqual([])
    expect(g.hasLoop).toBe(false)
  })

  it("reports codes the catalog does not have", () => {
    const g = buildProgramGraph(program([["MAT 122", "XYZ 999"]]), courses)
    expect(g.missing).toEqual(["XYZ 999"])
  })

  it("survives a stored loop and flags it", () => {
    const loop = [course("A", [pre("B")]), course("B", [pre("A")])]
    const g = buildProgramGraph(program([["A"]]), loop)
    expect(g.nodes).toHaveLength(2)
    expect(g.hasLoop).toBe(true)
  })
})
