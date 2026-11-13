/**
 * @jest-environment jsdom
 *
 * CX-AGE — the birth-year step on the career exercise page. Shown only when
 * the server says there is no age on file; asks the year and nothing else (no
 * "18 or over", no cut-off); posts the year once; re-checks; and an answer the
 * exercise is still closed to gets the same counselor words the chat uses.
 */
import fs from "fs"
import path from "path"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockEnabled = jest.fn()
jest.mock("@/services/career-exercise/counselor.service", () => ({
  getCareerExerciseEnabled: () => mockEnabled(),
  getStudentSessions: jest.fn(),
  addStudentNote: jest.fn(),
  confirmStudentPaths: jest.fn(),
}))
const mockAgeStep = jest.fn()
const mockRecord = jest.fn()
const mockList = jest.fn()
jest.mock("@/services/career-exercise/student.service", () => ({
  getMyAgeStep: () => mockAgeStep(),
  recordMyBirthYear: (y: number) => mockRecord(y),
  getMySessions: () => mockList(),
  startMySession: jest.fn(),
  pauseMySession: jest.fn(),
  resumeMySession: jest.fn(),
}))
jest.mock("@/services/job-fit/occupations.service", () => ({
  getOccupationPay: jest.fn(),
  getOccupation: jest.fn(),
}))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { token: "tok" } }) }))
jest.mock("@/hooks/agents/useMeridianChat", () => ({
  useMeridianChat: () => ({
    send: jest.fn(),
    isProcessing: false,
    partial: "",
    error: null,
    clearError: jest.fn(),
    isPushConnected: false,
  }),
}))
jest.mock("@/lib/exportTranscript/renderPdf", () => ({ renderHtmlToPdf: jest.fn() }))
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: jest.fn() }))
jest.mock("@/components/user/chat/AssistantMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import CareerExercisePage from "@/pages/career-exercise/CareerExercisePage"
import { birthYearSchema } from "@/pages/career-exercise/birthYear.schema"

const THIS_YEAR = new Date().getFullYear()

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/x"]}>
        <Routes>
          <Route path="/x" element={<CareerExercisePage />} />
          <Route path="*" element={<p>Discovery home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function httpError(status: number, detail: unknown = "nope") {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { detail } } })
}

async function answer(value: string) {
  const box = await screen.findByLabelText("What year were you born?")
  fireEvent.change(box, { target: { value } })
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEnabled.mockResolvedValue(true)
  mockList.mockResolvedValue({ sessions: [] })
})

