import { render, screen } from "@testing-library/react"
import RlhfFeedbackDetailModal from "../RlhfFeedbackDetailModal"

describe("RlhfFeedbackDetailModal", () => {
  const mockEntry = {
    id: "f1",
    feedback_id: "f1",
    session_id: "conv-001",
    agent_id: "coach-123",
    feedback_type: "rating" as const,
    value: 4,
    created_at: "2026-03-15T10:30:00Z",
    coach_id: "coach-123",
    user_id: "user-456",
    rating: 4 as const,
    correction_text: "Better answer here",
    message_id: "msg-789",
    conversation_id: "conv-001",
  }

  it("returns null when entry is null", () => {
    const { container } = render(
      <RlhfFeedbackDetailModal open={true} onOpenChange={jest.fn()} entry={null} />
    )
    expect(container.innerHTML).toBe("")
  })

  it("renders the dialog title", () => {
    render(
      <RlhfFeedbackDetailModal open={true} onOpenChange={jest.fn()} entry={mockEntry} />
    )
    expect(screen.getByText("Feedback Detail")).toBeInTheDocument()
  })

  it("displays correction text", () => {
    render(
      <RlhfFeedbackDetailModal open={true} onOpenChange={jest.fn()} entry={mockEntry} />
    )
    expect(screen.getByText("Better answer here")).toBeInTheDocument()
  })

  it("displays coach and user IDs", () => {
    render(
      <RlhfFeedbackDetailModal open={true} onOpenChange={jest.fn()} entry={mockEntry} />
    )
    expect(screen.getByText("coach-123")).toBeInTheDocument()
    expect(screen.getByText("user-456")).toBeInTheDocument()
  })

  it("displays message ID", () => {
    render(
      <RlhfFeedbackDetailModal open={true} onOpenChange={jest.fn()} entry={mockEntry} />
    )
    expect(screen.getByText("msg-789")).toBeInTheDocument()
  })

  it("shows fallback when no correction text", () => {
    render(
      <RlhfFeedbackDetailModal
        open={true}
        onOpenChange={jest.fn()}
        entry={{ ...mockEntry, correction_text: "" }}
      />
    )
    expect(screen.getByText("No correction provided")).toBeInTheDocument()
  })
})
