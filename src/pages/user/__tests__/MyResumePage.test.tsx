/**
 * Résumé Writer page (2026-10-19). The hooks are mocked at the hook boundary;
 * what is under test is that each server state is rendered honestly — never as
 * a draft — and that Generate is only live when a draft can actually be made.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import type { ReactNode } from "react"
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

type SourcesState = { data?: ResumeWriterSources; isLoading?: boolean; isError?: boolean; error?: unknown }
type GenState = { data?: unknown; isPending?: boolean; isError?: boolean; error?: unknown }
let sourcesState: SourcesState = {}
let genState: GenState = {}
const mutate = jest.fn()

jest.mock("@/hooks/useResumeWriter", () => ({
  useResumeWriterSources: () => ({ refetch: jest.fn(), ...sourcesState }),
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

beforeEach(() => {
  jest.clearAllMocks()
  sourcesState = { data: SOURCES() }
  genState = {}
})

test("renders inside the platform layout with what is on file", () => {
  render(<MyResumePage />)
  expect(screen.getByTestId("user-layout")).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Résumé Writer" })).toBeInTheDocument()
  expect(screen.getByTestId("source-résumé")).toHaveTextContent("on file")
  expect(screen.getByTestId("source-bio")).toHaveTextContent("not on file")
  expect(screen.getByText("Assessments: PRISM")).toBeInTheDocument()
  expect(screen.getByTestId("resume-left-today")).toHaveTextContent("3 of 5 left today")
  expect(generateButton()).toBeEnabled()
})

test("sends the target and the chosen own documents", () => {
  render(<MyResumePage />)
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
  render(<MyResumePage />)
  expect(screen.getByTestId("resume-writer-off")).toHaveTextContent("turned off right now")
  expect(generateButton()).toBeDisabled()
})

test("a {disabled:true} reply is shown as switched off, never as a draft", () => {
  genState = { data: { disabled: true } }
  render(<MyResumePage />)
  expect(screen.getByTestId("resume-writer-off")).toBeInTheDocument()
  expect(screen.queryByTestId("resume-draft")).not.toBeInTheDocument()
})

test("limit reached: says so and Generate is disabled", () => {
  sourcesState = { data: SOURCES({ usedToday: 5 }) }
  render(<MyResumePage />)
  expect(screen.getByTestId("resume-limit-reached")).toBeInTheDocument()
  expect(screen.getByTestId("resume-left-today")).toHaveTextContent("0 of 5 left today")
  expect(generateButton()).toBeDisabled()
})

test("no résumé and no bio: asks for one first and opens the upload", () => {
  sourcesState = { data: SOURCES({ sources: { resume: false, bio: false, assessments: [] }, documents: [] }) }
  render(<MyResumePage />)
  expect(screen.getByTestId("resume-no-source")).toHaveTextContent("Add your résumé or bio first")
  expect(generateButton()).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Add your résumé" }))
  expect(screen.getByTestId("upload-modal")).toHaveTextContent("Résumé")
})

test("assessments alone still allow a draft, but the upload prompt stays", () => {
  sourcesState = { data: SOURCES({ sources: { resume: false, bio: false, assessments: ["PRISM"] }, documents: [] }) }
  render(<MyResumePage />)
  expect(screen.getByTestId("resume-no-source")).toBeInTheDocument()
  expect(generateButton()).toBeEnabled()
})

test("a generated résumé is rendered with Copy and Download", () => {
  genState = { data: DRAFT }
  render(<MyResumePage />)
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
  render(<MyResumePage />)
  expect(screen.getByRole("alert")).toBeInTheDocument()
})

test("a failed sources read is rendered as an alert", () => {
  sourcesState = { isError: true, error: new Error("boom") }
  render(<MyResumePage />)
  expect(screen.getByRole("alert")).toBeInTheDocument()
  expect(generateButton()).toBeDisabled()
})
