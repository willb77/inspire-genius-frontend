import { render, screen } from "@testing-library/react"
import BrainMap from "../BrainMap"
import type { DerivedQuadrant } from "@/types/character-lab"

/**
 * The colour NAMES are the trap this component exists to defuse: read as
 * ordinary English, "Gold" suggests discipline and "Green" suggests patience,
 * while the actual pairings are Finishing+Evaluating and Innovating+Initiating.
 * So every tile must print what its pairing measures.
 */
const QUADRANTS: DerivedQuadrant[] = [
  { quadrant_id: 1, name: "Green", value: 71.5, band: "High" },
  { quadrant_id: 2, name: "Blue", value: 28.5, band: "Low" },
  { quadrant_id: 3, name: "Red", value: 85, band: "Very high" },
  { quadrant_id: 4, name: "Gold", value: 19, band: "Very low" },
]

describe("BrainMap", () => {
  it("prints what each pairing measures, not just the colour name", () => {
    render(<BrainMap quadrants={QUADRANTS} />)
    expect(screen.getByText(/Innovating \+ Initiating/)).toBeInTheDocument()
    expect(screen.getByText(/Supporting \+ Coordinating/)).toBeInTheDocument()
    expect(screen.getByText(/Focusing \+ Delivering/)).toBeInTheDocument()
    expect(screen.getByText(/Finishing \+ Evaluating/)).toBeInTheDocument()
  })

  it("pairs each colour with the canonical dimensions, not the rotated ones", () => {
    // Guards the rotation that once shipped: Blue showing Finishing+Evaluating.
    render(<BrainMap quadrants={QUADRANTS} />)
    const tile = (name: string) =>
      screen.getAllByRole("listitem").find((li) => li.textContent?.startsWith(name))!
    expect(tile("Blue")).toHaveTextContent("Supporting + Coordinating")
    expect(tile("Blue")).not.toHaveTextContent("Finishing")
    expect(tile("Gold")).toHaveTextContent("Finishing + Evaluating")
    expect(tile("Gold")).not.toHaveTextContent("Supporting")
  })

  it("shows the values it was given", () => {
    render(<BrainMap quadrants={QUADRANTS} />)
    expect(screen.getByText("71.5")).toBeInTheDocument()
    expect(screen.getByText("19")).toBeInTheDocument()
  })

  it("marks the dominant quadrant", () => {
    render(<BrainMap quadrants={QUADRANTS} />)
    const redTile = screen
      .getAllByRole("listitem")
      .find((li) => li.textContent?.startsWith("Red"))!
    expect(redTile).toHaveTextContent("dominant")
  })

  it("renders nothing when no quadrants were derived", () => {
    const { container } = render(<BrainMap quadrants={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
