/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import FeedbackIndicator from "../FeedbackIndicator"

describe("FeedbackIndicator", () => {
  it("renders positive indicator", () => {
    render(<FeedbackIndicator type="positive" />)
    expect(screen.getByText("Positive")).toBeInTheDocument()
  })

  it("renders negative indicator", () => {
    render(<FeedbackIndicator type="negative" />)
    expect(screen.getByText("Negative")).toBeInTheDocument()
  })

  it("renders correction indicator", () => {
    render(<FeedbackIndicator type="correction" />)
    expect(screen.getByText("Correction")).toBeInTheDocument()
  })
})
