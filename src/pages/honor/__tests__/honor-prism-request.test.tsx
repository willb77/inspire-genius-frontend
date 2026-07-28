/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* ── mocks ── */
const requestPrismReport = jest.fn()
jest.mock("@/services/honor/coach.service", () => ({
  requestPrismReport: (...a: unknown[]) => requestPrismReport(...a),
}))
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}))

import RequestPrismModal from "../RequestPrismModal"
import { toast } from "sonner"

function renderModal(onClose = jest.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={qc}>
      <RequestPrismModal open onClose={onClose} />
    </QueryClientProvider>,
  )
  return { onClose }
}

beforeEach(() => jest.clearAllMocks())

test("role and organization are fixed and read-only", () => {
  renderModal()
  const role = screen.getByLabelText("Role") as HTMLInputElement
  const org = screen.getByLabelText("Organization") as HTMLInputElement
  expect(role.value).toBe("user")
  expect(role.disabled).toBe(true)
  expect(org.value).toBe("The Honor Foundation")
  expect(org.disabled).toBe(true)
})

test("all three fields are required", () => {
  renderModal()
  fireEvent.click(screen.getByRole("button", { name: /request report/i }))
  expect(toast.warning).toHaveBeenCalled()
  expect(requestPrismReport).not.toHaveBeenCalled()
})

test("submits name + lowercased email and closes on success", async () => {
  requestPrismReport.mockResolvedValue({
    data: { requestId: "r1", role: "user", organization: "The Honor Foundation" },
  })
  const { onClose } = renderModal()
  fireEvent.change(screen.getByPlaceholderText("Jane"), { target: { value: "Gary" } })
  fireEvent.change(screen.getByPlaceholderText("Doe"), { target: { value: "Burnette" } })
  fireEvent.change(screen.getByPlaceholderText("jane.doe@email.com"), {
    target: { value: "GARY@X.ORG" },
  })
  fireEvent.click(screen.getByRole("button", { name: /request report/i }))

  await waitFor(() =>
    expect(requestPrismReport).toHaveBeenCalledWith({
      firstName: "Gary",
      lastName: "Burnette",
      email: "gary@x.org",
    }),
  )
  await waitFor(() => expect(onClose).toHaveBeenCalled())
})

test("hidden when open is false", () => {
  const qc = new QueryClient()
  const { container } = render(
    <QueryClientProvider client={qc}>
      <RequestPrismModal open={false} onClose={jest.fn()} />
    </QueryClientProvider>,
  )
  expect(container).toBeEmptyDOMElement()
})
