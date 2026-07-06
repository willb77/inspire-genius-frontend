import { fireEvent, render, screen } from "@testing-library/react"

import { BehavioralAssessmentCard } from "../BehavioralAssessmentCard"

describe("BehavioralAssessmentCard", () => {
  it("renders the status label and hides the report button when hasReport is false", () => {
    render(
      <BehavioralAssessmentCard
        statusLabel="No assessment yet"
        tone="none"
        lastReportLabel="Last report: not completed"
        hasReport={false}
        onViewReport={jest.fn()}
        onRequestSurvey={jest.fn()}
      />
    )

    expect(screen.getByText("No assessment yet")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /view prism report/i })
    ).not.toBeInTheDocument()
  })

  it("calls onViewReport when the report button is clicked", () => {
    const onViewReport = jest.fn()
    render(
      <BehavioralAssessmentCard
        statusLabel="Report ready"
        tone="active"
        lastReportLabel="Last report: 2 days ago"
        hasReport
        onViewReport={onViewReport}
        onRequestSurvey={jest.fn()}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: /view prism report/i })
    )
    expect(onViewReport).toHaveBeenCalledTimes(1)
  })

  it("disables the Request survey button when surveyDisabled is true", () => {
    render(
      <BehavioralAssessmentCard
        statusLabel="Survey pending"
        tone="pending"
        lastReportLabel="Last report: not completed"
        hasReport={false}
        surveyDisabled
        onViewReport={jest.fn()}
        onRequestSurvey={jest.fn()}
      />
    )

    expect(
      screen.getByRole("button", { name: /request survey/i })
    ).toBeDisabled()
  })
})
