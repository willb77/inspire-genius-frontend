import { fireEvent, render, screen } from "@testing-library/react"

import { BehavioralAssessmentCard } from "../BehavioralAssessmentCard"

describe("BehavioralAssessmentCard", () => {
  it("shows the empty state and hides the report button when hasReport is false", () => {
    render(
      <BehavioralAssessmentCard
        hasReport={false}
        onRequestAssessment={jest.fn()}
        onViewReportPdf={jest.fn()}
      />
    )

    expect(screen.getByText("No assessment yet")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /view report pdf/i })
    ).not.toBeInTheDocument()
  })

  it("shows the report-ready state, filename, and wires View Report PDF", () => {
    const onViewReportPdf = jest.fn()
    render(
      <BehavioralAssessmentCard
        hasReport
        reportFileName="X.csv"
        onRequestAssessment={jest.fn()}
        onViewReportPdf={onViewReportPdf}
      />
    )

    expect(screen.getByText("Report ready")).toBeInTheDocument()
    expect(screen.getByText(/X\.csv/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /view report pdf/i }))
    expect(onViewReportPdf).toHaveBeenCalledTimes(1)
  })

  it("calls onRequestAssessment when the request button is clicked", () => {
    const onRequestAssessment = jest.fn()
    render(
      <BehavioralAssessmentCard
        hasReport={false}
        onRequestAssessment={onRequestAssessment}
        onViewReportPdf={jest.fn()}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: /request an assessment/i })
    )
    expect(onRequestAssessment).toHaveBeenCalledTimes(1)
  })
})
