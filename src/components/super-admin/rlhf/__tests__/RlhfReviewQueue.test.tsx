import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import RlhfReviewQueue from "../RlhfReviewQueue"

jest.mock("sonner", () => ({
  toast: { success: jest.fn() },
}))

jest.mock("@/hooks/feedback/useFeedback", () => ({
  useFeedbackList: () => ({
    data: {
      data: {
        feedback: [
          { id: "f1", message_id: "m1", conversation_id: "c1", coach_id: "Meridian", user_id: "u1", rating: 2, correction_text: "Better response here", created_at: "2026-04-01T00:00:00Z" },
          { id: "f2", message_id: "m2", conversation_id: "c2", coach_id: "Aura", user_id: "u2", rating: 1, correction_text: "Improved answer text", created_at: "2026-04-01T00:00:00Z" },
          { id: "f3", message_id: "m3", conversation_id: "c3", coach_id: "Nova", user_id: "u3", rating: 5, correction_text: null, created_at: "2026-04-01T00:00:00Z" },
        ],
        pagination: { total: 3, page: 1, limit: 20, has_more: false },
      },
    },
    isLoading: false,
  }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe("RlhfReviewQueue", () => {
  it("renders the review queue heading", () => {
    renderWithProviders(<RlhfReviewQueue />)
    expect(screen.getByText(/Review Queue/)).toBeInTheDocument()
  })

  it("shows correction items (feedback with correction_text)", () => {
    renderWithProviders(<RlhfReviewQueue />)
    expect(screen.getByText("Better response here")).toBeInTheDocument()
    expect(screen.getByText("Improved answer text")).toBeInTheDocument()
  })

  it("filters out non-correction feedback", () => {
    renderWithProviders(<RlhfReviewQueue />)
    // f3 has no correction_text, should not show as a correction card
    expect(screen.getByText("(2 pending)")).toBeInTheDocument()
  })

  it("renders Approve and Reject buttons for corrections", () => {
    renderWithProviders(<RlhfReviewQueue />)
    expect(screen.getAllByText("Approve").length).toBe(2)
    expect(screen.getAllByText("Reject").length).toBe(2)
  })
})
