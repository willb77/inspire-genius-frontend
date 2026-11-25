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
  default: ({ result }: { result: { content: string } }) => <div>{result.content}</div>,
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
