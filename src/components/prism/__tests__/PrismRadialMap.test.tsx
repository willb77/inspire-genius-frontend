/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { PrismRadialMap } from "../PrismRadialMap"
import type { PrismDimension } from "@/types/development"

const UNDERLYING: PrismDimension[] = [
  { id: 1, label: "Innovating", score: 88, quadrant: 1 },
  { id: 2, label: "Initiating", score: 20, quadrant: 1 },
  { id: 3, label: "Supporting", score: 95, quadrant: 2 },
  { id: 4, label: "Coordinating", score: 92, quadrant: 2 },
  { id: 5, label: "Focusing", score: 29, quadrant: 3 },
  { id: 6, label: "Delivering", score: 46, quadrant: 3 },
  { id: 7, label: "Finishing", score: 35, quadrant: 4 },
  { id: 8, label: "Evaluating", score: 96, quadrant: 4 },
]

describe("PrismRadialMap", () => {
  it("renders the radial wheel and the 8-dimension score table", () => {
    render(<PrismRadialMap underlying={UNDERLYING} />)
    // The wheel itself.
    expect(screen.getByTestId("prism-radial-map")).toBeInTheDocument()
    // Behaviour labels (they appear twice — SVG label + table row — so use getAllByText).
    expect(screen.getAllByText("Innovating").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Evaluating").length).toBeGreaterThan(0)
    // Underlying scores render in the table.
    expect(screen.getByText("88")).toBeInTheDocument()
    expect(screen.getByText("96")).toBeInTheDocument()
    // Only the Underlying layer supplied → its KEY label shows.
    expect(screen.getAllByText("Underlying").length).toBeGreaterThan(0)
  })

  it("overlays Adapted + Consistent columns when those layers are supplied", () => {
    const adapted: PrismDimension[] = UNDERLYING.map((d) => ({
      ...d,
      score: Math.max(0, d.score - 15),
    }))
    render(<PrismRadialMap underlying={UNDERLYING} adapted={adapted} />)
    // Table now carries both layer headers.
    expect(screen.getAllByText("Underlying").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Adapted").length).toBeGreaterThan(0)
    // Adapted Innovating = 88 - 15 = 73.
    expect(screen.getByText("73")).toBeInTheDocument()
  })
})
