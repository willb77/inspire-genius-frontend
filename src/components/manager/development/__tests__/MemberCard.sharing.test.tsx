/** @jest-environment jsdom */
/**
 * U6c — the sharing chip on the roster card, rendered.
 *
 * 1. Table-driven over the eight states, each from the response shape the
 *    server sends (including `sharing: null`): the chip says exactly the state.
 * 2. Task 4: a card that shows a "nothing shared" kind of chip renders none of
 *    the gated fields (PRISM / Clifton / DISC tick, headline, top match), and a
 *    card that shows any gated field the shared categories do not cover shows
 *    no such chip. The server still sends those fields until U6d; the card is
 *    then shown as it was before U6c, with no chip.
 * 3. Every grantable category has words; no raw key reaches the screen.
 */
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"

import { MemberCard } from "../MemberCard"
import { NOT_KNOWN_SHAPES, SHARING_CASES, parse } from "@/test/rosterSharingFixtures"
import type { RosterMember } from "@/types/development"

function renderCard(member: RosterMember, readWorked: boolean) {
  return render(
    <MemoryRouter>
      <MemberCard member={member} sharingReadWorked={readWorked} />
    </MemoryRouter>,
  )
}

const GATED_TESTIDS = ["coverage-prism-complete", "coverage-clifton-complete", "coverage-disc-complete", "member-card-top-match"]
const HEADLINE = "Steady planner who prefers a clear brief."

function gatedRendered(): string[] {
  const out = GATED_TESTIDS.filter((id) => screen.queryByTestId(id))
  if (screen.queryByText(HEADLINE)) out.push("headline")
  return out
}

describe("the chip says exactly the server's state", () => {
  it.each(SHARING_CASES.map((c) => [c.label, c] as const))("%s", (label, c) => {
    renderCard(parse(c.json), c.readWorked)
    const chip = screen.getByTestId("member-card-sharing")
    expect(chip).toHaveTextContent(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`))
    expect(chip).toHaveAttribute("data-sharing", c.display)
    expect(chip).toHaveAttribute("aria-label", `What Quinn Halvorsen shares with you: ${label}`)
  })

  it.each(NOT_KNOWN_SHAPES.map((s) => [s.why, s] as const))("null is Not known, never Not asked: %s", (_why, s) => {
    renderCard(parse(s.json), s.readWorked)
    expect(screen.getByTestId("member-card-sharing")).toHaveTextContent(/^Not known$/)
    expect(screen.queryByText(/Not asked/)).not.toBeInTheDocument()
  })
})

describe("task 4 — no chip that says 'not shared' beside a field the server still sent", () => {
  const absence = SHARING_CASES.filter((c) => c.claimsAbsence)
  const fields: Array<[string, (m: RosterMember) => RosterMember]> = [
    ["PRISM tick", (m) => ({ ...m, coverage: { ...m.coverage, prism: true } })],
    ["Clifton tick", (m) => ({ ...m, coverage: { ...m.coverage, clifton: true } })],
    ["DISC tick", (m) => ({ ...m, coverage: { ...m.coverage, disc: true } })],
    ["headline", (m) => ({ ...m, reconciledHeadline: HEADLINE })],
    ["top match", (m) => ({ ...m, topMatch: { title: "Planning Lead", fitScore: 77 } })],
  ]

  it.each(absence.flatMap((c) => fields.map(([f, add]) => [c.label, f, c, add] as const)))(
    "%s + %s: card as today, no chip",
    (_label, _field, c, add) => {
      renderCard(add(parse(c.json)), c.readWorked)
      expect(screen.queryByTestId("member-card-sharing")).not.toBeInTheDocument()
      expect(gatedRendered().length).toBeGreaterThan(0)
    },
  )

  it.each(absence.map((c) => [c.label, c] as const))(
    "a card showing %s renders none of the gated fields",
    (_label, c) => {
      renderCard(parse(c.json), c.readWorked)
      expect(screen.getByTestId("member-card-sharing")).toBeInTheDocument()
      expect(gatedRendered()).toEqual([])
    },
  )

  it("Shared without PRISM is not shown beside a PRISM tick or headline", () => {
    const base = parse(SHARING_CASES[0].json)
    const m: RosterMember = {
      ...base,
      coverage: { ...base.coverage, prism: true },
      reconciledHeadline: HEADLINE,
      sharing: { state: "granted", grantedCategories: ["goals"], canRequest: false },
    }
    renderCard(m, true)
    expect(screen.queryByTestId("member-card-sharing")).not.toBeInTheDocument()
  })

  it("Shared with PRISM is shown beside the PRISM tick and headline", () => {
    const base = parse(SHARING_CASES[0].json)
    const m: RosterMember = {
      ...base,
      coverage: { ...base.coverage, prism: true },
      reconciledHeadline: HEADLINE,
      sharing: { state: "granted", grantedCategories: ["prism"], canRequest: false },
    }
    renderCard(m, true)
    expect(screen.getByTestId("member-card-sharing")).toHaveTextContent(/^Shared: PRISM$/)
    expect(screen.getByTestId("coverage-prism-complete")).toBeInTheDocument()
  })

  it.each(["No account", "Not known"])("%s claims nothing and stays beside a PRISM tick", (label) => {
    const c = SHARING_CASES.find((x) => x.label === label)!
    const m = parse(c.json)
    renderCard({ ...m, coverage: { ...m.coverage, prism: true } }, c.readWorked)
    expect(screen.getByTestId("member-card-sharing")).toHaveTextContent(label)
    expect(screen.getByTestId("coverage-prism-complete")).toBeInTheDocument()
  })
})

describe("category labels", () => {
  it("labels all eight categories and never prints a raw key", () => {
    const base = parse(SHARING_CASES[0].json)
    const all = ["prism", "engagement", "topics", "artefacts", "goals", "assessments", "interviews", "development"]
    renderCard({ ...base, sharing: { state: "granted", grantedCategories: all, canRequest: false } }, true)
    const chip = screen.getByTestId("member-card-sharing")
    expect(chip).toHaveTextContent(
      "Shared: PRISM, Engagement, Topics, Documents, Goals, Assessments, Interviews, Development",
    )
    for (const raw of ["artefacts", "interviews", "development"]) {
      expect(within(chip).queryByText(new RegExp(`\\b${raw}\\b`))).not.toBeInTheDocument()
    }
  })

  it("an unknown category reads Other, not its key", () => {
    const base = parse(SHARING_CASES[0].json)
    renderCard({ ...base, sharing: { state: "granted", grantedCategories: ["goals", "safety_x"], canRequest: false } }, true)
    const chip = screen.getByTestId("member-card-sharing")
    expect(chip).toHaveTextContent(/^Shared: Goals, Other$/)
    expect(chip.textContent).not.toMatch(/safety_x/)
  })
})
