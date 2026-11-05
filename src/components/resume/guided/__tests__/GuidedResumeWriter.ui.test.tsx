/**
 * RWO-8 — defects found on stable in the browser check (2026-11-05, Lane 814).
 * These try to disprove:
 *   - F1: while GET /me is loading, neither the old page nor the guided flow
 *     renders (it used to show the old page, then swap);
 *   - F2: the guided footer keeps clear of the page's floating help launcher;
 *   - F4: a review line is a block-level button with no side padding, inside
 *     the same list structure as ResumeDocumentView (dot on the first line,
 *     text aligned with the headings);
 *   - F6: download file names wrap at word/hyphen boundaries, never mid-word.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import type { GeneratedResume, ResumeOptionView, ResumeWriterSources } from "@/types/resumeWriter"

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { role: "user", fullName: "Test Member", email: "test.member@example.com", token: "tok" },
  }),
}))
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="user-layout">{children}</div>,
}))
jest.mock("@/components/dashboard/v2/AddPersonalDocModal", () => ({ AddPersonalDocModal: () => null }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/resume/exportResume", () => ({ renderResumePdf: jest.fn() }))
jest.mock("@/lib/resume/exportResumeDocx", () => ({ renderResumeDocx: jest.fn() }))
const mockAts = jest.fn()
const mockPages = jest.fn()
jest.mock("@/lib/resume/exportResumeAts", () => ({
  renderAtsResume: (...a: unknown[]) => mockAts(...a),
  atsPdfPageCount: (...a: unknown[]) => mockPages(...a),
}))
const mockDownload = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: (...a: unknown[]) => mockDownload(...a) }))
const mockReadJob = jest.fn()
jest.mock("@/lib/resume/guided/readJobFile", () => {
  class JobFileRefused extends Error {}
  return { JOB_FILE_ACCEPT: ".pdf,.docx,.txt", JobFileRefused, readJobFile: (...a: unknown[]) => mockReadJob(...a) }
})

let sources: ResumeWriterSources | undefined
let loading = false
const mutate = jest.fn()
const qMutate = jest.fn()
jest.mock("@/hooks/useResumeWriter", () => ({
  useResumeWriterSources: () => ({ refetch: jest.fn(), data: loading ? undefined : sources, isLoading: loading }),
  useGenerateResume: () => ({ mutate, data: undefined, isPending: false, isError: false }),
  useResumeQuestions: () => ({ mutate: qMutate, isPending: false, isError: false }),
  // RWO-8 §9 — only reached while jobFileStorageEnabled; inert here.
  useSavedJobDescriptions: () => ({ data: [] }),
  useSavedJobFile: () => ({ mutate: jest.fn(), isPending: false }),
}))

jest.mock("@/hooks/documents/useDocumentUpload", () => ({
  useDocumentUpload: () => ({ mutate: jest.fn(), isPending: false }),
}))

type ChatOpts = { context?: Record<string, unknown>; sessionKey: string; accessToken?: string }
const chat: { send: jest.Mock; error: string | null; opts: ChatOpts | null } = {
  send: jest.fn(),
  error: null,
  opts: null,
}
jest.mock("@/hooks/agents/useMeridianChat", () => ({
  useMeridianChat: (o: ChatOpts) => {
    chat.opts = o
    return { send: chat.send, isProcessing: false, partial: "", error: chat.error, clearError: jest.fn(), isPushConnected: false }
  },
}))

import MyResumePage from "@/pages/user/MyResumePage"

const opt = (id: string, number: number, extra: Partial<ResumeOptionView> = {}): ResumeOptionView => ({
  id, number, name: `Format ${number}`, atsRating: "excellent", pages: "1-2",
  sections: ["summary", "experience", "education"], requiredInputs: [], recommendedInputs: [],
  useWhen: `Use ${id}`, avoidWhen: "", expect: "", takesDisclosure: false, ...extra,
})

const OPTIONS = [opt("reverse_chrono", 1), opt("hybrid", 2), opt("reentry", 3, { takesDisclosure: true })]
const OFF: ResumeWriterSources = {
  enabled: true,
  dailyLimit: 5,
  usedToday: 1,
  sources: { resume: true, bio: false, assessments: [] },
  documents: [],
  optionsEnabled: true,
  options: OPTIONS,
  bulletStyles: [{ id: "car", name: "CAR", structure: "Challenge, Action, Result", bestFor: "" }],
  defaultOption: "reverse_chrono",
  defaultBulletStyle: "car",
}
const ON: ResumeWriterSources = { ...OFF, guidedEnabled: true }

const DRAFT: GeneratedResume = {
  target: "Operations Manager",
  headline: "Operations Coordinator",
  summary: "Runs multi-store teams.",
  competencies: [],
  experience: [{ title: "Coordinator", organization: "Contoso", dates: "2019 - Present", bullets: ["Led a team of 12", "Ran vendor reviews"] }],
  education: [],
  certifications: [],
  sources: ["Your résumé"],
  grounded: true,
  disclaimer: "Check it.",
  usedToday: 2,
  dailyLimit: 5,
  option: "reverse_chrono",
  bulletStyle: "car",
  removed: [{ section: "experience", reason: "employer", text: "Globex Corporation" }],
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/my/resume"]}>
      <MyResumePage />
    </MemoryRouter>,
  )
const click = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }))

/** Steps 1 and 2, then a posting on step 3. */
const toAim = () => {
  renderPage()
  fireEvent.click(screen.getByTestId("guided-purpose-same_field"))
  click("Next")
  click("Next")
  fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Operations Manager" } })
  fireEvent.change(screen.getByLabelText("Describe the role"), { target: { value: "Owns a $2M budget." } })
}

