/**
 * The previous version of this suite asserted the queue rendered cards and
 * that Approve/Reject BUTTONS existed. It never asserted that pressing them
 * did anything — which is why the handler could be
 *
 *   setReviewedIds(...); toast.success(`Correction ${action}`)
 *
 * with no API call at all, and stay green. The tests below assert the
 * persistence, not just the pixels.
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import RlhfReviewQueue from "../RlhfReviewQueue"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { email: "reviewer@3pp.com" } }),
}))

const approveMutate = jest.fn()
const rejectMutate = jest.fn()
let correctionsResult: unknown = {
  data: {
    data: {
      corrections: [
        {
          correction_id: "c1",
          agent_id: "Meridian",
          query_text: "How does PRISM scoring work?",
          original_response: "Original answer",
          corrected_response: "Better response here",
          submitted_by: "u1",
          status: "pending",
          created_at: "2026-04-01T00:00:00Z",
        },
        {
          correction_id: "c2",
          agent_id: "Aura",
          query_text: "What are the four colours?",
          original_response: "Old answer",
          corrected_response: "Improved answer text",
          submitted_by: "u2",
          status: "pending",
          created_at: "2026-04-01T00:00:00Z",
        },
      ],
      count: 2,
    },
  },
  isLoading: false,
  error: null,
}

jest.mock("@/hooks/rlhf/useCorrections", () => ({
  useCorrections: () => correctionsResult,
  useApproveCorrection: () => ({ mutate: approveMutate, isPending: false, variables: undefined }),
  useRejectCorrection: () => ({ mutate: rejectMutate, isPending: false, variables: undefined }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe("RlhfReviewQueue", () => {
  beforeEach(() => {
    approveMutate.mockClear()
    rejectMutate.mockClear()
  })

  it("renders the review queue heading with a pending count", () => {
    renderWithProviders(<RlhfReviewQueue />)
    expect(screen.getByText(/Review Queue/)).toBeInTheDocument()
    expect(screen.getByText("(2 pending)")).toBeInTheDocument()
  })

  it("shows the pending corrections", () => {
    renderWithProviders(<RlhfReviewQueue />)
    expect(screen.getByText("Better response here")).toBeInTheDocument()
    expect(screen.getByText("Improved answer text")).toBeInTheDocument()
  })

  it("PERSISTS an approval instead of only updating local state", () => {
    renderWithProviders(<RlhfReviewQueue />)
    fireEvent.click(screen.getAllByText("Approve")[0])
    expect(approveMutate).toHaveBeenCalledWith({
      correctionId: "c1",
      approvedBy: "reviewer@3pp.com",
    })
  })

  it("requires a reason before it will send a rejection", () => {
    renderWithProviders(<RlhfReviewQueue />)
    fireEvent.click(screen.getAllByText("Reject")[0])

    const confirm = screen.getByText("Confirm rejection")
    // The API requires a reason; an empty one would 422.
    expect(confirm.closest("button")).toBeDisabled()
    expect(rejectMutate).not.toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText(/Why is this correction not suitable/i), {
      target: { value: "Factually wrong" },
    })
    fireEvent.click(screen.getByText("Confirm rejection"))

    expect(rejectMutate).toHaveBeenCalledWith({
      correctionId: "c1",
      rejectedBy: "reviewer@3pp.com",
      reason: "Factually wrong",
    })
  })

  it("distinguishes a failed load from an empty queue", () => {
    const previous = correctionsResult
    correctionsResult = {
      data: undefined,
      isLoading: false,
      error: { message: "Network Error", response: undefined },
    }
    try {
      renderWithProviders(<RlhfReviewQueue />)
      expect(screen.getByText(/Could not load the review queue/i)).toBeInTheDocument()
      // Must NOT claim the queue is clear.
      expect(screen.queryByText(/No corrections awaiting review/i)).not.toBeInTheDocument()
    } finally {
      correctionsResult = previous
    }
  })
})
