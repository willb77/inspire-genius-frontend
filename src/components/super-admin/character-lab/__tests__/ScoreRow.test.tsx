import { render, screen, fireEvent } from "@testing-library/react"
import ScoreRow from "../ScoreRow"
import type { RubricBand, RubricDimension } from "@/types/character-lab"

const BANDS: RubricBand[] = [
  { min: 0, max: 19, label: "Very low", meaning: "Effectively absent." },
  { min: 20, max: 34, label: "Low", meaning: "A real limitation." },
  { min: 35, max: 49, label: "Moderate-low", meaning: "Available but not preferred." },
  { min: 50, max: 64, label: "Moderate", meaning: "Situational." },
  { min: 65, max: 79, label: "High", meaning: "A genuine strength." },
  { min: 80, max: 100, label: "Very high", meaning: "A defining characteristic." },
]

const DIM: RubricDimension = {
  key: "initiating",
  label: "Initiating",
  measures: "Starting things and moving others to act.",
  high: "Starts without being asked.",
  low: "Waits for direction.",
  is_trait: true,
}

const SD: RubricDimension = {
  key: "sd_score",
  label: "SD Score",
  measures: "Social desirability, on a 0-20 scale.",
  high: "The profile is flattering itself.",
  low: "Responses look candid.",
  is_trait: false,
}

describe("ScoreRow", () => {
  it("shows the score and its band without needing to be opened", () => {
    render(<ScoreRow dimension={DIM} scores={{ Underlying: 88 }} scoreType="Underlying" bands={BANDS} />)
    expect(screen.getByText("88")).toBeInTheDocument()
    expect(screen.getByText("Very high")).toBeInTheDocument()
  })

  it("reveals the definition and both anchors on expand", () => {
    render(<ScoreRow dimension={DIM} scores={{ Underlying: 88 }} scoreType="Underlying" bands={BANDS} />)
    expect(screen.queryByText(/Starts without being asked/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button"))
    expect(screen.getByText(/Starting things and moving others/)).toBeInTheDocument()
    expect(screen.getByText(/Starts without being asked/)).toBeInTheDocument()
    expect(screen.getByText(/Waits for direction/)).toBeInTheDocument()
  })

  it("shows the evidence behind the score when there is any", () => {
    render(
      <ScoreRow
        dimension={DIM}
        scores={{ Underlying: 88 }}
        scoreType="Underlying"
        bands={BANDS}
        evidence="Speaks out of turn at the Sollozzo meeting."
      />,
    )
    fireEvent.click(screen.getByRole("button"))
    expect(screen.getByText(/Sollozzo/)).toBeInTheDocument()
  })

  it("flags a large Adapted/Underlying gap", () => {
    render(
      <ScoreRow dimension={DIM} scores={{ Adapted: 40, Underlying: 88 }} scoreType="Underlying" bands={BANDS} />,
    )
    expect(screen.getByText(/gap -48/)).toBeInTheDocument()
  })

  it("does not flag a small gap as meaningful", () => {
    render(
      <ScoreRow dimension={DIM} scores={{ Adapted: 85, Underlying: 88 }} scoreType="Underlying" bands={BANDS} />,
    )
    expect(screen.queryByText(/gap/)).not.toBeInTheDocument()
  })

  it("does not band a response-style indicator as if it were a trait", () => {
    // SD Score is 0-20. Banding 7 against the 0-100 table would call it "Very low"
    // when it is mid-range for its own scale.
    render(<ScoreRow dimension={SD} scores={{ Underlying: 7 }} scoreType="Underlying" bands={BANDS} />)
    expect(screen.getByText("indicator")).toBeInTheDocument()
    expect(screen.queryByText("Very low")).not.toBeInTheDocument()
  })

  it("renders nothing when the scale has no value for this score type", () => {
    const { container } = render(
      <ScoreRow dimension={DIM} scores={{}} scoreType="Adapted" bands={BANDS} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("falls back to Underlying when the selected score type is absent", () => {
    render(<ScoreRow dimension={DIM} scores={{ Underlying: 55 }} scoreType="Adapted" bands={BANDS} />)
    expect(screen.getByText("55")).toBeInTheDocument()
  })
})
