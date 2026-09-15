/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import { CareerMatchPanel } from "../CareerMatchPanel"
import type { CareerMatch } from "@/types/development"

// Pure props. The contract under test: the disclaimer is always there, matches
// rank by fit score, the internal/external toggle swaps the list, external
// hints render only when present, and the two actions hand back the match.

function match(over: Partial<CareerMatch> & Pick<CareerMatch, "matchId" | "title" | "fitScore">): CareerMatch {
  return {
    memberId: "m-1",
    kind: "internal",
    classification: "potential_fit",
    rationale: `Why ${over.title}`,
    ...over,
  }
}

const internal: CareerMatch[] = [
  match({ matchId: "i-low", title: "Team Lead", fitScore: 61.4, classification: "potential_fit" }),
  match({ matchId: "i-high", title: "Senior CSM", fitScore: 82.6, classification: "strong_fit", blueprintId: "bp-1" }),
  match({ matchId: "i-mis", title: "Field Sales", fitScore: 38, classification: "misalignment" }),
]

const external: CareerMatch[] = [
  match({
    matchId: "e-1",
    kind: "external",
    title: "Customer Success Manager",
    fitScore: 77,
    onetCode: "13-1151.00",
    requiredEducation: "Bachelor's",
    automationRiskHint: "Low automation risk",
  }),
  match({ matchId: "e-2", kind: "external", title: "Account Manager", fitScore: 70 }),
]

describe("CareerMatchPanel", () => {
  it("always shows the development-input (not a selection decision) disclaimer", () => {
    render(<CareerMatchPanel internal={[]} external={[]} />)
    expect(screen.getByText(/development input, not a selection decision/i)).toBeInTheDocument()
  })

  it("shows the loading state instead of the list while loading", () => {
    render(<CareerMatchPanel internal={internal} external={external} loading />)
    expect(screen.getByText("Loading matches…")).toBeInTheDocument()
    expect(screen.queryByText("Senior CSM")).not.toBeInTheDocument()
  })

  it("shows the honest empty state per kind", () => {
    render(<CareerMatchPanel internal={[]} external={[]} />)
    expect(screen.getByText("No internal matches yet.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("tab", { name: "external" }))
    expect(screen.getByText("No external matches yet.")).toBeInTheDocument()
  })

  it("starts on internal, ranks by fit score descending and numbers the ranks", () => {
    render(<CareerMatchPanel internal={internal} external={external} />)
    expect(screen.getByRole("tab", { name: "internal" })).toHaveAttribute("aria-selected", "true")
    const titles = Array.from(document.querySelectorAll("[data-slot=card-title]")).map((h) => h.textContent)
    expect(titles).toEqual(["#1Senior CSM", "#2Team Lead", "#3Field Sales"])
    expect(screen.queryByText("Customer Success Manager")).not.toBeInTheDocument()
  })

  it("rounds the fit score and labels the classification", () => {
    render(<CareerMatchPanel internal={internal} external={external} />)
    expect(screen.getByText("83%")).toBeInTheDocument()
    expect(screen.getByText("61%")).toBeInTheDocument()
    expect(screen.getByText("Strong fit")).toBeInTheDocument()
    expect(screen.getByText("Potential fit")).toBeInTheDocument()
    expect(screen.getByText("Misalignment")).toBeInTheDocument()
    expect(screen.getByText("Why Senior CSM")).toBeInTheDocument()
  })

  it("the external tab shows the O*NET code, education and automation hints only when present", () => {
    render(<CareerMatchPanel internal={internal} external={external} />)
    fireEvent.click(screen.getByRole("tab", { name: "external" }))
    expect(screen.getByRole("tab", { name: "external" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("O*NET 13-1151.00")).toBeInTheDocument()
    expect(screen.getByText("Bachelor's")).toBeInTheDocument()
    expect(screen.getByText("Low automation risk")).toBeInTheDocument()
    expect(screen.getByText("Account Manager")).toBeInTheDocument()
    expect(screen.getAllByText(/O\*NET/)).toHaveLength(1)
    expect(screen.getAllByText(/automation risk/i)).toHaveLength(1)
  })

  it("internal matches never show the external hints even when the fields are set", () => {
    render(
      <CareerMatchPanel
        internal={[match({ matchId: "i-x", title: "Odd row", fitScore: 50, onetCode: "11-0000.00", requiredEducation: "PhD" })]}
        external={[]}
      />,
    )
    expect(screen.queryByText(/O\*NET/)).not.toBeInTheDocument()
    expect(screen.queryByText("PhD")).not.toBeInTheDocument()
  })

  it("renders no action buttons when no handlers are given", () => {
    render(<CareerMatchPanel internal={internal} external={external} />)
    expect(screen.queryByRole("button", { name: "Set as target" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "View gaps to this role" })).not.toBeInTheDocument()
  })

  it("hands the clicked match to onSetTarget and onViewGaps", () => {
    const onSetTarget = jest.fn()
    const onViewGaps = jest.fn()
    render(<CareerMatchPanel internal={internal} external={external} onSetTarget={onSetTarget} onViewGaps={onViewGaps} />)
    const setButtons = screen.getAllByRole("button", { name: "Set as target" })
    const viewButtons = screen.getAllByRole("button", { name: "View gaps to this role" })
    expect(setButtons).toHaveLength(3)
    // Buttons follow the ranked order, so the first belongs to the top match.
    fireEvent.click(setButtons[0])
    expect(onSetTarget).toHaveBeenCalledWith(expect.objectContaining({ matchId: "i-high", title: "Senior CSM" }))
    fireEvent.click(viewButtons[2])
    expect(onViewGaps).toHaveBeenCalledWith(expect.objectContaining({ matchId: "i-mis", title: "Field Sales" }))
  })
})
