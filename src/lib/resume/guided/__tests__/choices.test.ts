import { atsFileBase } from "@/lib/resume/resumeDocument"
import { INSTRUCTION_MAX, askAboutLine, downloadFileName, rewriteLine, yourChoices } from "../choices"

const base = {
  situation: "" as const,
  formatName: "",
  sources: { resume: false, bio: false, assessments: [] as string[] },
  addedDocuments: 0,
  aimedAt: "",
  styleName: "",
}

describe("yourChoices", () => {
  it("leaves out rows with nothing chosen, but always says what it's aimed at", () => {
    expect(yourChoices(base)).toEqual([{ label: "Aimed at", value: "General — no particular job" }])
  })
  it("counts an added document as the résumé", () => {
    expect(yourChoices({ ...base, addedDocuments: 1 })[0]).toEqual({ label: "From", value: "your résumé" })
  })
  it("lists everything in board order", () => {
    const rows = yourChoices({
      situation: "federal",
      formatName: "Federal",
      sources: { resume: true, bio: true, assessments: ["PRISM", "DISC"] },
      addedDocuments: 0,
      aimedAt: "  Program Analyst ",
      styleName: "STAR",
    })
    expect(rows.map((r) => r.label)).toEqual(["For", "Format", "From", "Aimed at", "Bullet style"])
    expect(rows[0].value).toBe("Applying for a federal job (USAJOBS)")
    expect(rows[2].value).toBe("your résumé + your bio + PRISM + DISC")
    expect(rows[3].value).toBe("Program Analyst")
  })
})

describe("line prompts", () => {
  it("asks about the trimmed line", () => {
    expect(askAboutLine("  Led a team of 12 ")).toBe(
      'Why is this line on my résumé, and is it strong enough: "Led a team of 12"',
    )
  })
  it("starts a rewrite the person finishes", () => {
    expect(rewriteLine("Led a team of 12")).toBe("Rewrite: “Led a team of 12” — ")
    expect(rewriteLine("  Led a team of 12 \n")).toBe("Rewrite: “Led a team of 12” — ")
  })
  it("cuts a long line so at least 80 characters are left for the direction", () => {
    const out = rewriteLine("x".repeat(500))
    expect(out.length).toBe(INSTRUCTION_MAX - 80)
    expect(out).toMatch(/x…” — $/)
    expect(rewriteLine("y".repeat(206))).not.toContain("…")
    expect(rewriteLine("y".repeat(207))).toContain("…")
  })
})

describe("downloadFileName", () => {
  it("is the export's own base plus the extension", () => {
    expect(downloadFileName("Casey Example", "Operations Manager", "docx")).toBe(
      `${atsFileBase("Casey Example", "Operations Manager")}.docx`,
    )
    expect(downloadFileName("Casey Example", "", "pdf")).toBe("Casey-Example-Resume.pdf")
  })
})
