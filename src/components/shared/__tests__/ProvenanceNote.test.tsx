import { render, screen } from "@testing-library/react"
import {
  ProvenanceNote,
  provenanceLead,
  provenanceHint,
  type ProvenanceSources,
} from "../ProvenanceNote"

/**
 * The property under test is SYMMETRY: the note renders for every combination
 * of sources, including the complete one. A note that appeared only when
 * something was missing would be a deficiency warning regardless of its wording,
 * and that is the whole thing this component exists to avoid.
 */
const ALL_COMBINATIONS: ProvenanceSources[] = [
  {},
  { prism: true },
  { resume: true },
  { bio: true },
  { goals: true },
  { assessments: true },
  { prism: true, resume: true },
  { prism: true, resume: true, bio: true },
  { resume: true, bio: true },
  { prism: true, assessments: true, resume: true, bio: true, goals: true },
]

describe("ProvenanceNote — symmetry", () => {
  it.each(ALL_COMBINATIONS.map((s) => [JSON.stringify(s), s] as const))(
    "renders for %s",
    (_label, sources) => {
      render(<ProvenanceNote sources={sources} />)
      expect(screen.getByTestId("provenance-note")).toBeInTheDocument()
      expect(screen.getByTestId("provenance-note").textContent?.trim()).not.toBe("")
    },
  )

  it("still renders when everything is on file", () => {
    render(
      <ProvenanceNote
        sources={{ prism: true, assessments: true, resume: true, bio: true, goals: true }}
      />,
    )
    // The complete case is the one a conditional implementation would drop.
    expect(screen.getByTestId("provenance-note")).toBeInTheDocument()
  })
})

describe("ProvenanceNote — leads with what it IS built on", () => {
  it("never opens on the absence", () => {
    for (const sources of ALL_COMBINATIONS) {
      const lead = provenanceLead(sources).toLowerCase()
      expect(lead).not.toMatch(/^no\b/)
      expect(lead).not.toContain("missing")
      expect(lead).not.toContain("without")
    }
  })

  it("distinguishes measured from described", () => {
    expect(provenanceLead({ prism: true, resume: true })).toBe(
      "Measured from 1 instrument, with your own words alongside for context.",
    )
    expect(provenanceLead({ resume: true, bio: true })).toBe(
      "Built from your own words — descriptive, not measured.",
    )
    expect(provenanceLead({ prism: true, assessments: true })).toBe(
      "Measured from 2 instruments.",
    )
  })

  it("names the single source when there is only one", () => {
    expect(provenanceLead({ resume: true })).toContain("your résumé")
    expect(provenanceLead({ goals: true })).toContain("the goals you have set")
  })
})

describe("ProvenanceNote — the hint is an addition, never a correction", () => {
  const FORBIDDEN = [
    // Correction verbs tell the user what they already did was wrong.
    "fix",
    "correct",
    "invalid",
    "accuracy",
    // Deficit vocabulary retro-invalidates the result on screen.
    "generic",
    "limited",
    "incomplete",
    "basic",
    "preliminary",
    "unverified",
    "partial",
  ]

  it("uses no deficit or correction vocabulary in any state", () => {
    for (const sources of ALL_COMBINATIONS) {
      const text = `${provenanceLead(sources)} ${provenanceHint(sources)}`.toLowerCase()
      for (const word of FORBIDDEN) {
        expect(text).not.toContain(word)
      }
    }
  })

  it("suggests PRISM first when it is the thing missing", () => {
    expect(provenanceHint({ resume: true })).toContain("PRISM")
    expect(provenanceHint({ resume: true })).toContain("tunes")
  })

  it("falls silent once everything is on file", () => {
    expect(provenanceHint({ prism: true, resume: true, bio: true })).toBe("")
  })

  it("invites rather than upsells when nothing is on file", () => {
    expect(provenanceHint({})).toContain("composes itself")
  })
})

describe("ProvenanceNote — rendering", () => {
  it("renders the action slot when given one", () => {
    render(
      <ProvenanceNote sources={{ resume: true }} action={<a href="/prism">Take the assessment</a>} />,
    )
    expect(screen.getByRole("link", { name: "Take the assessment" })).toBeInTheDocument()
  })

  it("carries no alert/warning role — this is provenance, not a problem", () => {
    render(<ProvenanceNote sources={{ resume: true }} />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