test("no age on file: the step is shown instead of the start, and it asks only the year", async () => {
  mockAgeStep.mockResolvedValue({ needsBirthYear: true, next: "counselor" })
  renderPage()
  expect(await screen.findByLabelText("What year were you born?")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Start the exercise" })).toBeNull()
  expect(screen.queryByRole("checkbox")).toBeNull()
  const text = document.body.textContent ?? ""
  expect(text).not.toMatch(/18|eighteen|adult|over|under|old enough|minor/i)
})

test("an age on file: no step, the exercise as before", async () => {
  mockAgeStep.mockResolvedValue({ needsBirthYear: false, next: null })
  renderPage()
  expect(await screen.findByRole("button", { name: "Start the exercise" })).toBeInTheDocument()
  expect(screen.queryByLabelText("What year were you born?")).toBeNull()
})

test("a failed step read does not block the page (the server still decides every turn)", async () => {
  mockAgeStep.mockRejectedValue(httpError(500))
  renderPage()
  expect(await screen.findByRole("button", { name: "Start the exercise" })).toBeInTheDocument()
})

test("an adult answer: posts the year as a number, re-checks, and the exercise opens", async () => {
  mockAgeStep.mockResolvedValueOnce({ needsBirthYear: true, next: "counselor" })
  mockAgeStep.mockResolvedValue({ needsBirthYear: false, next: null })
  mockRecord.mockResolvedValue({ needsBirthYear: false, next: null })
  renderPage()
  await answer("1990")
  await waitFor(() => expect(mockRecord).toHaveBeenCalledWith(1990))
  expect(await screen.findByRole("button", { name: "Start the exercise" })).toBeInTheDocument()
  expect(mockAgeStep).toHaveBeenCalledTimes(2)
  expect(screen.queryByText("Talk to your counselor")).toBeNull()
})

test("an answer the exercise is still closed to: the chat's counselor words, nothing about why", async () => {
  mockAgeStep.mockResolvedValueOnce({ needsBirthYear: true, next: "counselor" })
  mockAgeStep.mockResolvedValue({ needsBirthYear: false, next: "counselor" })
  mockRecord.mockResolvedValue({ needsBirthYear: false, next: "counselor" })
  renderPage()
  await answer(String(THIS_YEAR - 15))
  const notice = await screen.findByRole("alert")
  expect(notice).toHaveTextContent("Talk to your counselor")
  expect(notice).toHaveTextContent("The exercise has stopped here for now and your counselor is the next step.")
  expect(notice.textContent).not.toMatch(/18|age|old|young|minor|year/i)
})

test("an age already on file (409) is not an error: the page re-checks and moves on", async () => {
  mockAgeStep.mockResolvedValueOnce({ needsBirthYear: true, next: "counselor" })
  mockAgeStep.mockResolvedValue({ needsBirthYear: false, next: null })
  mockRecord.mockRejectedValue(httpError(409, { code: "age_on_file", message: "There is nothing to add here." }))
  renderPage()
  await answer("1990")
  expect(await screen.findByRole("button", { name: "Start the exercise" })).toBeInTheDocument()
  expect(screen.queryByRole("alert")).toBeNull()
})

test("a 409 is never shown to the person, even while the re-check still says ask", async () => {
  mockAgeStep.mockResolvedValue({ needsBirthYear: true, next: "counselor" })
  mockRecord.mockRejectedValue(httpError(409, { code: "age_on_file", message: "There is nothing to add here." }))
  renderPage()
  await answer("1990")
  await waitFor(() => expect(mockRecord).toHaveBeenCalled())
  await waitFor(() => expect(mockAgeStep).toHaveBeenCalledTimes(2))
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.queryByText("There is nothing to add here.")).toBeNull()
})

test("a server refusal of the year (422) is said and nothing moves on", async () => {
  mockAgeStep.mockResolvedValue({ needsBirthYear: true, next: "counselor" })
  mockRecord.mockRejectedValue(httpError(422, "Enter the year you were born."))
  renderPage()
  await answer("1990")
  expect(await screen.findByRole("alert")).toHaveTextContent("Enter the year you were born")
  expect(screen.getByLabelText("What year were you born?")).toBeInTheDocument()
})

test("a failed save is said, not swallowed", async () => {
  mockAgeStep.mockResolvedValue({ needsBirthYear: true, next: "counselor" })
  mockRecord.mockRejectedValue(httpError(503, "Your answer could not be saved. Try again shortly."))
  renderPage()
  await answer("1990")
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved")
})

test.each(["", "abc", "199", "19900", String(THIS_YEAR + 1), "1899", "0000"])(
  "an implausible year (%p) is refused in the browser and never posted",
  async (value) => {
    mockAgeStep.mockResolvedValue({ needsBirthYear: true, next: "counselor" })
    renderPage()
    await answer(value)
    expect(await screen.findByText("Enter the year you were born, for example 2001.")).toBeInTheDocument()
    expect(mockRecord).not.toHaveBeenCalled()
  },
)

describe("the schema", () => {
  test("accepts 1900 to this year and gives a number", () => {
    const s = birthYearSchema(2026)
    expect(s.parse({ birthYear: "1900" })).toEqual({ birthYear: 1900 })
    expect(s.parse({ birthYear: " 2026 " })).toEqual({ birthYear: 2026 })
    expect(s.safeParse({ birthYear: "2027" }).success).toBe(false)
    expect(s.safeParse({ birthYear: "1899" }).success).toBe(false)
  })
})

describe("source guards", () => {
  const dir = path.resolve(__dirname, "..")
  const step = fs.readFileSync(path.join(dir, "BirthYearStep.tsx"), "utf8")
  const schema = fs.readFileSync(path.join(dir, "birthYear.schema.ts"), "utf8")

  test("the step goes through the hook, never the service or axios", () => {
    expect(step).toMatch(/useRecordBirthYear/)
    expect(step).not.toMatch(/student\.service|agentApi/)
  })

  test("no age threshold lives in the browser", () => {
    for (const src of [step, schema]) {
      expect(src).not.toMatch(/\b(13|17|18|21)\b/)
      expect(src).not.toMatch(/checkbox/i)
    }
  })
})
