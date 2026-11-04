/**
 * RWO-8 — the guided flow's helpers. These try to disprove:
 *   - a job-description file is read only when it is PDF/DOCX/TXT by name AND its
 *     first bytes agree — a renamed program, a binary ".txt" and anything else are
 *     refused before any parser runs; over 10 MB is refused;
 *   - the assistant's summary carries the removed lines with their reasons and the
 *     requirements not shown yet, and is capped at the server's 8,000;
 *   - only lines new since the previous draft are marked changed; follow-ups are
 *     asked only about bullets with no number.
 */
import { buildDraftSummary, changedLines, DRAFT_SUMMARY_MAX, weakBullets } from "@/lib/resume/guided/draftSummary"
import { contentMatches, JOB_FILE_MAX_BYTES, JobFileRefused, readJobFile } from "@/lib/resume/guided/readJobFile"
import type { GeneratedResume } from "@/types/resumeWriter"

const mockExtract = jest.fn()
jest.mock("@/lib/extractRoleText", () => {
  class RoleExtractionError extends Error {}
  return { extractRoleText: (...a: unknown[]) => mockExtract(...a), RoleExtractionError }
})

const file = (name: string, bytes: number[] | string, size?: number) => {
  const f = new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], name)
  if (size !== undefined) Object.defineProperty(f, "size", { value: size })
  return f
}
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]
const ZIP = [0x50, 0x4b, 0x03, 0x04]
const EXE = [0x4d, 0x5a, 0x90, 0x00]

beforeEach(() => {
  mockExtract.mockReset()
  mockExtract.mockResolvedValue({ text: "Operations Manager. Owns a budget.", suggestedTitle: "x" })
})

describe("readJobFile", () => {
  test.each([
    ["posting.pdf", PDF],
    ["posting.docx", ZIP],
    ["posting.txt", "Operations Manager"],
  ])("reads %s whose bytes match its name", async (name, bytes) => {
    await expect(readJobFile(file(name, bytes))).resolves.toBe("Operations Manager. Owns a budget.")
  })

  test.each(["setup.exe", "run.bat", "script.ps1", "notes.doc", "page.html", "posting.pdf.exe", "macro.docm"])(
    "refuses %s by name, before reading it",
    async (name) => {
      await expect(readJobFile(file(name, PDF))).rejects.toThrow(/Only PDF, Word \(.docx\) or text/)
      expect(mockExtract).not.toHaveBeenCalled()
    },
  )

  test.each([
    ["renamed.pdf", EXE],
    ["renamed.docx", EXE],
    ["binary.txt", [0x41, 0x00, 0x42]],
  ])("refuses %s whose bytes are not what its name says", async (name, bytes) => {
    await expect(readJobFile(file(name, bytes))).rejects.toThrow("isn't what its name says")
    expect(mockExtract).not.toHaveBeenCalled()
  })

  test("refuses a file over 10 MB", async () => {
    await expect(readJobFile(file("big.pdf", PDF, JOB_FILE_MAX_BYTES + 1))).rejects.toThrow("over 10 MB")
    expect(mockExtract).not.toHaveBeenCalled()
  })

  test("a parser failure is a refusal with a reason, never a crash", async () => {
    mockExtract.mockRejectedValue(new Error("boom"))
    const err = await readJobFile(file("posting.pdf", PDF)).catch((e) => e)
    expect(err).toBeInstanceOf(JobFileRefused)
    expect(err.message).toMatch(/Paste the text instead/)
  })

  test("contentMatches checks each kind", async () => {
    expect(await contentMatches(file("a.pdf", PDF), "pdf")).toBe(true)
    expect(await contentMatches(file("a.pdf", ZIP), "pdf")).toBe(false)
    expect(await contentMatches(file("a.docx", ZIP), "docx")).toBe(true)
    expect(await contentMatches(file("a.docx", PDF), "docx")).toBe(false)
    expect(await contentMatches(file("a.txt", "plain"), "txt")).toBe(true)
  })
})

const DRAFT: GeneratedResume = {
  target: "Operations Manager",
  headline: "Operations Coordinator",
  summary: "Runs multi-store teams.",
  competencies: ["Vendor management"],
  experience: [
    { title: "Coordinator", organization: "Contoso", dates: "2019 - Present", bullets: ["Led a team of 12", "Ran vendor reviews"] },
  ],
  education: ["Associate's, City College"],
  certifications: [],
  sources: ["Your résumé"],
  grounded: true,
  disclaimer: "Check it.",
  usedToday: 1,
  dailyLimit: 5,
  removed: [{ section: "experience", reason: "employer", text: "Globex Corporation" }],
  notEvidenced: ["Own an operating budget"],
  qualifications_crosswalk: [{ requirement: "Lean certification", evidence: "" }],
}

describe("buildDraftSummary", () => {
  test("carries the draft, the removed lines with reasons and what isn't shown yet", () => {
    const s = buildDraftSummary(DRAFT, "Hybrid", "Operations Manager")
    expect(s).toContain("Format: Hybrid. Aimed at: Operations Manager.")
    expect(s).toContain("- Led a team of 12")
    expect(s).toContain("Left out by the checks:\n- Globex Corporation (employer not in the résumé)")
    expect(s).toContain("- Own an operating budget")
    expect(s).toContain("- Lean certification")
  })

  test("says when nothing was left out, and names no target when there is none", () => {
    const s = buildDraftSummary({ ...DRAFT, removed: [], notEvidenced: [], qualifications_crosswalk: [] }, "", "")
    expect(s).toContain("Aimed at: no specific job.")
    expect(s).toContain("Left out by the checks: nothing.")
    expect(s).not.toContain("The job asks for")
  })

  test("is capped at the server's limit", () => {
    const long = { ...DRAFT, summary: "x".repeat(20000) }
    expect(buildDraftSummary(long, "F", "T")).toHaveLength(DRAFT_SUMMARY_MAX)
  })
})

describe("changedLines and weakBullets", () => {
  test("nothing is changed on the first draft", () => {
    expect(changedLines(null, DRAFT).size).toBe(0)
  })

  test("only lines new since the previous draft are marked", () => {
    const next = {
      ...DRAFT,
      summary: "Runs multi-store teams and vendors.",
      experience: [{ ...DRAFT.experience[0], bullets: ["Led a team of 12", "Cut vendor costs"] }],
    }
    expect([...changedLines(DRAFT, next)].sort()).toEqual(["Cut vendor costs", "Runs multi-store teams and vendors."])
  })

  test("follow-ups are about bullets with no number, at most ten", () => {
    expect(weakBullets(DRAFT)).toEqual(["Ran vendor reviews"])
    const many = { ...DRAFT, experience: [{ ...DRAFT.experience[0], bullets: Array.from({ length: 14 }, (_, i) => `Did thing ${"abcdefghijklmn"[i]}`) }] }
    expect(weakBullets(many)).toHaveLength(10)
  })
})
