/**
 * RWO-8 §9 and §10 — "Add a role" and the stored job-description file. These
 * try to disprove:
 *   - with neither server field, the page is exactly today's: no role form, no
 *     `roles` sent, a chosen file fills the box and nothing is uploaded;
 *   - roles are sent only when complete, with no empty fields, at most 5;
 *   - with jobFileStorageEnabled the box is NOT filled; the file uploads as
 *     job_description; "Checking …" holds Write; "Loaded …" only after the scan
 *     passes; the file's text aims the draft after any typed text;
 *   - a refused file, or one still being checked, is dropped with the reason
 *     and its text never reaches a request; a stale answer is ignored;
 *   - a saved job description is listed with its deletion date and re-read.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import type { ResumeOptionView, ResumeWriterSources } from "@/types/resumeWriter"
import { DocumentRejectedError, DocumentStillCheckingError } from "@/lib/documents/scan"

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
jest.mock("@/lib/resume/exportResumeAts", () => ({ renderAtsResume: jest.fn(), atsPdfPageCount: jest.fn() }))
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: jest.fn() }))
const mockReadJob = jest.fn()
jest.mock("@/lib/resume/guided/readJobFile", () => {
  class JobFileRefused extends Error {}
  return { JOB_FILE_ACCEPT: ".pdf,.docx,.txt", JobFileRefused, readJobFile: (...a: unknown[]) => mockReadJob(...a) }
})

let sources: ResumeWriterSources
let saved: { id: string; filename: string; contentType: string; expiresAt: string | null }[] = []
const mutate = jest.fn()
const savedMutate = jest.fn()
jest.mock("@/hooks/useResumeWriter", () => ({
  useResumeWriterSources: () => ({ refetch: jest.fn(), data: sources }),
  useGenerateResume: () => ({ mutate, data: undefined, isPending: false, isError: false }),
  useResumeQuestions: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
  useSavedJobDescriptions: (enabled: boolean) => ({ data: enabled ? saved : undefined }),
  useSavedJobFile: () => ({ mutate: savedMutate, isPending: false }),
}))
const upMutate = jest.fn()
jest.mock("@/hooks/documents/useDocumentUpload", () => ({
  useDocumentUpload: () => ({ mutate: upMutate, isPending: false }),
}))
jest.mock("@/hooks/agents/useMeridianChat", () => ({
  useMeridianChat: () => ({ send: jest.fn(), isProcessing: false, partial: "", error: null, clearError: jest.fn(), isPushConnected: false }),
}))

import MyResumePage from "@/pages/user/MyResumePage"

const opt = (id: string, number: number, extra: Partial<ResumeOptionView> = {}): ResumeOptionView => ({
  id, number, name: `Format ${number}`, atsRating: "excellent", pages: "1-2",
  sections: ["summary", "experience", "education"], requiredInputs: [], recommendedInputs: [],
  useWhen: `Use ${id}`, avoidWhen: "", expect: "", takesDisclosure: false, ...extra,
})
const BASE: ResumeWriterSources = {
  enabled: true,
  dailyLimit: 5,
  usedToday: 1,
  sources: { resume: true, bio: false, assessments: [] },
  documents: [],
  optionsEnabled: true,
  options: [opt("reverse_chrono", 1), opt("hybrid", 2)],
  bulletStyles: [{ id: "car", name: "CAR", structure: "Challenge, Action, Result", bestFor: "" }],
  defaultOption: "reverse_chrono",
  defaultBulletStyle: "car",
  guidedEnabled: true,
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/my/resume"]}>
      <MyResumePage />
    </MemoryRouter>,
  )
const click = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }))
const toInfo = () => {
  renderPage()
  fireEvent.click(screen.getByTestId("guided-purpose-same_field"))
  click("Next")
}
const toAim = () => {
  toInfo()
  click("Next")
}
const lastBody = () => mutate.mock.calls[mutate.mock.calls.length - 1][0]
const pickFile = async (name = "posting.pdf") => {
  await act(async () => {
    fireEvent.change(screen.getByTestId("guided-job-file"), { target: { files: [new File(["x"], name)] } })
  })
}
const writeNow = () => click("Skip questions, write now")

beforeEach(() => {
  jest.clearAllMocks()
  sources = BASE
  saved = []
  mockReadJob.mockResolvedValue("Owns the regional P&L. Lean Six Sigma preferred.")
})

// ── without the server fields: today's page ────────────────────────────────

test("no rolesEnabled: no role form, no roles sent", () => {
  toInfo()
  expect(screen.queryByTestId("guided-roles")).not.toBeInTheDocument()
  click("Next")
  writeNow()
  expect(lastBody()).not.toHaveProperty("roles")
})

test("no jobFileStorageEnabled: the file fills the box and nothing is uploaded", async () => {
  toAim()
  await pickFile()
  expect(screen.getByLabelText("Describe the role")).toHaveValue("Owns the regional P&L. Lean Six Sigma preferred.")
  expect(upMutate).not.toHaveBeenCalled()
  expect(screen.queryByTestId("guided-job-loaded")).not.toBeInTheDocument()
  expect(screen.getByTestId("guided-file-promise")).toHaveTextContent("isn't uploaded or kept")
  expect(screen.queryByTestId("guided-saved-jobs")).not.toBeInTheDocument()
})

// ── §10 Add a role ─────────────────────────────────────────────────────────

const fillRole = (title: string, org: string, extra: { start?: string; present?: boolean; bullet?: string } = {}) => {
  click(/add a role/i)
  fireEvent.change(screen.getByLabelText("Job title"), { target: { value: title } })
  fireEvent.change(screen.getByLabelText("Organization"), { target: { value: org } })
  if (extra.start) fireEvent.change(screen.getByLabelText(/^Start/), { target: { value: extra.start } })
  if (extra.present) fireEvent.click(screen.getByLabelText("I still work here"))
  if (extra.bullet) fireEvent.change(screen.getByLabelText(/What you did/), { target: { value: extra.bullet } })
}

test("a complete role is listed, counted, and sent without empty fields", () => {
  sources = { ...BASE, rolesEnabled: true }
  toInfo()
  fillRole("Founder", "Inspires Genius", { start: "2019", present: true, bullet: "  Built the platform  " })
  click("Save role")
  expect(screen.getByText("Founder, Inspires Genius · 2019 – Present")).toBeInTheDocument()
  expect(screen.getByTestId("guided-roles-count")).toHaveTextContent("1 — on file for this draft")
  click("Next")
  writeNow()
  expect(lastBody().roles).toEqual([
    { title: "Founder", organization: "Inspires Genius", start: "2019", end: "Present", bullets: ["Built the platform"] },
  ])
})

test("a role without an organization cannot be saved", () => {
  sources = { ...BASE, rolesEnabled: true }
  toInfo()
  fillRole("Architecture Leader", "")
  expect(screen.getByRole("button", { name: "Save role" })).toBeDisabled()
})

test("edit and remove change what is sent", () => {
  sources = { ...BASE, rolesEnabled: true }
  toInfo()
  fillRole("CTO", "Application Engineering")
  click("Save role")
  click("Edit CTO")
  fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Distinguished Engineer Emeritus & CTO" } })
  click("Save role")
  expect(screen.getByText("Distinguished Engineer Emeritus & CTO, Application Engineering")).toBeInTheDocument()
  click("Remove Distinguished Engineer Emeritus & CTO")
  expect(screen.queryByTestId("guided-roles-count")).not.toBeInTheDocument()
  click("Next")
  writeNow()
  expect(lastBody()).not.toHaveProperty("roles")
})

test("at most five roles", () => {
  sources = { ...BASE, rolesEnabled: true }
  toInfo()
  for (let i = 1; i <= 5; i++) {
    fillRole(`Role ${i}`, "Org")
    click("Save role")
  }
  expect(screen.queryByTestId("guided-add-role")).not.toBeInTheDocument()
})

test("added roles let a person with nothing else on file write", () => {
  sources = { ...BASE, rolesEnabled: true, sources: { resume: false, bio: false, assessments: [] } }
  toInfo()
  fillRole("Founder", "Inspires Genius")
  click("Save role")
  click("Next")
  expect(screen.getByRole("button", { name: "Skip questions, write now" })).toBeEnabled()
})

// ── §9 the stored job-description file ─────────────────────────────────────

const STORE: ResumeWriterSources = { ...BASE, jobFileStorageEnabled: true }

test("the box is not filled; the file uploads as job_description; checking holds Write", async () => {
  sources = STORE
  toAim()
  await pickFile()
  expect(screen.getByLabelText("Describe the role")).toHaveValue("")
  expect(upMutate).toHaveBeenCalledWith(
    expect.objectContaining({ file: expect.any(File), docKind: "job_description" }),
    expect.anything(),
  )
  expect(screen.getByTestId("guided-job-loaded")).toHaveTextContent("Checking posting.pdf for viruses…")
  expect(screen.getByRole("button", { name: "Skip questions, write now" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Next: a few quick questions" })).toBeDisabled()
  expect(screen.getByTestId("guided-file-promise")).toHaveTextContent("kept with your account for 90 days")
})

test("after the scan passes: Loaded, and the draft is aimed by typed text then the file", async () => {
  sources = STORE
  toAim()
  fireEvent.change(screen.getByLabelText("Describe the role"), { target: { value: "Regional ops lead." } })
  await pickFile()
  act(() => upMutate.mock.calls[0][1].onSuccess({ id: "jd1", status: "ready" }))
  expect(screen.getByTestId("guided-job-loaded")).toHaveTextContent(
    "Loaded posting.pdf — it will be used to aim your résumé. Your description and posting.pdf are both used.",
  )
  writeNow()
  expect(lastBody().positionText).toBe("Regional ops lead.\n\nOwns the regional P&L. Lean Six Sigma preferred.")
  // No document id is sent for the target: nothing to point at another file.
  expect(lastBody().documentIds).toBeUndefined()
})

test("a refused file is dropped with the reason and its text is never sent", async () => {
  sources = STORE
  toAim()
  fireEvent.change(screen.getByLabelText("Describe the role"), { target: { value: "Regional ops lead." } })
  await pickFile()
  act(() => upMutate.mock.calls[0][1].onError(new DocumentRejectedError("A threat was found in this file")))
  expect(screen.queryByTestId("guided-job-loaded")).not.toBeInTheDocument()
  expect(screen.getByTestId("guided-job-note")).toHaveTextContent("This file wasn't accepted: A threat was found in this file")
  writeNow()
  expect(lastBody().positionText).toBe("Regional ops lead.")
})

test("a file still being checked is dropped with 'try again in a minute'", async () => {
  sources = STORE
  toAim()
  await pickFile()
  act(() => upMutate.mock.calls[0][1].onError(new DocumentStillCheckingError()))
  expect(screen.getByTestId("guided-job-note")).toHaveTextContent("We're still checking this file — try again in a minute.")
  expect(screen.queryByTestId("guided-job-loaded")).not.toBeInTheDocument()
})

test("removing the file while it is checked ignores the scan's late answer", async () => {
  sources = STORE
  toAim()
  await pickFile()
  click("Remove")
  act(() => upMutate.mock.calls[0][1].onSuccess({ id: "jd1", status: "ready" }))
  expect(screen.queryByTestId("guided-job-loaded")).not.toBeInTheDocument()
  writeNow()
  expect(lastBody().positionText).toBeUndefined()
})

test("a saved job description is listed with its deletion date and re-read when chosen", async () => {
  sources = STORE
  saved = [{ id: "jd9", filename: "ops-manager.pdf", contentType: "application/pdf", expiresAt: "2027-02-03T12:00:00Z" }]
  toAim()
  const list = screen.getByTestId("guided-saved-jobs")
  expect(list).toHaveTextContent("ops-manager.pdf")
  expect(list).toHaveTextContent("Deletes on 3 Feb 2027")
  fireEvent.click(screen.getByRole("button", { name: /ops-manager\.pdf/ }))
  expect(savedMutate).toHaveBeenCalledWith(saved[0], expect.anything())
  await act(async () => {
    await savedMutate.mock.calls[0][1].onSuccess(new File(["x"], "ops-manager.pdf"))
  })
  await waitFor(() =>
    expect(screen.getByTestId("guided-job-loaded")).toHaveTextContent("Loaded ops-manager.pdf — it will be used to aim your résumé."),
  )
  expect(upMutate).not.toHaveBeenCalled()
  writeNow()
  expect(lastBody().positionText).toBe("Owns the regional P&L. Lean Six Sigma preferred.")
})

test("a saved file that cannot be opened says so", async () => {
  sources = STORE
  saved = [{ id: "jd9", filename: "ops-manager.pdf", contentType: "application/pdf", expiresAt: null }]
  toAim()
  fireEvent.click(screen.getByRole("button", { name: /ops-manager\.pdf/ }))
  act(() => savedMutate.mock.calls[0][1].onError(new Error("403")))
  expect(screen.getByTestId("guided-job-note")).toHaveTextContent("Couldn't open ops-manager.pdf")
})

test("a saved description that opens late does not replace a file picked since", async () => {
  sources = STORE
  saved = [{ id: "jd9", filename: "ops-manager.pdf", contentType: "application/pdf", expiresAt: null }]
  toAim()
  fireEvent.click(screen.getByRole("button", { name: /ops-manager\.pdf/ }))
  await pickFile("new-posting.pdf")
  act(() => upMutate.mock.calls[0][1].onSuccess({ id: "jd2", status: "ready" }))
  mockReadJob.mockResolvedValueOnce("Old saved text.")
  await act(async () => {
    await savedMutate.mock.calls[0][1].onSuccess(new File(["x"], "ops-manager.pdf"))
  })
  expect(screen.getByTestId("guided-job-loaded")).toHaveTextContent("Loaded new-posting.pdf")
  writeNow()
  expect(lastBody().positionText).toBe("Owns the regional P&L. Lean Six Sigma preferred.")
})
