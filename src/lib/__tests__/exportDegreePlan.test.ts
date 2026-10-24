import { degreePlanBlocks, degreePlanFileName, exportDegreePlanPdf } from "@/lib/exportDegreePlan"
import type { DegreePlanReady } from "@/types/career-discovery"

const text = jest.fn()
const download = jest.fn()
jest.mock("jspdf", () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    setFont: jest.fn(), setFontSize: jest.fn(), setTextColor: jest.fn(), setDrawColor: jest.fn(),
    setFillColor: jest.fn(), rect: jest.fn(), line: jest.fn(), addPage: jest.fn(), setPage: jest.fn(),
    getNumberOfPages: () => 1,
    splitTextToSize: (t: string) => [t],
    text: (...a: unknown[]) => text(...a),
    output: () => new Blob(["pdf"]),
  })),
}))
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: (...a: unknown[]) => download(...a) }))

function data(over: Partial<DegreePlanReady["plan"]> = {}): DegreePlanReady {
  return {
    available: true, reason: null, note: null,
    school: { id: "sch-a" },
    catalog: { id: "cat-a", catalogYear: "2025-2026", version: 1 },
    inputs: { programIds: ["p"], load: "part_time", creditsPerTerm: 9,
              startTerm: { season: "fall", year: 2026 }, summer: true, droppedCompleted: 0 },
    options: { loads: { full_time: { min: 12, max: 15, default: 15 }, part_time: { min: 6, max: 9, default: 9 } },
               maxExtraPrograms: 2, programs: [] },
    checklist: [],
    plan: {
      engineVersion: "v1",
      load: { kind: "part_time", creditsPerTerm: 9, min: 6, max: 9, default: 9 },
      start: { season: "fall", year: 2026, label: "Fall 2026" }, summer: true, refused: null,
      programs: [{ id: "p", code: "DAT100", title: "Data Analytics", credential: "AAS", totalCredits: 64,
                   requirementsMinimum: 64, openElectiveCredits: null }],
      terms: [
        { season: "fall", year: 2026, label: "Fall 2026", credits: 4, overLoad: false, note: null,
          courses: [{ id: "a", code: "DAT 201", title: "Analytics", credits: 3, whyNow: "Required: DAT100 — Core.",
                      satisfies: [], after: [], alreadyDone: [], with: ["DAT 201L"], unlocks: [], offered: null,
                      anyTerm: true, minGrades: [] }] },
        { season: "spring", year: 2027, label: "Spring 2027", credits: 0, overLoad: false,
          note: "No course can be taken this term.", courses: [] },
      ],
      termsLeft: 1, creditsDone: 6, creditsLeft: 3, expectedCompletion: { season: "fall", year: 2026, label: "Fall 2026" },
      alreadyComplete: false, notes: ["A note."],
      ...over,
    },
    careers: [{ program: "DAT100", roleFamily: "Data", socCode: "15-2051", role: { id: "r", title: "Data Analyst" },
                overallFit: 81.4, prismFit: 77, fitMissing: [] }],
    fit: { available: true, state: "ok", asOf: null, reason: null },
    costToFinish: { available: true, terms: 1, low: 2000, high: 6000, basis: "net price ÷ 2 per term" },
    gaps: { available: true, targetRole: null, targetRolePending: false, gapsPending: false, counts: {},
            items: [{ title: "Practise feedback", competency: "Feedback", severity: "moderate", costable: false }],
            note: null },
    socCodeNote: "s",
  }
}

const all = (d: DegreePlanReady) => degreePlanBlocks(d).map((b) => b.text).join("\n")

test("prints every term, course, why, total, completion, careers, cost and gaps", () => {
  const t = all(data())
  expect(t).toContain("2025-2026 catalog · part-time, up to 9 credits a term · starting Fall 2026 · summer terms included")
  expect(t).toContain("6 credits done, 3 to go. Expected to finish: Fall 2026.")
  expect(t).toContain("Fall 2026 — 4 credits")
  expect(t).toContain("DAT 201  Analytics · 3 credits")
  expect(t).toContain("Required: DAT100 — Core.")
  expect(t).toContain("No course can be taken this term.")
  expect(t).toContain("Data Analyst (15-2051) — Overall fit 81%, PRISM fit 77%")
  expect(t).toContain("$2,000 to $6,000 after grants, over 1 term.")
  expect(t).toContain("•  Practise feedback")
  expect(t).toContain("•  A note.")
})

test("a refusal prints its statement and nothing pretends to be a plan", () => {
  const t = all(data({ refused: { code: "cycle", names: ["C 1"], statement: "C 1 needs C 2 needs C 1." } }))
  expect(t).toContain("This plan can't be built yet")
  expect(t).toContain("C 1 needs C 2 needs C 1.")
  expect(t).not.toContain("Expected to finish")
  expect(t).not.toContain("Cost to finish")
})

test("absent fits, cost refusals and unreadable gaps are said, not dropped", () => {
  const d = data()
  d.careers = [{ ...d.careers[0], overallFit: null, prismFit: null }]
  d.fit = { available: false, state: "not_enabled", asOf: null, reason: "It needs Career Fit." }
  d.costToFinish = { available: false, reason: "refused", note: "No price yet.", missingStatements: ["Not listed."] }
  d.gaps = { available: false, note: "Gaps couldn't be read." }
  const t = all(d)
  expect(t).toContain("Data Analyst (15-2051)\n")
  expect(t).toContain("It needs Career Fit.")
  expect(t).toContain("No price yet.\nNot listed.")
  expect(t).toContain("Gaps couldn't be read.")
})

test("an already-complete plan says so", () => {
  expect(all(data({ alreadyComplete: true, terms: [], creditsDone: 64 }))).toContain(
    "Every course these programs need is done (64 credits)."
  )
})

test("the file is named for the catalog year, never the person", () => {
  expect(degreePlanFileName(data())).toBe("Degree_Plan_2025-2026.pdf")
})

test("exporting writes the blocks and downloads one file", async () => {
  text.mockClear()
  download.mockClear()
  await exportDegreePlanPdf(data())
  const written = text.mock.calls.map((c) => String(c[0])).join("\n")
  expect(written).toContain("DAT 201  Analytics · 3 credits")
  expect(written).toContain("Degree plan — built from your school's published catalog — 1 of 1")
  expect(download).toHaveBeenCalledTimes(1)
  expect(download.mock.calls[0][0]).toBe("Degree_Plan_2025-2026.pdf")
})
