/**
 * @jest-environment jsdom
 */

/**
 * Interview prep ("Prepare questions" → Run Maven). A failed run must be
 * visible on the page, not only in a toast that times out: a manager's run
 * was refused with a 403 and the page showed nothing. The alert carries the
 * server's own reason (`detail`), not axios's "Request failed with status
 * code 403".
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

import InterviewPrepBody from "../InterviewPrepBody"
import { tasksService } from "@/services/tasks/tasks.service"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/services/tasks/tasks.service", () => ({
  tasksService: { interviewPrep: jest.fn() },
}))
jest.mock("@/components/tasks/CostEstimateBanner", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/components/task-agents/QuestionBankPanel", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/components/tasks/TaskAgentResultCard", () => ({
  __esModule: true,
  default: ({ result, renderMarkdown }: { result: { content: string }; renderMarkdown?: boolean }) => (
    <div data-render-markdown={String(Boolean(renderMarkdown))}>{result.content}</div>
  ),
}))

const interviewPrep = tasksService.interviewPrep as jest.Mock

function renderBody() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <InterviewPrepBody />
    </QueryClientProvider>,
  )
}

function fillAndRun() {
  fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Acme" } })
  fireEvent.change(screen.getByLabelText("Industry"), { target: { value: "Software" } })
  fireEvent.change(screen.getByLabelText("Role title"), { target: { value: "Engineering Manager" } })
  fireEvent.click(screen.getByRole("button", { name: "Run Maven" }))
}

function axiosError(status: number, detail: unknown): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { detail } },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

it("shows a refused run on the page with the server's reason", async () => {
  interviewPrep.mockRejectedValue(axiosError(403, "Agent 'maven' is not available to role 'user'."))
  renderBody()
  fillAndRun()

  const alert = await screen.findByRole("alert")
  expect(alert).toHaveTextContent("Maven could not prepare the questions. Nothing was generated.")
  expect(alert).toHaveTextContent("Agent 'maven' is not available to role 'user'.")
  expect(alert).not.toHaveTextContent("status code 403")
  expect(toast.error).toHaveBeenCalledWith(
    "Maven (InterviewAgent) failed: Agent 'maven' is not available to role 'user'.",
  )
})

it("joins a 422 detail list rather than printing an object", async () => {
  interviewPrep.mockRejectedValue(axiosError(422, [{ msg: "field required" }, { msg: "too long" }]))
  renderBody()
  fillAndRun()

  expect(await screen.findByRole("alert")).toHaveTextContent("field required; too long")
})

it("falls back to the transport message when there is no detail", async () => {
  interviewPrep.mockRejectedValue(new Error("Network Error"))
  renderBody()
  fillAndRun()

  expect(await screen.findByRole("alert")).toHaveTextContent("Network Error")
})

it("shows no alert on success, and Reset clears a failure", async () => {
  interviewPrep.mockRejectedValueOnce(axiosError(500, "boom"))
  renderBody()
  fillAndRun()
  await screen.findByRole("alert")

  fireEvent.click(screen.getByRole("button", { name: "Reset" }))
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())

  interviewPrep.mockResolvedValueOnce({
    agent_name: "Maven",
    content: "Three sections of questions",
    confidence: 0.9,
    suggested_next: null,
    metadata: {},
  })
  fillAndRun()
  expect(await screen.findByText("Three sections of questions")).toBeInTheDocument()
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})

// ─── F-W6R1-1: the interview frame fields ─────────────────────────

const OK_RESULT = {
  agent_name: "Maven",
  content: "## Section A",
  confidence: 0.9,
  suggested_next: null,
  metadata: {},
}

it("sends reporting line, scope and topic when they are filled", async () => {
  interviewPrep.mockResolvedValue(OK_RESULT)
  renderBody()
  fireEvent.change(screen.getByLabelText("Reporting line (optional)"), { target: { value: "Reports to the COO" } })
  fireEvent.change(screen.getByLabelText("Scope (optional)"), { target: { value: "Three plants, 400 staff" } })
  fireEvent.change(screen.getByLabelText("Career or education topic (optional)"), {
    target: { value: "Nursing education" },
  })
  fillAndRun()

  await waitFor(() => expect(interviewPrep).toHaveBeenCalledTimes(1))
  expect(interviewPrep.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      company_name: "Acme",
      industry: "Software",
      role_title: "Engineering Manager",
      reporting_line: "Reports to the COO",
      scope: "Three plants, 400 staff",
      topic: "Nursing education",
    }),
  )
})

it("omits blank or whitespace-only frame fields instead of sending empty strings", async () => {
  interviewPrep.mockResolvedValue(OK_RESULT)
  renderBody()
  fireEvent.change(screen.getByLabelText("Scope (optional)"), { target: { value: "   " } })
  fillAndRun()

  await waitFor(() => expect(interviewPrep).toHaveBeenCalledTimes(1))
  const body = interviewPrep.mock.calls[0][0]
  expect(body).not.toHaveProperty("reporting_line")
  expect(body).not.toHaveProperty("scope")
  expect(body).not.toHaveProperty("topic")
  // The pre-existing fields are sent exactly as before.
  expect(body).toEqual({
    company_name: "Acme",
    industry: "Software",
    role_title: "Engineering Manager",
    candidate_name: "",
    interview_focus: "",
  })
})

it("caps the frame fields at the engine's lengths", () => {
  renderBody()
  expect(screen.getByLabelText("Reporting line (optional)")).toHaveAttribute("maxLength", "255")
  expect(screen.getByLabelText("Scope (optional)")).toHaveAttribute("maxLength", "2000")
  expect(screen.getByLabelText("Career or education topic (optional)")).toHaveAttribute("maxLength", "255")
})

it("refuses an over-long topic in the schema even if the input cap is bypassed", async () => {
  renderBody()
  const topic = screen.getByLabelText("Career or education topic (optional)")
  topic.removeAttribute("maxLength")
  fireEvent.change(topic, { target: { value: "x".repeat(256) } })
  fillAndRun()
  await waitFor(() => expect(document.querySelector("#topic ~ p.text-red-600")).not.toBeNull())
  expect(interviewPrep).not.toHaveBeenCalled()
})

it("renders the prep result as Markdown (opts in on the result card)", async () => {
  interviewPrep.mockResolvedValue(OK_RESULT)
  renderBody()
  fillAndRun()
  const card = await screen.findByText("## Section A")
  expect(card).toHaveAttribute("data-render-markdown", "true")
})

// ─── F-W6R1-1-T: honest failure copy per status ───────────────────

const ADMIN_HINT = /ask your administrator/i
const TIMEOUT_COPY = "This took too long to prepare. Try again, or narrow the scope."

it.each([502, 503, 504])("a gateway %i says it took too long, not to ask an administrator", async (status) => {
  interviewPrep.mockRejectedValue(axiosError(status, undefined))
  renderBody()
  fillAndRun()
  const alert = await screen.findByRole("alert")
  expect(alert).toHaveTextContent("Maven could not prepare the questions. Nothing was generated.")
  expect(alert).toHaveTextContent(TIMEOUT_COPY)
  expect(alert).not.toHaveTextContent(ADMIN_HINT)
})

it("a network error with no response (offline, or a gateway 503 without CORS) says it took too long", async () => {
  interviewPrep.mockRejectedValue(Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" }))
  renderBody()
  fillAndRun()
  const alert = await screen.findByRole("alert")
  expect(alert).toHaveTextContent(TIMEOUT_COPY)
  expect(alert).not.toHaveTextContent(ADMIN_HINT)
})

it("only a 403 carries the ask-your-administrator hint", async () => {
  interviewPrep.mockRejectedValue(axiosError(403, "Agent 'maven' is not available to role 'user'."))
  renderBody()
  fillAndRun()
  const alert = await screen.findByRole("alert")
  expect(alert).toHaveTextContent(ADMIN_HINT)
  expect(alert).not.toHaveTextContent(TIMEOUT_COPY)
})

it.each([400, 422, 500])("a %i keeps the generic retry hint, without the admin hint or the timeout copy", async (status) => {
  interviewPrep.mockRejectedValue(axiosError(status, "boom"))
  renderBody()
  fillAndRun()
  const alert = await screen.findByRole("alert")
  expect(alert).toHaveTextContent("Try again in a moment.")
  expect(alert).not.toHaveTextContent(ADMIN_HINT)
  expect(alert).not.toHaveTextContent(TIMEOUT_COPY)
})
