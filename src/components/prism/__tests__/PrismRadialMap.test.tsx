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

  it("compact shows the score table beside the wheel, in a tight scale, with a cropped viewBox", () => {
    const { container } = render(<PrismRadialMap underlying={UNDERLYING} compact />)
    const table = screen.getByRole("table")
    // Visible: not hidden from sighted users.
    expect(table.closest(".sr-only")).toBeNull()
    expect(screen.getByRole("columnheader", { name: "Dimension" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Quadrant" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Underlying" })).toBeInTheDocument()
    expect(screen.getByText("96").closest("td")).toHaveClass("py-1")
    // Wheel is capped at half size and the viewBox has no empty bands.
    expect(screen.getByTestId("prism-radial-map").getAttribute("style")).toContain("264px")
    const svg = container.querySelector("svg")!
    expect(svg.getAttribute("viewBox")).toBe("0 40 560 524")
    // Wheel precedes the table in reading order (wheel left / above).
    expect(
      screen.getByTestId("prism-radial-map").compareDocumentPosition(table) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("default mode keeps the original layout, viewBox, key position and plain table", () => {
    const { container } = render(<PrismRadialMap underlying={UNDERLYING} />)
    expect((container.firstChild as HTMLElement).className).toBe("grid gap-6 lg:grid-cols-2")
    expect(screen.getByTestId("prism-radial-map").getAttribute("style")).toBeNull()
    expect(container.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 560 600")
    expect(container.querySelector('g[transform="translate(20, 588)"]')).not.toBeNull()
    expect(screen.getByRole("table").closest(".sr-only")).toBeNull()
    expect(screen.getByText("96").closest("td")).not.toHaveClass("py-1")
  })
})
