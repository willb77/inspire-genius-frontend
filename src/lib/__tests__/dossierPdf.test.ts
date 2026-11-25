import { exportDossierPdf } from "@/lib/dossierPdf"
import type { MemberDossier } from "@/types/development"

const save = jest.fn()
const text = jest.fn()
jest.mock("jspdf", () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    text: (...a: unknown[]) => text(...a),
    splitTextToSize: (t: string) => [t],
    addPage: jest.fn(),
    save: (...a: unknown[]) => save(...a),
  })),
}))

const dossier = {
  memberId: "m1",
  member: { name: "Mark Tully", title: "Operations Lead", department: "Operations" },
  reconciledHeadline: "Drives execution",
  overallConfidence: "high",
  profile: {
    prism: [
      { id: 5, label: "Focusing", score: 92, quadrant: 4 },
      { id: 6, label: "Delivering", score: 88, quadrant: 4 },
    ],
  },
  goals: [
    { goalId: "g1", title: "Own a cross-team initiative", category: "career_ambitions", horizon: "long", status: "confirmed", motivation: "Growth" },
  ],
  gaps: [{ gapId: "gap1", competency: "Delegation" }],
  matches: [{ matchId: "c1", title: "Program Manager", fitScore: 82 }],
  milestones: [{ milestoneId: "ms1", title: "Shadow lead", horizon: "d90", status: "planned" }],
} as unknown as MemberDossier

describe("exportDossierPdf", () => {
  beforeEach(() => {
    save.mockClear()
    text.mockClear()
  })

  it("renders the member's real name and downloads a slugged file", () => {
    exportDossierPdf(dossier)
    expect(save).toHaveBeenCalledWith("development-dossier-mark-tully.pdf")
    const written = text.mock.calls.map((c) => c[0]).flat().join(" ")
    expect(written).toContain("Mark Tully")
    expect(written).toContain("Focusing")
    expect(written).toContain("Own a cross-team initiative")
  })

  it("falls back to a safe filename when the name is empty", () => {
    exportDossierPdf({ ...dossier, member: { name: "" } } as unknown as MemberDossier)
    expect(save).toHaveBeenCalledWith("development-dossier-team-member.pdf")
  })
})

describe("D-06: career matches go with the PRISM", () => {
  const written = () => text.mock.calls.map((c) => String(c[0])).join("\n")

  it("with PRISM shared, the matches print with their fit, as before", () => {
    text.mockClear()
    exportDossierPdf(dossier)
    expect(written()).toContain("Career & job matches")
    expect(written()).toContain("Program Manager — 82% fit")
  })

  it("with PRISM not shared, the section says so and prints no match", () => {
    text.mockClear()
    exportDossierPdf({ ...dossier, matches: [], prismNotShared: true } as unknown as MemberDossier)
    const lines = text.mock.calls.map((c) => String(c[0]))
    const at = lines.indexOf("Career & job matches")
    expect(at).toBeGreaterThan(-1)
    expect(lines[at + 1]).toBe("Not shared with you.")
    expect(written()).not.toContain("% fit")
  })

  it("prints no match even if a backend still sent them beside prismNotShared", () => {
    text.mockClear()
    exportDossierPdf({ ...dossier, prismNotShared: true } as unknown as MemberDossier)
    expect(written()).not.toContain("Program Manager")
    expect(written()).not.toContain("% fit")
  })

  it("with no matches and PRISM shared, there is no section (not a false 'not shared')", () => {
    text.mockClear()
    exportDossierPdf({ ...dossier, matches: [] } as unknown as MemberDossier)
    expect(written()).not.toContain("Career & job matches")
  })
})

it("prints 'Not shared with you' for a goals-redacted dossier instead of dropping the section", () => {
  text.mockClear()
  exportDossierPdf({ ...dossier, goals: [], goalsNotShared: true } as unknown as MemberDossier)
  const written = text.mock.calls.map((c) => String(c[0])).join("\n")
  expect(written).toContain("Goals")
  expect(written).toContain("Not shared with you.")
  expect(written).not.toContain("Own a cross-team initiative")
})

describe("D-15: goal-linked rows and withheld development data say so on paper", () => {
  const lines = () => text.mock.calls.map((c) => String(c[0]))
  const linked = {
    ...dossier,
    gaps: [
      { gapId: "gap1", competency: "Delegation" },
      { gapId: "gap2", competency: "Goal-linked gap", goalId: "g9" },
    ],
    milestones: [
      { milestoneId: "ms1", title: "Shadow lead", horizon: "d90", status: "planned" },
      { milestoneId: "ms2", title: "Goal-linked step", horizon: "d30", status: "planned", goalId: "g9" },
    ],
  } as unknown as MemberDossier

  it("with the goals shared, goal-linked rows print as before", () => {
    text.mockClear()
    exportDossierPdf(linked)
    expect(lines().join("\n")).toContain("Goal-linked gap")
    expect(lines().join("\n")).toContain("Goal-linked step")
  })

  it("goalLinkedWithheld prints the partial line under gaps and roadmap", () => {
    text.mockClear()
    exportDossierPdf({ ...dossier, goalsNotShared: true, goalLinkedWithheld: true } as unknown as MemberDossier)
    const partial = "Some items are linked to goals Mark Tully has not shared with you, so they are not shown."
    expect(lines().filter((l) => l === partial)).toHaveLength(2)
    expect(lines()).toContain("• Delegation")
  })

  it("prints no goal-linked row even if an older backend still sent them beside goalsNotShared", () => {
    text.mockClear()
    exportDossierPdf({ ...linked, goalsNotShared: true } as unknown as MemberDossier)
    const all = lines().join("\n")
    expect(all).not.toContain("Goal-linked gap")
    expect(all).not.toContain("Goal-linked step")
    expect(all).toContain("Delegation")
  })

  it("developmentNotShared says so under both sections and prints no row", () => {
    text.mockClear()
    exportDossierPdf({ ...linked, developmentNotShared: true } as unknown as MemberDossier)
    const l = lines()
    for (const section of ["Development gaps", "Roadmap"]) {
      const at = l.indexOf(section)
      expect(at).toBeGreaterThan(-1)
      expect(l[at + 1]).toBe("Not shared with you.")
    }
    expect(l.join("\n")).not.toContain("Delegation")
    expect(l.join("\n")).not.toContain("Shadow lead")
  })
})
