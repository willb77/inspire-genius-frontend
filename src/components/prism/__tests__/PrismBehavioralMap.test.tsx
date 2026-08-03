/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { PrismBehavioralMap } from "../PrismBehavioralMap"
import type { PrismDimension } from "@/types/development"

const PRISM: PrismDimension[] = [
  { id: 1, label: "Innovating", score: 95, quadrant: 1 },
  { id: 2, label: "Initiating", score: 88, quadrant: 1 },
  { id: 3, label: "Supporting", score: 92, quadrant: 3 },
  { id: 4, label: "Coordinating", score: 92, quadrant: 3 },
  { id: 5, label: "Focusing", score: 7, quadrant: 4 },
  { id: 6, label: "Delivering", score: 61, quadrant: 4 },
  { id: 7, label: "Finishing", score: 13, quadrant: 2 },
  { id: 8, label: "Evaluating", score: 91, quadrant: 2 },
]

describe("PrismBehavioralMap", () => {
  it("renders the 8-dimension a11y table with labels and scores", () => {
    render(<PrismBehavioralMap prism={PRISM} />)
    expect(screen.getByText("Innovating")).toBeInTheDocument()
    expect(screen.getByText("Evaluating")).toBeInTheDocument()
    // scores rendered
    expect(screen.getByText("95")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
  })
})
