import { render, screen } from "@testing-library/react"
import RlhfTrainingStatus from "../RlhfTrainingStatus"

const mockUseRlhfModels = jest.fn()
jest.mock("@/hooks/rlhf/useRlhfModels", () => ({
  useRlhfModels: () => mockUseRlhfModels(),
}))

describe("RlhfTrainingStatus", () => {
  it("renders training status card title", () => {
    mockUseRlhfModels.mockReturnValue({
      data: { data: { models: [] } },
      isLoading: false,
    })
    render(<RlhfTrainingStatus />)
    expect(screen.getByText("Training Status")).toBeInTheDocument()
  })

  it("shows no active model message when none active", () => {
    mockUseRlhfModels.mockReturnValue({
      data: { data: { models: [] } },
      isLoading: false,
    })
    render(<RlhfTrainingStatus />)
    expect(screen.getByText("No active model")).toBeInTheDocument()
  })

  it("shows active model version", () => {
    mockUseRlhfModels.mockReturnValue({
      data: {
        data: {
          models: [
            { model_id: "m1", version: "v2.0", status: "active", created_at: "2026-03-01T00:00:00Z", metrics: { accuracy: 0.93, avg_reward: 0.8, total_records: 1000 } },
          ],
        },
      },
      isLoading: false,
    })
    render(<RlhfTrainingStatus />)
    expect(screen.getByText("v2.0")).toBeInTheDocument()
    expect(screen.getByText(/Acc: 93.0%/)).toBeInTheDocument()
  })

  it("shows no training in progress when none training", () => {
    mockUseRlhfModels.mockReturnValue({
      data: { data: { models: [] } },
      isLoading: false,
    })
    render(<RlhfTrainingStatus />)
    expect(screen.getByText("No training in progress")).toBeInTheDocument()
  })

  it("shows no approved models pending deployment", () => {
    mockUseRlhfModels.mockReturnValue({
      data: { data: { models: [] } },
      isLoading: false,
    })
    render(<RlhfTrainingStatus />)
    expect(screen.getByText("No approved models pending deployment")).toBeInTheDocument()
  })

  it("shows summary counts", () => {
    mockUseRlhfModels.mockReturnValue({
      data: {
        data: {
          models: [
            { model_id: "m1", version: "v1", status: "active", created_at: "2026-03-01" },
            { model_id: "m2", version: "v2", status: "pending", created_at: "2026-03-02" },
          ],
        },
      },
      isLoading: false,
    })
    render(<RlhfTrainingStatus />)
    expect(screen.getByText("Total models: 2")).toBeInTheDocument()
    expect(screen.getByText("Approved: 1")).toBeInTheDocument()
    expect(screen.getByText("Pending: 1")).toBeInTheDocument()
  })

  it("shows loading state", () => {
    mockUseRlhfModels.mockReturnValue({ data: undefined, isLoading: true })
    const { container } = render(<RlhfTrainingStatus />)
    // Should not render Training Status title when loading (only renders CardContent)
    expect(container.querySelector("svg")).toBeTruthy()
  })
})
