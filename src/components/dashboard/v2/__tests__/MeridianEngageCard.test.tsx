import { fireEvent, render, screen } from "@testing-library/react"

import {
  MeridianEngageCard,
  type MeridianQuickChip,
} from "../MeridianEngageCard"

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

  it("renders without quick chips and shows no chip buttons", () => {
    const onAsk = jest.fn()
    const onAssessment = jest.fn()

    render(<MeridianEngageCard onAsk={onAsk} onAssessment={onAssessment} />)

    expect(
      screen.queryByRole("button", { name: "Goals" })
    ).not.toBeInTheDocument()
  })

  it("renders quick chips and calls onQuickChip with the clicked chip", () => {
    const onAsk = jest.fn()
    const onAssessment = jest.fn()
    const onQuickChip = jest.fn()
    const quickChips: MeridianQuickChip[] = [
      { label: "Goals", prompt: "Help me set a goal" },
      { label: "Careers", prompt: "Explore career paths" },
    ]

    render(
      <MeridianEngageCard
        onAsk={onAsk}
        onAssessment={onAssessment}
        quickChips={quickChips}
        onQuickChip={onQuickChip}
      />
    )

    expect(screen.getByRole("button", { name: "Goals" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Careers" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Goals" }))

    expect(onQuickChip).toHaveBeenCalledTimes(1)
    expect(onQuickChip).toHaveBeenCalledWith(quickChips[0])
  })
})
