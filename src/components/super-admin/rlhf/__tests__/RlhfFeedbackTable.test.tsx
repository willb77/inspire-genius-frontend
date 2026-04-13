import { render, screen } from "@testing-library/react"
import RlhfFeedbackTable from "../RlhfFeedbackTable"

jest.mock("@/components/super-admin/organization/DataTable", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table">rows: {data.length}</div>
  ),
}))

jest.mock("@/components/shared/Pagination", () => ({
  __esModule: true,
  default: () => <div data-testid="pagination" />,
}))

jest.mock("@/components/shared/LoadingSkeleton", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-skeleton" />,
}))

jest.mock("../RlhfFeedbackDetailModal", () => ({
  __esModule: true,
  default: () => <div data-testid="detail-modal" />,
}))

describe("RlhfFeedbackTable", () => {
  const mockData: import("@/types/feedback").FeedbackListData = {
    feedback: [
      { id: "1", created_at: "2026-03-01T00:00:00Z", coach_id: "c1", user_id: "u1", rating: 5 as const, correction_text: null, message_id: "m1", conversation_id: "conv1" },
    ],
    pagination: { total: 1, page: 1, limit: 10, has_more: false },
  }

  it("renders the data table with feedback", () => {
    render(<RlhfFeedbackTable data={mockData} page={1} onPageChange={jest.fn()} />)
    expect(screen.getByTestId("data-table")).toBeInTheDocument()
    expect(screen.getByText("rows: 1")).toBeInTheDocument()
  })

  it("shows loading skeleton when isLoading", () => {
    render(<RlhfFeedbackTable data={null} isLoading={true} page={1} onPageChange={jest.fn()} />)
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument()
  })

  it("renders pagination", () => {
    render(<RlhfFeedbackTable data={mockData} page={1} onPageChange={jest.fn()} />)
    expect(screen.getByTestId("pagination")).toBeInTheDocument()
  })

  it("shows result count text", () => {
    render(<RlhfFeedbackTable data={mockData} page={1} onPageChange={jest.fn()} />)
    expect(screen.getByText(/of 1 results/)).toBeInTheDocument()
  })

  it("handles null data gracefully", () => {
    render(<RlhfFeedbackTable data={null} page={1} onPageChange={jest.fn()} />)
    expect(screen.getByTestId("data-table")).toBeInTheDocument()
  })
})
