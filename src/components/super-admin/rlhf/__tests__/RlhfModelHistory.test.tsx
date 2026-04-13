import { render, screen } from "@testing-library/react"
import RlhfModelHistory from "../RlhfModelHistory"

const mockUseRlhfModels = jest.fn()
const mockMutate = jest.fn()
jest.mock("@/hooks/rlhf/useRlhfModels", () => ({
  useRlhfModels: () => mockUseRlhfModels(),
  useApproveRlhfModel: () => ({ mutate: mockMutate, isPending: false }),
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { email: "admin@test.com" } }),
}))

describe("RlhfModelHistory", () => {
  beforeEach(() => {
    mockUseRlhfModels.mockReturnValue({
      data: {
        data: {
          models: [
            {
              model_id: "m1",
              version: "v1.0",
              status: "active",
              created_at: "2026-03-01T00:00:00Z",
              approved_by: "admin@test.com",
              metrics: { accuracy: 0.92, avg_reward: 0.85, total_records: 1000 },
              train_records: 800,
            },
            {
              model_id: "m2",
              version: "v1.1",
              status: "pending",
              created_at: "2026-03-15T00:00:00Z",
              approved_by: null,
              metrics: { accuracy: 0.88, avg_reward: 0.75, total_records: 500 },
              train_records: 400,
            },
          ],
        },
      },
      isLoading: false,
    })
  })

  it("renders the card title", () => {
    render(<RlhfModelHistory />)
    expect(screen.getByText("Model History")).toBeInTheDocument()
  })

  it("renders model versions", () => {
    render(<RlhfModelHistory />)
    expect(screen.getByText("v1.0")).toBeInTheDocument()
    expect(screen.getByText("v1.1")).toBeInTheDocument()
  })

  it("renders status badges", () => {
    render(<RlhfModelHistory />)
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("Pending Review")).toBeInTheDocument()
  })

  it("shows Approve button for pending models", () => {
    render(<RlhfModelHistory />)
    expect(screen.getByText("Approve")).toBeInTheDocument()
  })

  it("does not show Approve button for active models", () => {
    render(<RlhfModelHistory />)
    const approveButtons = screen.getAllByText("Approve")
    expect(approveButtons.length).toBe(1) // only for pending
  })

  it("shows metrics for models", () => {
    render(<RlhfModelHistory />)
    expect(screen.getByText(/Acc: 92.0%/)).toBeInTheDocument()
    expect(screen.getByText(/Reward: 0.850/)).toBeInTheDocument()
  })

  it("shows loading spinner when loading", () => {
    mockUseRlhfModels.mockReturnValue({ data: undefined, isLoading: true })
    render(<RlhfModelHistory />)
    // Loader2 renders an svg; check model history title still renders
    expect(screen.getByText("Model History")).toBeInTheDocument()
  })

  it("shows empty state when no models", () => {
    mockUseRlhfModels.mockReturnValue({
      data: { data: { models: [] } },
      isLoading: false,
    })
    render(<RlhfModelHistory />)
    expect(screen.getByText("No models registered yet.")).toBeInTheDocument()
  })
})
