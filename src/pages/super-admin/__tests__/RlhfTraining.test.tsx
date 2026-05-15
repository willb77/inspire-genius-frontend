import { render, screen, fireEvent } from "@testing-library/react"
import RlhfTraining from "../RlhfTraining"
import React from "react"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

jest.mock("@/components/super-admin/rlhf/RlhfMetricCards", () => ({
  __esModule: true,
  default: () => <div data-testid="rlhf-metric-cards" />,
}))
jest.mock("@/components/super-admin/rlhf/RlhfRatingChart", () => ({
  __esModule: true,
  default: () => <div data-testid="rlhf-rating-chart" />,
}))
jest.mock("@/components/super-admin/rlhf/RlhfFeedbackTable", () => ({
  __esModule: true,
  default: () => <div data-testid="rlhf-feedback-table" />,
}))
jest.mock("@/components/super-admin/rlhf/RlhfReviewQueue", () => ({
  __esModule: true,
  default: () => <div data-testid="rlhf-review-queue" />,
}))
jest.mock("@/components/super-admin/rlhf/RlhfModelHistory", () => ({
  __esModule: true,
  default: () => <div data-testid="rlhf-model-history" />,
}))
jest.mock("@/components/super-admin/rlhf/RlhfTrainingStatus", () => ({
  __esModule: true,
  default: () => <div data-testid="rlhf-training-status" />,
}))

jest.mock("@/hooks/feedback/useFeedback", () => ({
  useFeedbackStats: () => ({ data: null, isLoading: false }),
  useFeedbackList: () => ({ data: null, isLoading: false }),
}))

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("@/components/ui/calendar", () => ({
  Calendar: () => <div data-testid="calendar" />,
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

describe("RlhfTraining", () => {
  it("renders the page title", () => {
    render(<RlhfTraining />)
    expect(screen.getByText("RLHF Training Dashboard")).toBeInTheDocument()
  })

  it("renders tabs", () => {
    render(<RlhfTraining />)
    expect(screen.getByText("Overview")).toBeInTheDocument()
    expect(screen.getByText("Review Queue")).toBeInTheDocument()
    expect(screen.getByText("Model History")).toBeInTheDocument()
    expect(screen.getByText("Training Status")).toBeInTheDocument()
  })

  it("renders overview tab components by default", () => {
    render(<RlhfTraining />)
    expect(screen.getByTestId("rlhf-metric-cards")).toBeInTheDocument()
    expect(screen.getByTestId("rlhf-rating-chart")).toBeInTheDocument()
    expect(screen.getByTestId("rlhf-feedback-table")).toBeInTheDocument()
  })

  it("switches to Review Queue tab", () => {
    render(<RlhfTraining />)
    fireEvent.click(screen.getByText("Review Queue"))
    expect(screen.getByTestId("rlhf-review-queue")).toBeInTheDocument()
  })

  it("switches to Model History tab", () => {
    render(<RlhfTraining />)
    fireEvent.click(screen.getByText("Model History"))
    expect(screen.getByTestId("rlhf-model-history")).toBeInTheDocument()
  })

  it("switches to Training Status tab", () => {
    render(<RlhfTraining />)
    fireEvent.click(screen.getByText("Training Status"))
    expect(screen.getByTestId("rlhf-training-status")).toBeInTheDocument()
  })

  it("renders export buttons", () => {
    render(<RlhfTraining />)
    expect(screen.getByText("JSON")).toBeInTheDocument()
    expect(screen.getByText("CSV")).toBeInTheDocument()
  })

  it("wraps content in SuperAdminLayout", () => {
    render(<RlhfTraining />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })
})
