/**
 * Résumé Writer page (2026-10-19). The hooks are mocked at the hook boundary;
 * what is under test is that each server state is rendered honestly — never as
 * a draft — and that Generate is only live when a draft can actually be made.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import type { GeneratedResume, ResumeWriterSources } from "@/types/resumeWriter"

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { role: "user", fullName: "Test Member" } }),
}))
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="user-layout">{children}</div>,
}))
jest.mock("@/components/dashboard/v2/AddPersonalDocModal", () => ({
  AddPersonalDocModal: ({ target }: { target: { name: string } | null }) =>
    target ? <div data-testid="upload-modal">{target.name}</div> : null,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/resume/exportResume", () => ({ renderResumePdf: jest.fn() }))
const mockRenderDocx = jest.fn()
jest.mock("@/lib/resume/exportResumeDocx", () => ({ renderResumeDocx: (...a: unknown[]) => mockRenderDocx(...a) }))
const mockDownload = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: (...a: unknown[]) => mockDownload(...a) }))

type SourcesState = { data?: ResumeWriterSources; isLoading?: boolean; isError?: boolean; error?: unknown }
type GenState = { data?: unknown; isPending?: boolean; isError?: boolean; error?: unknown }
let sourcesState: SourcesState = {}
let genState: GenState = {}
const mutate = jest.fn()
const sourcesFor = jest.fn()

jest.mock("@/hooks/useResumeWriter", () => ({
  useResumeWriterSources: (jobId?: string) => {
    sourcesFor(jobId)
    return { refetch: jest.fn(), ...sourcesState }
  },
  useGenerateResume: () => ({ mutate, ...genState }),
}))

import MyResumePage from "@/pages/user/MyResumePage"

const SOURCES = (over: Partial<ResumeWriterSources> = {}): ResumeWriterSources => ({
  enabled: true,
  dailyLimit: 5,
  usedToday: 2,
  sources: { resume: true, bio: false, assessments: ["PRISM"] },
  documents: [{ id: "doc-1", filename: "cv.pdf", docKind: "resume" }],
  ...over,
})

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
  usedToday: 3,
  dailyLimit: 5,
}

const generateButton = () => screen.getByRole("button", { name: /Generate résumé|Drafting/ })

function Where() {
  const loc = useLocation()
  return <div data-testid="where">{loc.pathname + loc.search}</div>
}

function renderPage(path = "/my/resume") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/my/resume"
          element={
            <>
              <MyResumePage />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  sourcesState = { data: SOURCES() }
  genState = {}
})

test("renders inside the platform layout with what is on file", () => {
  renderPage()
  expect(screen.getByTestId("user-layout")).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Résumé Writer" })).toBeInTheDocument()
  expect(screen.getByTestId("source-résumé")).toHaveTextContent("on file")
  expect(screen.getByTestId("source-bio")).toHaveTextContent("not on file")
  expect(screen.getByText("Assessments: PRISM")).toBeInTheDocument()
  expect(screen.getByTestId("resume-left-today")).toHaveTextContent("3 of 5 left today")
  expect(generateButton()).toBeEnabled()
})

test("sends the target and the chosen own documents", () => {
  renderPage()
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "Operations Manager" } })
  fireEvent.click(screen.getByLabelText("cv.pdf"))
  fireEvent.click(generateButton())
  expect(mutate).toHaveBeenCalledWith({
    role: "Operations Manager",
    careerArea: undefined,
    positionText: undefined,
    documentIds: ["doc-1"],
  })
})

test("switched off: says so and Generate is disabled", () => {
  sourcesState = { data: SOURCES({ enabled: false }) }
  renderPage()
  expect(screen.getByTestId("resume-writer-off")).toHaveTextContent("turned off right now")
  expect(generateButton()).toBeDisabled()
})

test("a {disabled:true} reply is shown as switched off, never as a draft", () => {
  genState = { data: { disabled: true } }
  renderPage()
  expect(screen.getByTestId("resume-writer-off")).toBeInTheDocument()
  expect(screen.queryByTestId("resume-draft")).not.toBeInTheDocument()
})

test("limit reached: says so and Generate is disabled", () => {
  sourcesState = { data: SOURCES({ usedToday: 5 }) }
  renderPage()
  expect(screen.getByTestId("resume-limit-reached")).toBeInTheDocument()
  expect(screen.getByTestId("resume-left-today")).toHaveTextContent("0 of 5 left today")
  expect(generateButton()).toBeDisabled()
})

test("no résumé and no bio: asks for one first and opens the upload", () => {
  sourcesState = { data: SOURCES({ sources: { resume: false, bio: false, assessments: [] }, documents: [] }) }
  renderPage()
  expect(screen.getByTestId("resume-no-source")).toHaveTextContent("Add your résumé or bio first")
  expect(generateButton()).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Add your résumé" }))
  expect(screen.getByTestId("upload-modal")).toHaveTextContent("Résumé")
})

test("assessments alone still allow a draft, but the upload prompt stays", () => {
  sourcesState = { data: SOURCES({ sources: { resume: false, bio: false, assessments: ["PRISM"] }, documents: [] }) }
  renderPage()
  expect(screen.getByTestId("resume-no-source")).toBeInTheDocument()
  expect(generateButton()).toBeEnabled()
})

test("a generated résumé is rendered with Copy and Download", () => {
  genState = { data: DRAFT }
  renderPage()
  const draft = screen.getByTestId("resume-draft")
  expect(draft).toHaveTextContent("Test Member")
  expect(draft).toHaveTextContent("Operations Leader")
  expect(draft).toHaveTextContent("Led a team of 8")
  expect(draft).toHaveTextContent("Drafted from: Your résumé.")
  expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Download PDF/ })).toBeInTheDocument()
  expect(screen.getByTestId("resume-left-today")).toHaveTextContent("2 of 5 left today")
})

test("a failed generate is rendered as an alert with the server's reason", () => {
  genState = {
    isError: true,
    error: { isAxiosError: true, response: { status: 429, data: { detail: "You've used today's 5 drafts." } } },
  }
  renderPage()
  expect(screen.getByRole("alert")).toBeInTheDocument()
})

test("a failed sources read is rendered as an alert", () => {
  sourcesState = { isError: true, error: new Error("boom") }
  renderPage()
  expect(screen.getByRole("alert")).toBeInTheDocument()
  expect(generateButton()).toBeDisabled()
})

// ── RW2: aimed at a chosen role ─────────────────────────────────────────────

const ROLE = { jobId: "job-1", title: "Sales Analytics Lead", department: "Analytics" }

const TAILORED: GeneratedResume = {
  ...DRAFT,
  target: "Sales Analytics Lead",
  tailored: true,
  targetRole: ROLE,
  emphasised: ["Build dashboards"],
  notEvidenced: ["Manage vendor contracts"],
  removed: [
    { section: "experience", reason: "employer", text: "Globex Corporation" },
    { section: "experience", reason: "number", text: "Grew revenue by 45%" },
  ],
}

test("RW2: the page asks the server about the jobId in the URL", () => {
  renderPage("/my/resume?jobId=job-1")
  expect(sourcesFor).toHaveBeenCalledWith("job-1")
})

test("RW2: switch off (no tailoredEnabled), a jobId changes nothing on the page", () => {
  renderPage("/my/resume?jobId=job-1")
  expect(screen.queryByTestId("resume-tailored-role")).not.toBeInTheDocument()
  expect(screen.getByLabelText("Role")).toBeInTheDocument()
  fireEvent.click(generateButton())
  expect(mutate).toHaveBeenCalledWith({
    role: undefined, careerArea: undefined, positionText: undefined, documentIds: undefined,
  })
})

test("RW2: a named role is shown, the free-text target is hidden and Generate sends only the jobId", () => {
  sourcesState = { data: SOURCES({ tailoredEnabled: true, targetRole: ROLE, targetRoleStatus: "ok" }) }
  renderPage("/my/resume?jobId=job-1")
  expect(screen.getByTestId("resume-tailored-role")).toHaveTextContent("Sales Analytics Lead")
  expect(screen.queryByLabelText("Role")).not.toBeInTheDocument()
  fireEvent.click(generateButton())
  expect(mutate).toHaveBeenCalledWith({ jobId: "job-1", documentIds: undefined })
})

test("RW2: a tailored draft needs a résumé — a bio alone is not enough", () => {
  sourcesState = {
    data: SOURCES({
      tailoredEnabled: true, targetRole: ROLE, targetRoleStatus: "ok",
      sources: { resume: false, bio: true, assessments: [] }, documents: [],
    }),
  }
  renderPage("/my/resume?jobId=job-1")
  expect(screen.getByTestId("resume-tailored-needs-resume")).toBeInTheDocument()
  expect(generateButton()).toBeDisabled()
})

test("RW2: a role the server will not name says so and falls back to the typed target", () => {
  sourcesState = { data: SOURCES({ tailoredEnabled: true, targetRole: null, targetRoleStatus: "not_found" }) }
  renderPage("/my/resume?jobId=job-x")
  expect(screen.getByTestId("resume-role-unavailable")).toBeInTheDocument()
  expect(screen.queryByTestId("resume-tailored-role")).not.toBeInTheDocument()
  expect(screen.getByLabelText("Role")).toBeInTheDocument()
})

test("RW2: 'Write without this role' drops the jobId from the URL", async () => {
  sourcesState = { data: SOURCES({ tailoredEnabled: true, targetRole: ROLE, targetRoleStatus: "ok" }) }
  renderPage("/my/resume?jobId=job-1")
  fireEvent.click(screen.getByRole("button", { name: "Write without this role instead" }))
  await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/my\/resume$/))
})

test("RW2: everything the check took out is listed with the draft, with what the role still asks for", () => {
  genState = { data: TAILORED }
  renderPage("/my/resume?jobId=job-1")
  const removed = screen.getByTestId("resume-removed")
  expect(removed).toHaveTextContent("Taken out — not in your résumé (2)")
  expect(removed).toHaveTextContent("Employer not in your résumé: Globex Corporation")
  expect(removed).toHaveTextContent("A number that isn't in your résumé: Grew revenue by 45%")
  expect(screen.getByTestId("resume-not-evidenced")).toHaveTextContent("Manage vendor contracts")
  expect(screen.getByTestId("resume-draft")).not.toHaveTextContent("Globex")
})

test("RW2: a tailored draft with nothing taken out says so", () => {
  genState = { data: { ...TAILORED, removed: [], notEvidenced: [] } }
  renderPage("/my/resume?jobId=job-1")
  expect(screen.getByTestId("resume-removed-none")).toBeInTheDocument()
  expect(screen.queryByTestId("resume-not-evidenced")).not.toBeInTheDocument()
})

test("RW2: an untailored draft shows no tailoring notes", () => {
  genState = { data: DRAFT }
  renderPage()
  expect(screen.queryByTestId("resume-tailored-notes")).not.toBeInTheDocument()
})

test("RW2: Download Word builds the .docx and downloads it", async () => {
  genState = { data: DRAFT }
  const blob = new Blob(["docx"])
  mockRenderDocx.mockResolvedValue({ fileName: "resume-test-member.docx", blob })
  renderPage()
  fireEvent.click(screen.getByRole("button", { name: /Download Word/ }))
  await waitFor(() => expect(mockDownload).toHaveBeenCalledWith("resume-test-member.docx", blob))
  expect(mockRenderDocx).toHaveBeenCalledWith(DRAFT, "Test Member")
})
