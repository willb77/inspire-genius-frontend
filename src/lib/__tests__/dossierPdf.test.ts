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
