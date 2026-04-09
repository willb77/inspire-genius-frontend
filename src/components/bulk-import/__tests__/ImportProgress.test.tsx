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
