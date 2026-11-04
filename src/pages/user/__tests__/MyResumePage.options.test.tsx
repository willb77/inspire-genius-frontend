/**
 * RWO-2 — the Résumé Writer page with the server's `resume_writer_options`
 * switch (CSA docs/analysis/2026-11-03-rwo-2-resume-writer-page-and-ats-export-csa.md).
 * These try to disprove:
 *   - switch OFF (no `optionsEnabled`, which is what any engine before RWO-1
 *     sends — stable, at the time of the merge), the page, the request body and
 *     all three exports are today's: today's renderers, today's draft view;
 *   - ON, the format is sent, the disclosure only for a format that takes one,
 *     and the contact details NEVER;
 *   - ON, what the checks removed shows on every draft, talking points sit in
 *     their own panel and not in the draft, and Word/PDF/Copy come from the
 *     ATS-safe document with the contact block and without the D3 strings.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import type { GeneratedResume, ResumeOptionView, ResumeWriterSources } from "@/types/resumeWriter"
import type { ResumeDocument } from "@/lib/resume/resumeDocument"

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { role: "user", fullName: "Test Member", email: "test.member@example.com" } }),
}))
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="user-layout">{children}</div>,
}))
jest.mock("@/components/dashboard/v2/AddPersonalDocModal", () => ({ AddPersonalDocModal: () => null }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const mockOldPdf = jest.fn()
jest.mock("@/lib/resume/exportResume", () => ({ renderResumePdf: (...a: unknown[]) => mockOldPdf(...a) }))
const mockOldDocx = jest.fn()
jest.mock("@/lib/resume/exportResumeDocx", () => ({ renderResumeDocx: (...a: unknown[]) => mockOldDocx(...a) }))
const mockAts = jest.fn()
const mockPages = jest.fn()
jest.mock("@/lib/resume/exportResumeAts", () => ({
  renderAtsResume: (...a: unknown[]) => mockAts(...a),
  atsPdfPageCount: (...a: unknown[]) => mockPages(...a),
}))
const mockDownload = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: (...a: unknown[]) => mockDownload(...a) }))

let sources: ResumeWriterSources
let genData: unknown
const mutate = jest.fn()
jest.mock("@/hooks/useResumeWriter", () => ({
  useResumeWriterSources: () => ({ refetch: jest.fn(), data: sources }),
  useGenerateResume: () => ({ mutate, data: genData }),
}))

import MyResumePage from "@/pages/user/MyResumePage"

const opt = (id: string, number: number, sections: string[], takesDisclosure = false): ResumeOptionView => ({
  id, number, name: `Format ${number}`, atsRating: "excellent", pages: "1-2", sections,
  requiredInputs: ["work_history"], recommendedInputs: ["job_posting"],
  useWhen: `Use ${id}`, avoidWhen: `Avoid ${id}`, expect: `Expect ${id}`, takesDisclosure,
})

const OPTIONS = [
  opt("reverse_chrono", 1, ["summary", "competencies", "experience", "education", "certifications"]),
  opt("hybrid", 2, ["summary", "competencies", "selected_achievements", "experience", "education", "certifications"]),
  opt("reentry", 3, ["summary", "competencies", "certifications", "training", "experience", "education"], true),
]

const BASE: ResumeWriterSources = {
  enabled: true,
  dailyLimit: 5,
  usedToday: 1,
  sources: { resume: true, bio: false, assessments: [] },
  documents: [],
}
const ON: ResumeWriterSources = {
  ...BASE,
  optionsEnabled: true,
  options: OPTIONS,
  bulletStyles: [
    { id: "car", name: "CAR", structure: "Challenge, Action, Result", bestFor: "Most roles." },
    { id: "xyz", name: "XYZ", structure: "X by Y by Z", bestFor: "Metrics." },
  ],
  defaultOption: "reverse_chrono",
  defaultBulletStyle: "car",
}

const DRAFT: GeneratedResume = {
  target: "Operations Manager",
  headline: "Operations Leader",
  summary: "Runs teams well.",
  competencies: ["Planning"],
  experience: [{ title: "Lead", organization: "Acme", dates: "2020–2024", bullets: ["Led a team of 8"] }],
  education: ["BA"],
  certifications: [],
  sources: ["Your résumé"],
  grounded: true,
  disclaimer: "Review before use.",
  usedToday: 2,
  dailyLimit: 5,
}
const OPTION_DRAFT: GeneratedResume = {
  ...DRAFT,
  option: "reentry",
  bulletStyle: "car",
  training: ["Forklift Certificate, 2015"],
  talking_points: ["I trained while working full time"],
  removed: [{ section: "experience", reason: "employer", text: "Globex Corporation" }],
}

const generate = () => fireEvent.click(screen.getByRole("button", { name: /Generate résumé/ }))
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/my/resume"]}>
      <MyResumePage />
    </MemoryRouter>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  sources = BASE
  genData = undefined
  mockAts.mockResolvedValue({ fileName: "f", blob: new Blob(["x"]) })
  mockOldDocx.mockResolvedValue({ fileName: "old.docx", blob: new Blob(["x"]) })
  mockOldPdf.mockResolvedValue({ fileName: "old.pdf", blob: new Blob(["x"]) })
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } })
})

// ── OFF: today's page, byte for byte ───────────────────────────────────────

test("off: no format or contact card, and today's request body", () => {
  renderPage()
  expect(screen.queryByTestId("resume-format-card")).not.toBeInTheDocument()
  expect(screen.queryByTestId("resume-contact-card")).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "Analyst" } })
  generate()
  expect(mutate).toHaveBeenCalledWith({ role: "Analyst", careerArea: undefined, positionText: undefined, documentIds: undefined })
})

test("off: an options list without optionsEnabled is ignored", () => {
  sources = { ...ON, optionsEnabled: false }
  renderPage()
  expect(screen.queryByTestId("resume-format-card")).not.toBeInTheDocument()
  generate()
  expect(Object.keys(mutate.mock.calls[0][0])).toEqual(["role", "careerArea", "positionText", "documentIds"])
})

test("off: the draft view and all three exports are today's", async () => {
  genData = OPTION_DRAFT
  renderPage()
  expect(screen.queryByTestId("resume-section-summary")).not.toBeInTheDocument()
  expect(screen.getByText("Professional summary")).toBeInTheDocument()
  expect(screen.queryByTestId("resume-talking-points")).not.toBeInTheDocument()
  expect(screen.queryByTestId("resume-mini-open")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: /Download Word/ }))
  await waitFor(() => expect(mockOldDocx).toHaveBeenCalledWith(OPTION_DRAFT, "Test Member"))
  fireEvent.click(screen.getByRole("button", { name: /Download PDF/ }))
  await waitFor(() => expect(mockOldPdf).toHaveBeenCalledWith(OPTION_DRAFT, "Test Member"))
  fireEvent.click(screen.getByRole("button", { name: /^Copy$/ }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
  expect((navigator.clipboard.writeText as jest.Mock).mock.calls[0][0]).toContain("PROFESSIONAL SUMMARY")
  expect(mockAts).not.toHaveBeenCalled()
})

// ── ON: the request ─────────────────────────────────────────────────────────

test("on: the default format and style are sent", () => {
  sources = ON
  renderPage()
  expect(screen.getByTestId("resume-format-card")).toBeInTheDocument()
  generate()
  expect(mutate).toHaveBeenCalledWith({
    role: undefined, careerArea: undefined, positionText: undefined, documentIds: undefined,
    option: "reverse_chrono", bulletStyle: "car",
  })
})

test("on: a chosen format and style are sent, and the disclosure only for a format that takes one", () => {
  sources = ON
  renderPage()
  fireEvent.click(screen.getByTestId("resume-format-reentry"))
  fireEvent.change(screen.getByLabelText("Bullet style"), { target: { value: "xyz" } })
  fireEvent.change(screen.getByLabelText(/How should a gap/), { target: { value: "State Workforce Program" } })
  generate()
  expect(mutate.mock.calls[0][0]).toMatchObject({ option: "reentry", bulletStyle: "xyz", disclosure: "State Workforce Program" })
  fireEvent.click(screen.getByTestId("resume-format-hybrid"))
  expect(screen.queryByLabelText(/How should a gap/)).not.toBeInTheDocument()
  generate()
  expect(mutate.mock.calls[1][0]).toMatchObject({ option: "hybrid" })
  expect(mutate.mock.calls[1][0]).not.toHaveProperty("disclosure")
})

test("on: contact details are never sent to the server", () => {
  sources = ON
  renderPage()
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "(555) 555-0199" } })
  fireEvent.change(screen.getByLabelText("City, State"), { target: { value: "Springfield, IL" } })
  generate()
  const body = JSON.stringify(mutate.mock.calls[0][0])
  for (const x of ["555-0199", "Springfield", "test.member@example.com", "Test Member"]) expect(body).not.toContain(x)
})

test("on: the selector recommends a format and selects it", () => {
  sources = ON
  renderPage()
  fireEvent.change(screen.getByLabelText("You are…"), { target: { value: "returning" } })
  fireEvent.click(screen.getByRole("button", { name: /Recommend a format/ }))
  expect(screen.getByTestId("resume-format-recommendation")).toHaveTextContent("Recommended: Format 3")
  expect(screen.getByTestId("resume-format-reentry")).toHaveAttribute("aria-checked", "true")
})

// ── ON: the draft ───────────────────────────────────────────────────────────

test("on: removed lines show on an untailored option draft; talking points sit outside the draft", () => {
  sources = ON
  genData = OPTION_DRAFT
  renderPage()
  expect(screen.getByTestId("resume-removed")).toHaveTextContent("Globex Corporation")
  expect(screen.getByTestId("resume-talking-points")).toHaveTextContent("I trained while working full time")
  const draft = screen.getByTestId("resume-draft")
  expect(draft).not.toHaveTextContent("I trained while working full time")
  expect(draft).not.toHaveTextContent("Globex")
  expect(screen.getByTestId("resume-section-training")).toHaveTextContent("Forklift Certificate, 2015")
  expect(screen.getByTestId("resume-footnote")).toHaveTextContent("Drafted from: Your résumé. Review before use.")
  expect(screen.getByTestId("resume-contact-line")).toHaveTextContent("test.member@example.com")
})

test("on: Word and PDF come from the ATS document, named for the target, never today's renderers", async () => {
  sources = ON
  genData = OPTION_DRAFT
  renderPage()
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "Operations Manager" } })
  generate()
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "(555) 555-0199" } })
  fireEvent.click(screen.getByRole("button", { name: /Download Word/ }))
  await waitFor(() => expect(mockAts).toHaveBeenCalledTimes(1))
  const [doc, kind, target] = mockAts.mock.calls[0] as [ResumeDocument, string, string]
  expect(kind).toBe("docx")
  expect(target).toBe("Operations Manager")
  expect(doc.name).toBe("Test Member")
  expect(doc.contactLine).toContain("(555) 555-0199")
  expect(doc.sections.map((s) => s.key)).toEqual(["summary", "competencies", "training", "experience", "education"])
  fireEvent.click(screen.getByRole("button", { name: /Download PDF/ }))
  await waitFor(() => expect(mockAts).toHaveBeenCalledTimes(2))
  expect(mockAts.mock.calls[1][1]).toBe("pdf")
  expect(mockOldDocx).not.toHaveBeenCalled()
  expect(mockOldPdf).not.toHaveBeenCalled()
})

test("on: Copy is the ATS text — contact in, D3 strings out", async () => {
  sources = ON
  genData = OPTION_DRAFT
  renderPage()
  fireEvent.click(screen.getByRole("button", { name: /^Copy$/ }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
  const text = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0] as string
  expect(text).toContain("test.member@example.com")
  for (const bad of ["Drafted from", "Review before use", "Target —", "Globex", "I trained while"]) expect(text).not.toContain(bad)
})

test("on: the Mini card is built from the draft, with no request", () => {
  sources = ON
  genData = OPTION_DRAFT
  renderPage()
  fireEvent.click(screen.getByTestId("resume-mini-open"))
  expect(screen.getByTestId("resume-mini-text")).toHaveTextContent("Led a team of 8")
  expect(mutate).not.toHaveBeenCalled()
})

test("on: the file is named for the role the person typed, never the server's default label", async () => {
  sources = ON
  genData = { ...OPTION_DRAFT, target: "the person's next role" }
  renderPage()
  generate()
  fireEvent.click(screen.getByRole("button", { name: /Download Word/ }))
  await waitFor(() => expect(mockAts).toHaveBeenCalledTimes(1))
  expect(mockAts.mock.calls[0][2]).toBeNull()
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "Data Analyst" } })
  generate()
  fireEvent.click(screen.getByRole("button", { name: /Download PDF/ }))
  await waitFor(() => expect(mockAts).toHaveBeenCalledTimes(2))
  expect(mockAts.mock.calls[1][2]).toBe("Data Analyst")
})


// ── RWO-3 Federal (keyed on the server's catalogue) ─────────────────────────

const FEDERAL = {
  ...opt("federal", 7, ["summary", "experience", "education", "certifications", "training", "federal_optional"]),
  takesFederalDetails: true,
  pageLimit: 2,
}
const ON_FED: ResumeWriterSources = { ...ON, options: [...OPTIONS, FEDERAL] }
const FED_DRAFT: GeneratedResume = {
  ...DRAFT,
  option: "federal",
  federal_roles: [{ title: "Lead", organization: "Acme", hours_per_week: "40", series_grade: "GS-0303-05" }],
  federal_optional: ["Secret clearance"],
  qualifications_crosswalk: [
    { requirement: "leading teams", evidence: "Led a team of 8" },
    { requirement: "budget analysis", evidence: "" },
  ],
  removed: [],
}

test("federal: the details box and the federalDetails field exist only for a format that takes them", () => {
  sources = ON_FED
  renderPage()
  expect(screen.queryByTestId("resume-federal-details")).not.toBeInTheDocument()
  fireEvent.click(screen.getByTestId("resume-format-federal"))
  expect(screen.getByTestId("resume-federal-details")).toHaveTextContent("USAJOBS accepts 2 pages at most")
  fireEvent.change(screen.getByLabelText("Federal details"), { target: { value: "Acme: 40 hrs/wk, GS-0303-05" } })
  generate()
  expect(mutate.mock.calls[0][0]).toMatchObject({ option: "federal", federalDetails: "Acme: 40 hrs/wk, GS-0303-05" })
  fireEvent.click(screen.getByTestId("resume-format-hybrid"))
  generate()
  expect(mutate.mock.calls[1][0]).not.toHaveProperty("federalDetails")
})

test("federal: a catalogue without Federal shows no box and sends no federalDetails", () => {
  sources = ON
  renderPage()
  expect(screen.queryByTestId("resume-format-federal")).not.toBeInTheDocument()
  generate()
  expect(mutate.mock.calls[0][0]).not.toHaveProperty("federalDetails")
  expect(mockPages).not.toHaveBeenCalled()
})

test("federal: past the page limit the page says so, with the count", async () => {
  sources = ON_FED
  genData = FED_DRAFT
  mockPages.mockResolvedValue(3)
  renderPage()
  await waitFor(() => expect(screen.getByTestId("resume-page-count")).toHaveTextContent("runs to 3 pages"))
  expect(screen.getByTestId("resume-page-count")).toHaveAttribute("role", "alert")
})

test("federal: within the limit it is a quiet note", async () => {
  sources = ON_FED
  genData = FED_DRAFT
  mockPages.mockResolvedValue(2)
  renderPage()
  await waitFor(() => expect(screen.getByTestId("resume-page-count")).toHaveTextContent("is 2 pages as a PDF"))
  expect(screen.getByTestId("resume-page-count")).toHaveAttribute("role", "status")
})

test("federal: no page count for a format without a limit", async () => {
  sources = ON_FED
  genData = OPTION_DRAFT
  renderPage()
  await waitFor(() => expect(screen.getByTestId("resume-draft")).toBeInTheDocument())
  expect(mockPages).not.toHaveBeenCalled()
  expect(screen.queryByTestId("resume-page-count")).not.toBeInTheDocument()
})

test("federal: the crosswalk is on the page and not in the draft; the file uses the federal layout", async () => {
  sources = ON_FED
  genData = FED_DRAFT
  mockPages.mockResolvedValue(1)
  renderPage()
  const cw = screen.getByTestId("resume-crosswalk")
  expect(cw).toHaveTextContent("Shown by: Led a team of 8")
  expect(cw).toHaveTextContent("Not shown yet")
  expect(screen.getByTestId("resume-draft")).not.toHaveTextContent("budget analysis")
  expect(screen.getByTestId("resume-draft")).toHaveTextContent("2020–2024 | 40 hours per week | GS-0303-05")
  fireEvent.click(screen.getByRole("button", { name: /Download Word/ }))
  await waitFor(() => expect(mockAts).toHaveBeenCalled())
  expect((mockAts.mock.calls[0][0] as ResumeDocument).layout).toBe("federal")
})
