/**
 * RWO-8 — the wireframe details added after the first build (boards Main, Step3,
 * Step4, Step5). These try to disprove:
 *   - the header shows "N of M drafts left today" from the server's own counts;
 *   - step 3 shows "Your choices" — for, format, from, aimed at, bullet style;
 *   - any review line is a button whose menu puts a question, or the start of a
 *     rewrite, in the assistant's box — and sends NOTHING, spends no draft;
 *   - Escape closes the line menu and returns focus to the line;
 *   - the download step shows the exact name the file will be saved under.
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

let sources: ResumeWriterSources
const mutate = jest.fn()
const qMutate = jest.fn()
jest.mock("@/hooks/useResumeWriter", () => ({
  useResumeWriterSources: () => ({ refetch: jest.fn(), data: sources }),
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
const assistantBox = () =>
  within(screen.getByTestId("resume-assistant")).getByLabelText("Ask or give direction") as HTMLInputElement

// ── Header: drafts left today ───────────────────────────────────────────────

test("the header counts drafts left from GET /me, then from the latest draft", () => {
  renderPage()
  expect(screen.getByTestId("guided-drafts-left")).toHaveTextContent("4 of 5 drafts left today")
  fireEvent.click(screen.getByTestId("guided-purpose-same_field"))
  click("Next")
  click("Next")
  fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Operations Manager" } })
  click("Skip questions, write now")
  finishDraft()
  expect(screen.getByTestId("guided-drafts-left")).toHaveTextContent("3 of 5 drafts left today")
})

test("the header never shows a negative count", () => {
  sources = { ...ON, usedToday: 7 }
  renderPage()
  expect(screen.getByTestId("guided-drafts-left")).toHaveTextContent("0 of 5 drafts left today")
})

// ── Step 3: Your choices ────────────────────────────────────────────────────

test("step 3 sums up the choices made so far", () => {
  sources = {
    ...ON,
    sources: { resume: true, bio: true, assessments: ["PRISM"] },
    bulletStyles: [
      { id: "car", name: "CAR", structure: "Challenge, Action, Result", bestFor: "" },
      { id: "xyz", name: "XYZ", structure: "Accomplished X by Y", bestFor: "" },
    ],
  }
  toAim()
  const box = screen.getByTestId("guided-your-choices")
  expect(box).toHaveTextContent("ForWorking in the same field, with a steady history")
  expect(box).toHaveTextContent("FormatFormat 1")
  expect(box).toHaveTextContent("Fromyour résumé + your bio + PRISM")
  expect(box).toHaveTextContent("Aimed atOperations Manager")
  expect(box).toHaveTextContent("Bullet styleCAR")
})

test("Your choices is only on step 3, and says 'General' with no target", () => {
  renderPage()
  expect(screen.queryByTestId("guided-your-choices")).not.toBeInTheDocument()
  fireEvent.click(screen.getByTestId("guided-purpose-same_field"))
  click("Next")
  expect(screen.queryByTestId("guided-your-choices")).not.toBeInTheDocument() // step 2
  click("Next")
  const box = screen.getByTestId("guided-your-choices")
  expect(box).toHaveTextContent("Aimed atGeneral — no particular job")
  // One bullet style on offer is not a choice the person made.
  expect(box).not.toHaveTextContent("Bullet style")
  click("Next: a few quick questions")
  expect(screen.queryByTestId("guided-your-choices")).not.toBeInTheDocument()
})

// ── Step 4: click any line ──────────────────────────────────────────────────

test("each line is a button; the menu's Ask fills the box and sends nothing", () => {
  toReview()
  const line = screen.getByRole("button", { name: /^Ran vendor reviews — ask about or rewrite this line$/ })
  expect(screen.getByTestId("guided-line-hint")).toHaveTextContent("Click any line to ask about it or edit it.")
  fireEvent.click(line)
  expect(line).toHaveAttribute("aria-expanded", "true")
  const menu = screen.getByTestId("guided-line-menu")
  fireEvent.click(within(menu).getByRole("menuitem", { name: "Ask about this line" }))
  expect(assistantBox().value).toBe('Why is this line on my résumé, and is it strong enough: "Ran vendor reviews"')
  expect(assistantBox()).toHaveFocus()
  expect(screen.queryByTestId("guided-line-menu")).not.toBeInTheDocument()
  expect(chat.send).not.toHaveBeenCalled()
  expect(mutate).toHaveBeenCalledTimes(1) // only the first draft
})

test("Rewrite fills the start of a direction; Apply under it still costs one draft", async () => {
  toReview()
  fireEvent.click(screen.getByRole("button", { name: /^Led a team of 12 — ask about/ }))
  fireEvent.click(screen.getByRole("menuitem", { name: "Rewrite this line" }))
  expect(assistantBox().value).toBe("Rewrite: “Led a team of 12” — ")
  expect(chat.send).not.toHaveBeenCalled()
  expect(mutate).toHaveBeenCalledTimes(1)

  fireEvent.change(assistantBox(), { target: { value: "Rewrite: “Led a team of 12” — lead with the result" } })
  await act(async () => {
    fireEvent.click(within(screen.getByTestId("resume-assistant")).getByRole("button", { name: "Send" }))
  })
  fireEvent.click(screen.getByTestId("resume-assistant-apply"))
  const [body] = mutate.mock.calls[1]
  expect(body.instruction).toBe("Rewrite: “Led a team of 12” — lead with the result")
})

test("the same line clicked twice fills the box again after the person cleared it", () => {
  toReview()
  const open = () => fireEvent.click(screen.getByRole("button", { name: /^Ran vendor reviews — ask about/ }))
  open()
  fireEvent.click(screen.getByRole("menuitem", { name: "Ask about this line" }))
  fireEvent.change(assistantBox(), { target: { value: "" } })
  open()
  fireEvent.click(screen.getByRole("menuitem", { name: "Ask about this line" }))
  expect(assistantBox().value).toContain("Ran vendor reviews")
})

test("Escape closes the menu and puts focus back on the line; only one menu is open", () => {
  toReview()
  const a = screen.getByRole("button", { name: /^Led a team of 12 — ask about/ })
  const b = screen.getByRole("button", { name: /^Ran vendor reviews — ask about/ })
  fireEvent.click(a)
  expect(screen.getByRole("menuitem", { name: "Ask about this line" })).toHaveFocus()
  fireEvent.click(b)
  expect(screen.getAllByTestId("guided-line-menu")).toHaveLength(1)
  expect(a).toHaveAttribute("aria-expanded", "false")
  fireEvent.keyDown(screen.getByTestId("guided-line-menu"), { key: "Escape" })
  expect(screen.queryByTestId("guided-line-menu")).not.toBeInTheDocument()
  expect(b).toHaveFocus()
  // Clicking the open line again closes it too.
  fireEvent.click(b)
  fireEvent.click(b)
  expect(screen.queryByTestId("guided-line-menu")).not.toBeInTheDocument()
})

test("two identical bullets are two lines: only the clicked one opens", () => {
  toAim()
  click("Skip questions, write now")
  finishDraft({
    ...DRAFT,
    experience: [
      { title: "Coordinator", organization: "Contoso", dates: "2019 - Present", bullets: ["Ran vendor reviews"] },
      { title: "Clerk", organization: "Fabrikam", dates: "2016 - 2019", bullets: ["Ran vendor reviews"] },
    ],
  })
  const both = screen.getAllByRole("button", { name: /^Ran vendor reviews — ask about/ })
  expect(both).toHaveLength(2)
  fireEvent.click(both[1])
  expect(both[0]).toHaveAttribute("aria-expanded", "false")
  expect(screen.getAllByTestId("guided-line-menu")).toHaveLength(1)
})

// ── Step 5: the file name ───────────────────────────────────────────────────

test("download shows the exact names the files will be saved under", () => {
  toReview()
  click("Looks good — download")
  expect(screen.getByTestId("guided-file-name-docx")).toHaveTextContent(
    "File name: Test-Member-Resume-Operations-Manager.docx",
  )
  expect(screen.getByTestId("guided-file-name-pdf")).toHaveTextContent(
    "File name: Test-Member-Resume-Operations-Manager.pdf",
  )
})
