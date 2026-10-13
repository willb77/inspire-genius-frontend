import { render, screen } from "@testing-library/react"
import { ImportProgress } from "../ImportProgress"
import type { BulkImportResponse } from "@/types/bulk-import"

const mockData: BulkImportResponse = {
  batch_id: "batch-1",
  total: 10,
  succeeded: 8,
  failed: 2,
  results: [
    { email: "jane@co.com", status: "success", user_id: "u1" },
    { email: "john@co.com", status: "success", user_id: "u2" },
    { email: "bad@co.com", status: "failed", error: "Invalid email format" },
    { email: "dupe@co.com", status: "failed", error: "Duplicate email" },
    { email: "a@co.com", status: "success", user_id: "u3" },
    { email: "b@co.com", status: "success", user_id: "u4" },
    { email: "c@co.com", status: "success", user_id: "u5" },
    { email: "d@co.com", status: "success", user_id: "u6" },
    { email: "e@co.com", status: "success", user_id: "u7" },
    { email: "f@co.com", status: "success", user_id: "u8" },
  ],
}

describe("ImportProgress", () => {
  const mockOnContinue = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows loading spinner when isLoading", () => {
    const { container } = render(
      <ImportProgress isLoading={true} data={undefined} onContinue={mockOnContinue} />,
    )
    expect(container.querySelector(".animate-spin")).toBeTruthy()
  })

  it("shows progress and results when data provided", () => {
    const { container } = render(
      <ImportProgress isLoading={false} data={mockData} onContinue={mockOnContinue} />,
    )
    const text = container.textContent ?? ""
    expect(text).toContain("10")
    expect(text).toContain("jane@co.com")
  })

  it("shows continue button when import complete", () => {
    render(<ImportProgress isLoading={false} data={mockData} onContinue={mockOnContinue} />)
    expect(screen.getByText(/Continue to Invitations/i)).toBeInTheDocument()
  })

  it("shows download report button when complete", () => {
    render(<ImportProgress isLoading={false} data={mockData} onContinue={mockOnContinue} />)
    expect(screen.getByText(/Download Report/i)).toBeInTheDocument()
  })
})

describe("ImportProgress — invitations ready (org CSA O3)", () => {
  const base: BulkImportResponse = {
    batch_id: "batch-2",
    total: 3,
    succeeded: 3,
    failed: 0,
    results: [
      { email: "a@co.com", status: "success", user_id: "u1" },
      { email: "b@co.com", status: "success", user_id: "u2" },
      { email: "c@co.com", status: "success", user_id: "u3" },
    ],
  }
  const noop = () => {}

  it("shows N of M when every imported row was staged", () => {
    render(
      <ImportProgress
        isLoading={false}
        data={{ ...base, invitations_staged: 3, invitations_failed: 0 }}
        onContinue={noop}
      />,
    )
    expect(screen.getByText("Invitations ready: 3 of 3")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows the shortfall and says what it means when staging failed", () => {
    render(
      <ImportProgress
        isLoading={false}
        data={{ ...base, invitations_staged: 1, invitations_failed: 2 }}
        onContinue={noop}
      />,
    )
    expect(screen.getByText("Invitations ready: 1 of 3")).toBeInTheDocument()
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("2 imported people could not be prepared for an invitation")
    expect(alert).toHaveTextContent("Their accounts were still created.")
  })

  it("uses the singular for one failure", () => {
    render(
      <ImportProgress
        isLoading={false}
        data={{ ...base, invitations_staged: 2, invitations_failed: 1 }}
        onContinue={noop}
      />,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("1 imported person could not")
  })

  it("shows nothing when the server does not report the count", () => {
    render(<ImportProgress isLoading={false} data={base} onContinue={noop} />)
    expect(screen.queryByText(/Invitations ready/)).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows nothing when only one of the two fields is present", () => {
    render(
      <ImportProgress
        isLoading={false}
        data={{ ...base, invitations_staged: 3 }}
        onContinue={noop}
      />,
    )
    expect(screen.queryByText(/Invitations ready/)).not.toBeInTheDocument()
  })

  it("shows neither the count nor the warning when only the failure field is present", () => {
    render(
      <ImportProgress
        isLoading={false}
        data={{ ...base, invitations_failed: 2 }}
        onContinue={noop}
      />,
    )
    expect(screen.queryByText(/Invitations ready/)).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