/** Resolve the last draft request with `draft`. */
const finishDraft = (draft: GeneratedResume = DRAFT) => {
  const [, opts] = mutate.mock.calls[mutate.mock.calls.length - 1]
  act(() => opts.onSuccess(draft))
}

beforeEach(() => {
  jest.clearAllMocks()
  loading = false
  sources = ON
  chat.error = null
  chat.opts = null
  chat.send.mockResolvedValue(undefined)
  mockAts.mockResolvedValue({ fileName: "f.docx", blob: new Blob(["x"]) })
  mockPages.mockResolvedValue(1)
})

const toReview = () => {
  toAim()
  click("Skip questions, write now")
  finishDraft()
}

// ── F1: no flash of the old page ────────────────────────────────────────────

test("F1: while GET /me loads, neither page renders — only a loading line", () => {
  loading = true
  renderPage()
  expect(screen.getByTestId("resume-writer-loading")).toHaveTextContent("Loading the Résumé Writer…")
  expect(screen.queryByTestId("guided-resume-writer")).not.toBeInTheDocument()
  expect(screen.queryByText("What's on file")).not.toBeInTheDocument()
})

test("F1: once loaded, the guided flow (switch on) or today's page (switch off) renders", () => {
  renderPage()
  expect(screen.getByTestId("guided-resume-writer")).toBeInTheDocument()
  expect(screen.queryByTestId("resume-writer-loading")).not.toBeInTheDocument()
})

test("F1: switch off, today's page renders unchanged once loaded", () => {
  sources = OFF
  renderPage()
  expect(screen.queryByTestId("guided-resume-writer")).not.toBeInTheDocument()
  expect(screen.queryByTestId("resume-writer-loading")).not.toBeInTheDocument()
  expect(screen.getByText("What's on file")).toBeInTheDocument()
})

test("F1: a failed GET /me does not leave the loading line up forever", () => {
  sources = undefined // not loading, no data: the request failed
  renderPage()
  expect(screen.queryByTestId("resume-writer-loading")).not.toBeInTheDocument()
  expect(screen.getByText("What's on file")).toBeInTheDocument()
})

// ── F2: clear of the floating help launcher ─────────────────────────────────

test("F2: the guided footer keeps 96px below and 80px right of its buttons clear", () => {
  renderPage()
  const footer = screen.getByTestId("guided-footer")
  expect(footer).toHaveClass("mb-24")
  expect(footer).toHaveClass("pr-20")
  expect(within(footer).getByRole("button", { name: "Next" })).toBeInTheDocument()
})

// ── F4: line buttons laid out like the shared view ──────────────────────────

test("F4: each review line is a block button with no side padding, inside the bullet list", () => {
  toReview()
  const bullet = screen.getByRole("button", { name: /Led a team of 12/ })
  expect(bullet).toHaveClass("block", "w-full", "text-left")
  expect(bullet.className).not.toMatch(/(^|\s)px-/)
  const li = bullet.closest("li")
  expect(li).not.toBeNull()
  expect(li?.parentElement?.tagName).toBe("UL")
  expect(li?.parentElement).toHaveClass("list-disc", "pl-5")
  const summary = screen.getByRole("button", { name: /Runs multi-store teams/ })
  expect(summary).toHaveClass("block")
  expect(summary.className).not.toMatch(/(^|\s)px-/)
})

// ── F6: file names break at words, not mid-word ─────────────────────────────

test("F6: download file names wrap at word or hyphen boundaries", () => {
  toReview()
  click("Looks good — download")
  for (const id of ["guided-file-name-docx", "guided-file-name-pdf"]) {
    const el = screen.getByTestId(id)
    expect(el).toHaveClass("break-words")
    expect(el).not.toHaveClass("break-all")
  }
})
