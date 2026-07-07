import { fireEvent, render, screen } from "@testing-library/react"

import { MeridianEngageCard } from "../MeridianEngageCard"

const DEFAULT_HERO_PROMPT =
  "I don't know what I want to do — how do I even start?"
const DEFAULT_ENGAGES_LABEL = "MERIDIAN ENGAGES: ALEX · AURA · BRIDGE · ECHO"

describe("MeridianEngageCard", () => {
  it("renders the default engages label and hero prompt in the input", () => {
    const onAsk = jest.fn()
    const onAssessment = jest.fn()

    render(<MeridianEngageCard onAsk={onAsk} onAssessment={onAssessment} />)

    expect(screen.getByText(DEFAULT_ENGAGES_LABEL)).toBeInTheDocument()
    expect(screen.getByDisplayValue(DEFAULT_HERO_PROMPT)).toBeInTheDocument()
  })

  it("calls onAsk with the hero prompt text when send is clicked", () => {
    const onAsk = jest.fn()
    const onAssessment = jest.fn()

    render(<MeridianEngageCard onAsk={onAsk} onAssessment={onAssessment} />)

    fireEvent.click(screen.getByRole("button", { name: "Send" }))

    expect(onAsk).toHaveBeenCalledTimes(1)
    expect(onAsk).toHaveBeenCalledWith(DEFAULT_HERO_PROMPT)
  })

  it("calls onAssessment when the assessment CTA is clicked", () => {
    const onAsk = jest.fn()
    const onAssessment = jest.fn()

    render(<MeridianEngageCard onAsk={onAsk} onAssessment={onAssessment} />)

    fireEvent.click(
      screen.getByRole("button", { name: "Take your PRISM assessment" })
    )

    expect(onAssessment).toHaveBeenCalledTimes(1)
  })
})
