/**
 * RWO-8 — the guided Résumé Writer on `/my/resume` (CSA
 * docs/analysis/2026-11-04-rwo-8-resume-writer-guided-flow-and-assistant-csa.md).
 * These try to disprove:
 *   - without `guidedEnabled` (and its formats) the page is today's — a frontend
 *     merge reaches stable at once, so the server field is the only switch;
 *   - a draft sends the format, the target and ONLY answered questions — never a
 *     skipped one, never the contact details — and no `instruction` unless the
 *     person clicked Apply; questions use the interview, not a draft;
 *   - the assistant sends over `useMeridianChat` with the `resume_writer` surface
 *     and the draft summary, renders its error, and Apply is a click that sends
 *     the person's own message as the instruction, capped;
 *   - "left out — why?" and Undo make no request.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import type { GeneratedResume, InterviewQuestion, ResumeOptionView, ResumeWriterSources } from "@/types/resumeWriter"

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
const QUESTIONS: InterviewQuestion[] = [
  { id: "q1", text: "Have you been responsible for a budget?", why: "The job owns a budget.", requirement: "budget" },
  { id: "q2", text: "Do you hold a Lean certification?", why: "The job prefers Lean.", requirement: "Lean" },
]

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

// ── The switch ──────────────────────────────────────────────────────────────

test("without guidedEnabled the page is today's", () => {
  sources = OFF
  renderPage()
  expect(screen.queryByTestId("guided-resume-writer")).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Generate résumé/ })).toBeInTheDocument()
})

test("guidedEnabled without the formats is today's page too", () => {
  sources = { ...ON, optionsEnabled: false }
  renderPage()
  expect(screen.queryByTestId("guided-resume-writer")).not.toBeInTheDocument()
})

test("with guidedEnabled the page opens on step 1 and recommends a format", () => {
  renderPage()
  expect(screen.getByTestId("guided-step-purpose")).toBeInTheDocument()
  fireEvent.click(screen.getByTestId("guided-purpose-returning"))
  expect(screen.getByTestId("guided-format-choice")).toHaveTextContent("Format: Format 3.")
})

// ── Writing a draft ─────────────────────────────────────────────────────────

test("skip the questions: the draft sends the format and target, and nothing it shouldn't", () => {
  toAim()
  click("Skip questions, write now")
  expect(qMutate).not.toHaveBeenCalled()
  const [body] = mutate.mock.calls[0]
  expect(body).toEqual({
    role: "Operations Manager",
    positionText: "Owns a $2M budget.",
    documentIds: undefined,
    option: "reverse_chrono",
    bulletStyle: "car",
  })
  expect(JSON.stringify(body)).not.toContain("test.member@example.com")
})

test("the interview asks first, without spending a draft, and only answered questions are sent", () => {
  toAim()
  click("Next: a few quick questions")
  expect(mutate).not.toHaveBeenCalled()
  const [qBody, qOpts] = qMutate.mock.calls[0]
  expect(qBody).toEqual({ role: "Operations Manager", positionText: "Owns a $2M budget.", documentIds: undefined, option: "reverse_chrono" })
  act(() => qOpts.onSuccess(QUESTIONS))

  expect(screen.getByTestId("guided-question-current")).toHaveTextContent("Have you been responsible for a budget?")
  expect(screen.getByText("The job owns a budget.")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Save and next" })).toBeDisabled()
  fireEvent.change(screen.getByLabelText(QUESTIONS[0].text), { target: { value: "About $1.2M a year" } })
  click("Save and next")
  fireEvent.change(screen.getByLabelText(QUESTIONS[1].text), { target: { value: "half-typed" } })
  click("Skip this one")
  expect(screen.getByText("Skipped")).toBeInTheDocument()

  fireEvent.click(screen.getByTestId("guided-write"))
  const [body] = mutate.mock.calls[0]
  expect(body.answers).toEqual([{ question: QUESTIONS[0].text, answer: "About $1.2M a year" }])
  expect(body.instruction).toBeUndefined()
  expect(screen.getByTestId("guided-interview-promise")).toHaveTextContent("A number you don't give won't")
})

test("an empty interview says so and still lets the person write", () => {
  toAim()
  click("Next: a few quick questions")
  act(() => qMutate.mock.calls[0][1].onSuccess([]))
  expect(screen.getByTestId("guided-questions-none")).toBeInTheDocument()
  fireEvent.click(screen.getByTestId("guided-write"))
  expect(mutate.mock.calls[0][0].answers).toBeUndefined()
})

test("no drafts left: writing is off, and the cost line says so", () => {
  sources = { ...ON, usedToday: 5 }
  toAim()
  expect(screen.getByRole("button", { name: "Skip questions, write now" })).toBeDisabled()
  expect(screen.getByTestId("guided-cost")).toHaveTextContent("1 of your 0 drafts left today")
})

// ── Review: notes, follow-ups, the assistant, Apply, Undo ───────────────────

test("after the first draft: review, follow-ups only about lines without a number", () => {
  toAim()
  click("Skip questions, write now")
  finishDraft()
  expect(screen.getByTestId("resume-draft")).toBeInTheDocument()
  const [fBody] = qMutate.mock.calls[0]
  expect(fBody).toEqual({ afterDraft: true, weakBullets: ["Ran vendor reviews"], option: "reverse_chrono" })
})

test("'left out — why?' opens the list with no request", () => {
  toAim()
  click("Skip questions, write now")
  finishDraft()
  const calls = mutate.mock.calls.length + qMutate.mock.calls.length
  fireEvent.click(screen.getByTestId("guided-removed-toggle"))
  expect(screen.getByTestId("guided-removed-list")).toHaveTextContent("Employer not in your résumé: Globex Corporation")
  expect(mutate.mock.calls.length + qMutate.mock.calls.length).toBe(calls)
})

test("the assistant asks over useMeridianChat with the résumé surface and the draft", async () => {
  toAim()
  click("Skip questions, write now")
  finishDraft()
  expect(chat.opts?.context).toEqual({
    surface: "resume_writer",
    resume_draft: expect.stringContaining("Globex Corporation (employer not in the résumé)"),
  })
  expect(chat.opts?.accessToken).toBe("tok")
  const panel = screen.getByTestId("resume-assistant")
  fireEvent.change(within(panel).getByLabelText("Ask or give direction"), { target: { value: "Why is Globex missing?" } })
  await act(async () => {
    fireEvent.click(within(panel).getByRole("button", { name: "Send" }))
  })
  expect(chat.send).toHaveBeenCalledWith("Why is Globex missing?")
  expect(mutate).toHaveBeenCalledTimes(1)
})

test("the assistant's failure is shown, not swallowed", () => {
  chat.error = "Couldn't reach Meridian."
  toAim()
  click("Skip questions, write now")
  finishDraft()
  expect(screen.getByTestId("resume-assistant-error")).toHaveAttribute("role", "alert")
})

test("Apply is a click that sends the person's message, capped, with the answers; Undo makes no request", async () => {
  toAim()
  click("Skip questions, write now")
  finishDraft()
  const panel = screen.getByTestId("resume-assistant")
  const long = `Highlight my vendor work ${"x".repeat(400)}`
  fireEvent.change(within(panel).getByLabelText("Ask or give direction"), { target: { value: long } })
  await act(async () => {
    fireEvent.click(within(panel).getByRole("button", { name: "Send" }))
  })
  expect(mutate).toHaveBeenCalledTimes(1)
  fireEvent.click(within(panel).getByTestId("resume-assistant-apply"))
  const [body] = mutate.mock.calls[1]
  expect(body.instruction).toHaveLength(300)
  expect(body.instruction.startsWith("Highlight my vendor work")).toBe(true)
  expect(screen.getByTestId("resume-assistant-apply")).toHaveTextContent("uses 1 of 3 left of 5")

  finishDraft({ ...DRAFT, usedToday: 3, summary: "Runs multi-store teams and vendors." })
  expect(screen.getByTestId("guided-changed-count")).toHaveTextContent("1 line changed")
  expect(document.querySelector('[data-changed="true"]')).toHaveTextContent("Runs multi-store teams and vendors.")
  const before = mutate.mock.calls.length
  fireEvent.click(screen.getByTestId("guided-undo"))
  expect(mutate.mock.calls.length).toBe(before)
  expect(screen.queryByTestId("guided-undo")).not.toBeInTheDocument()
  expect(screen.getByText("Runs multi-store teams.")).toBeInTheDocument()
})

test("an answered follow-up rides the next Apply", async () => {
  toAim()
  click("Skip questions, write now")
  finishDraft()
  act(() => qMutate.mock.calls[0][1].onSuccess([{ id: "q1", text: "What changed after the vendor reviews?", why: "", requirement: "Ran vendor reviews" }]))
  fireEvent.change(screen.getByLabelText("What changed after the vendor reviews?"), { target: { value: "Costs fell 18%" } })
  const panel = screen.getByTestId("resume-assistant")
  fireEvent.change(within(panel).getByLabelText("Ask or give direction"), { target: { value: "Use my answer" } })
  await act(async () => {
    fireEvent.click(within(panel).getByRole("button", { name: "Send" }))
  })
  fireEvent.click(within(panel).getByTestId("resume-assistant-apply"))
  expect(mutate.mock.calls[1][0].answers).toEqual([{ question: "What changed after the vendor reviews?", answer: "Costs fell 18%" }])
})

// ── Step 3's file, and step 5 ──────────────────────────────────────────────

test("a job-description file fills 'Describe the role'; a refusal is said out loud", async () => {
  renderPage()
  fireEvent.click(screen.getByTestId("guided-purpose-same_field"))
  click("Next")
  click("Next")
  expect(screen.getByTestId("guided-file-promise")).toHaveTextContent("isn't uploaded or kept")
  expect(screen.getByTestId("guided-file-promise")).not.toHaveTextContent(/virus/i)
  mockReadJob.mockResolvedValueOnce("Operations Manager. Lean preferred.")
  await act(async () => {
    fireEvent.change(screen.getByTestId("guided-job-file"), { target: { files: [new File(["x"], "posting.pdf")] } })
  })
  expect(screen.getByLabelText("Describe the role")).toHaveValue("Operations Manager. Lean preferred.")
  expect(screen.getByTestId("guided-file-note")).toHaveAttribute("role", "status")

  const { JobFileRefused } = jest.requireMock("@/lib/resume/guided/readJobFile")
  mockReadJob.mockRejectedValueOnce(new JobFileRefused("Programs are refused."))
  await act(async () => {
    fireEvent.change(screen.getByTestId("guided-job-file"), { target: { files: [new File(["x"], "setup.exe")] } })
  })
  expect(screen.getByTestId("guided-file-note")).toHaveAttribute("role", "alert")
  expect(screen.getByTestId("guided-file-note")).toHaveTextContent("Programs are refused.")
})

test("download: Word from the ATS document, named for the job", async () => {
  toAim()
  click("Skip questions, write now")
  finishDraft()
  click("Looks good — download")
  expect(screen.getByTestId("guided-step-download")).toBeInTheDocument()
  await act(async () => {
    click("Download Word")
  })
  expect(mockAts).toHaveBeenCalledWith(expect.objectContaining({ name: "Test Member" }), "docx", "Operations Manager")
  expect(mockDownload).toHaveBeenCalledWith("f.docx", expect.any(Blob))
})

test("'Not sure what you mean?' asks the assistant, which is there before any draft", async () => {
  toAim()
  click("Next: a few quick questions")
  act(() => qMutate.mock.calls[0][1].onSuccess(QUESTIONS))
  await act(async () => {
    click("Not sure what you mean?")
  })
  expect(chat.send).toHaveBeenCalledWith(`What do you mean by this question: "${QUESTIONS[0].text}"?`)
  expect(screen.queryByTestId("resume-assistant-apply")).not.toBeInTheDocument()
})
