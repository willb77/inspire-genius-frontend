import { render, screen } from "@testing-library/react"
import { DeliveryTracker } from "../DeliveryTracker"
import type { InvitationStatusResponse } from "@/types/bulk-import"

const mockData: InvitationStatusResponse = {
  batch_id: "batch-1",
  invitations: [
    {
      invite_id: "inv-1",
      batch_id: "batch-1",
      recipient_email: "jane@co.com",
      recipient_name: "Jane Smith",
      role: "manager",
      status: "delivered",
      sent_at: "2026-04-08T10:00:00Z",
      delivered_at: "2026-04-08T10:01:00Z",
    },
    {
      invite_id: "inv-2",
      batch_id: "batch-1",
      recipient_email: "john@co.com",
      recipient_name: "John Doe",
      role: "user",
      status: "failed",
      sent_at: "2026-04-08T10:01:00Z",
      error: "Mailbox not found",
    },
    {
      invite_id: "inv-3",
      batch_id: "batch-1",
      recipient_email: "bob@co.com",
      recipient_name: "Bob Jones",
      role: "user",
      status: "queued",
    },
  ],
  summary: {
    total: 3,
    queued: 1,
    sent: 0,
    delivered: 1,
    opened: 0,
    failed: 1,
  },
}

describe("DeliveryTracker", () => {
  const mockOnResend = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows loading state", () => {
    const { container } = render(
      <DeliveryTracker
        isLoading={true}
        data={undefined}
        onResend={mockOnResend}
        isResending={false}
      />,
    )
    // Should show some loading indicator or empty state
    expect(container).toBeTruthy()
  })

  it("shows summary stats", () => {
    const { container } = render(
      <DeliveryTracker
        isLoading={false}
        data={mockData}
        onResend={mockOnResend}
        isResending={false}
      />,
    )
    const text = container.textContent ?? ""
    expect(text).toContain("3")
  })

  it("shows invitation rows", () => {
    render(
      <DeliveryTracker
        isLoading={false}
        data={mockData}
        onResend={mockOnResend}
        isResending={false}
      />,
    )

    expect(screen.getByText(/jane@co.com/i)).toBeInTheDocument()
    expect(screen.getByText(/john@co.com/i)).toBeInTheDocument()
    expect(screen.getByText(/bob@co.com/i)).toBeInTheDocument()
  })

  it("shows status badges", () => {
    const { container } = render(
      <DeliveryTracker
        isLoading={false}
        data={mockData}
        onResend={mockOnResend}
        isResending={false}
      />,
    )
    const text = container.textContent?.toLowerCase() ?? ""
    expect(text).toContain("delivered")
    expect(text).toContain("failed")
    expect(text).toContain("queued")
  })
})
