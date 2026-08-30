import { render, screen } from "@testing-library/react"
import {
  PortraitDimensions,
  PortraitEvidence,
  PortraitQuadrants,
} from "../PortraitSections"
import type { PortraitEvidenceItem, PrismAnchor } from "@/types/lumen"

/**
 * The two sections the full-scores work added, plus the invariant that keeps
 * them apart from the quadrant summary.
 *
 * These components are shared by the Lumen page and the Direction-Setting
 * Establish stage. The Lumen page's own test renders it with **no router in the
 * tree**, so nothing here may reach for `react-router-dom` — a `Link` in a
 * shared component takes out all eight of that file's tests with a `useHref()`
 * error. Navigation arrives as a slot from whichever page owns a router.
 */

const ANCHOR: PrismAnchor = {
  dominant_quadrant: "Green",
  quadrants: { green: 68, blue: 30, red: 44, gold: 52 },
  dimensions: {
    innovating: 90,
    initiating: 46,
    supporting: 32,
    coordinating: 28,
    focusing: 45,
    delivering: 43,
    finishing: 55,
    evaluating: 49,
  },
  orientation: { introversion: 38, extroversion: 62 },
  score_type: "Underlying",
}

const EVIDENCE: PortraitEvidenceItem[] = [
  {
    source: "resume",
    kind: "span",
    label: "9 years of history on record",
    detail: "Your résumé spans 2015 to 2024.",
  },
  {
    source: "bio",
    kind: "emphasis",
    label: "leading others",
    detail: "How you describe yourself leans toward leading others.",
  },
]

describe("PortraitDimensions", () => {
  it("shows what each quadrant mean is actually made of", () => {
    render(<PortraitDimensions prism={ANCHOR} />)

    // Green 68 is the average of these two. Both numbers have to be visible or
    // the average is the only thing the reader can see.
    expect(screen.getByText("Innovating")).toBeInTheDocument()
    expect(screen.getByText("90")).toBeInTheDocument()
    expect(screen.getByText("Initiating")).toBeInTheDocument()
    expect(screen.getByText("46")).toBeInTheDocument()
  })

  it("names the score variant rather than leaving it to be assumed", () => {
    render(<PortraitDimensions prism={ANCHOR} />)

    expect(screen.getByText(/your Underlying scores/i)).toBeInTheDocument()
  })

  it("admits when the variant was not recorded", () => {
    render(<PortraitDimensions prism={{ ...ANCHOR, score_type: null }} />)

    expect(screen.getByText(/variant wasn't recorded/i)).toBeInTheDocument()
    expect(screen.queryByText(/your Underlying scores/i)).not.toBeInTheDocument()
  })

  it("presents energy direction as a spectrum, not a score out of 100", () => {
    render(<PortraitDimensions prism={ANCHOR} />)

    expect(screen.getByText(/Introverted 38/)).toBeInTheDocument()
    expect(screen.getByText(/Extroverted 62/)).toBeInTheDocument()
    expect(screen.getByText(/part of no quadrant/i)).toBeInTheDocument()
  })

  it("renders nothing at all against a backend that sends neither", () => {
    const { container } = render(
      <PortraitDimensions
        prism={{ dominant_quadrant: "Green", quadrants: { green: 80 } }}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("skips a dimension the backend did not score", () => {
    render(
      <PortraitDimensions
        prism={{ ...ANCHOR, dimensions: { innovating: 90 } }}
      />
    )

    expect(screen.getByText("Innovating")).toBeInTheDocument()
    expect(screen.queryByText("Initiating")).not.toBeInTheDocument()
  })
})

describe("PortraitQuadrants", () => {
  it("draws only the four quadrants, never a dimension", () => {
    render(<PortraitQuadrants prism={ANCHOR} title="PRISM" />)

    expect(screen.getByText("Green leads")).toBeInTheDocument()
    // The eight dimensions and the orientation live in their own section. If
    // they leaked into the quadrant card they would read as extra quadrants.
    expect(screen.queryByText("Innovating")).not.toBeInTheDocument()
    expect(screen.queryByText(/Introverted/)).not.toBeInTheDocument()
  })
})

describe("PortraitEvidence", () => {
  it("attributes each observation to the source it came from", () => {
    render(<PortraitEvidence evidence={EVIDENCE} note="Not a measurement." />)

    expect(screen.getByText("From your résumé")).toBeInTheDocument()
    expect(screen.getByText("From your bio")).toBeInTheDocument()
    expect(screen.getByText(/spans 2015 to 2024/)).toBeInTheDocument()
  })

  it("shows the caveat alongside the observations, not tucked away", () => {
    render(
      <PortraitEvidence
        evidence={EVIDENCE}
        note="Drawn from your own words, not from an assessment."
      />
    )

    expect(
      screen.getByText(/not from an assessment/i)
    ).toBeInTheDocument()
  })

  it("carries no confidence figure — that belongs to things that measure", () => {
    render(<PortraitEvidence evidence={EVIDENCE} note="Not a measurement." />)

    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument()
  })

  it("renders nothing when there is nothing to say", () => {
    const { container } = render(<PortraitEvidence evidence={[]} note={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
