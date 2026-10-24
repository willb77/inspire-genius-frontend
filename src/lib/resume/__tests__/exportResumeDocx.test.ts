/**
 * RW2 — the Word export. `docx` is stubbed so the assertions are about WHAT
 * reaches the document (running the real packer in jsdom would only prove a
 * blob came back). The same sections as the PDF, and never the list of lines
 * the fabrication check removed.
 */
import type { GeneratedResume } from "@/types/resumeWriter"

const written: string[] = []
const docs: unknown[] = []
jest.mock("docx", () => ({
  HeadingLevel: { HEADING_2: "H2" },
  TextRun: class {
    constructor(o: { text: string }) {
      written.push(o.text)
    }
  },
  Paragraph: class {
    o: unknown
    constructor(o: unknown) {
      this.o = o
    }
  },
  Document: class {
    constructor(o: unknown) {
      docs.push(o)
    }
  },
  Packer: { toBlob: () => Promise.resolve(new Blob(["docx"])) },
}))

import { buildResumeDocx, renderResumeDocx } from "@/lib/resume/exportResumeDocx"

const DRAFT: GeneratedResume = {
  target: "Sales Analytics Lead",
  headline: "Data Analyst",
  summary: "Builds dashboards.",
  competencies: ["SQL", "Tableau"],
  experience: [{ title: "Senior Data Analyst", organization: "Contoso", dates: "2019 - Present", bullets: ["Built dashboards"] }],
  education: ["BS Computer Science, 2016"],
  certifications: ["Tableau Desktop Specialist"],
  sources: ["Your résumé"],
  grounded: true,
  disclaimer: "Check every line.",
  usedToday: 1,
  dailyLimit: 5,
  tailored: true,
  removed: [{ section: "experience", reason: "employer", text: "Globex Corporation" }],
  notEvidenced: ["Manage vendor contracts"],
}

beforeEach(() => {
  written.length = 0
  docs.length = 0
})

test("every section of the résumé is in the document, in order", async () => {
  await buildResumeDocx(DRAFT, "Test Member")
  const want = [
    "Test Member", "Data Analyst", "Target — Sales Analytics Lead", "Professional Summary", "Builds dashboards.",
    "Core Competencies", "SQL  ·  Tableau", "Experience", "Senior Data Analyst", "   2019 - Present", "Contoso",
    "Built dashboards", "Education", "BS Computer Science, 2016", "Certifications", "Tableau Desktop Specialist",
    "Drafted from: Your résumé. Check every line.",
  ]
  expect(written).toEqual(want)
  expect(docs).toHaveLength(1)
})

test("what the check removed, and the advice, never reach the file", async () => {
  await buildResumeDocx(DRAFT, "Test Member")
  const blob = written.join("\n")
  expect(blob).not.toContain("Globex")
  expect(blob).not.toContain("vendor contracts")
})

test("empty sections are left out rather than printed as empty headings", async () => {
  await buildResumeDocx(
    { ...DRAFT, summary: "", competencies: [], experience: [], education: [], certifications: [], headline: "", target: "" },
    "Test Member",
  )
  expect(written).toEqual(["Test Member", "Drafted from: Your résumé. Check every line."])
})

test("the file is named like the PDF, with .docx", async () => {
  const { fileName, blob } = await renderResumeDocx(DRAFT, "Test Member")
  expect(fileName).toBe("resume-test-member.docx")
  expect(blob).toBeInstanceOf(Blob)
})
