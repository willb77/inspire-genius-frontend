/**
 * @jest-environment jsdom
 */

/**
 * Role Blueprint Match ("Run James"). A failed run must be visible on the
 * page, not only in a toast that times out: a manager's run failed and the
 * page showed nothing (F-JAMES-1). The alert carries the server's own reason
 * (`detail`), not axios's "Request failed with status code 401".
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

import JobBlueprintBody from "../JobBlueprintBody"
import { tasksService } from "@/services/tasks/tasks.service"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/services/tasks/tasks.service", () => ({
  tasksService: { jobBlueprint: jest.fn() },
}))
jest.mock("@/components/tasks/CostEstimateBanner", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/components/tasks/TaskAgentResultCard", () => ({
  __esModule: true,
  default: ({ result }: { result: { content: string } }) => <div>{result.content}</div>,
}))

const jobBlueprint = tasksService.jobBlueprint as jest.Mock

function renderBody() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <JobBlueprintBody />
    </QueryClientProvider>,
  )
}

function fillAndRun() {
  fireEvent.change(screen.getByLabelText("Role title"), { target: { value: "Engineering Manager" } })
  fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Acme" } })
  fireEvent.change(screen.getByLabelText("Role responsibilities"), { target: { value: "Lead the platform team" } })
  fireEvent.change(screen.getByLabelText("Candidate summary"), { target: { value: "Ten years of delivery" } })
  fireEvent.click(screen.getByRole("button", { name: "Run James" }))
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
  jobBlueprint.mockRejectedValue(axiosError(403, "Agent 'james' is not available to role 'user'."))
  renderBody()
  fillAndRun()

  const alert = await screen.findByRole("alert")
  expect(alert).toHaveTextContent("James could not produce the match. Nothing was generated.")
  expect(alert).toHaveTextContent("Agent 'james' is not available to role 'user'.")
  expect(alert).not.toHaveTextContent("status code 403")
  expect(toast.error).toHaveBeenCalledWith(
    "James (AdminAgent) failed: Agent 'james' is not available to role 'user'.",
  )
})

it("joins a 422 detail list rather than printing an object", async () => {
  jobBlueprint.mockRejectedValue(axiosError(422, [{ msg: "field required" }, { msg: "too long" }]))
  renderBody()
  fillAndRun()

  expect(await screen.findByRole("alert")).toHaveTextContent("field required; too long")
})

it("falls back to the transport message when there is no detail", async () => {
  jobBlueprint.mockRejectedValue(new Error("Network Error"))
  renderBody()
  fillAndRun()

  expect(await screen.findByRole("alert")).toHaveTextContent("Network Error")
})

it("shows no alert on success, and Reset clears a failure", async () => {
  jobBlueprint.mockRejectedValueOnce(axiosError(500, "boom"))
  renderBody()
  fillAndRun()
  await screen.findByRole("alert")

  fireEvent.click(screen.getByRole("button", { name: "Reset" }))
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())

  jobBlueprint.mockResolvedValueOnce({
    agent_name: "James",
    content: "Strong fit on delivery",
    confidence: 0.9,
    suggested_next: null,
    metadata: {},
  })
  fillAndRun()
  expect(await screen.findByText("Strong fit on delivery")).toBeInTheDocument()
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})
