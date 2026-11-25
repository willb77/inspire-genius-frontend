/** @jest-environment jsdom */
/**
 * U6c x U6d — the card when the server sends `withheld` (per-org switch
 * `tds_roster_consent_gate` on).
 *
 * - `withheld` alone decides what was withheld; `sharing` is never used to
 *   infer it.
 * - A withheld card shows its sharing chip and none of the withheld fields; the
 *   PRISM tick stays (D12a).
 * - `planStatus: null` renders, never throws, and never reads "No plan".
 * - The U6c fallback still holds when `withheld` is absent.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"

import { MemberCard } from "../MemberCard"
import { PlanStatusBadge } from "../PlanStatusBadge"
import { U6D_STORED, parse, u6dRow } from "@/test/rosterSharingFixtures"
import type { RosterMember } from "@/types/development"

const NONE = `{"state":"none","grantedCategories":[],"expiresAt":null,"requestedAt":null,"canRequest":true}`
const GRANTED_BOTH = `{"state":"granted","grantedCategories":["development","prism"],"expiresAt":"2027-01-01T00:00:00+00:00","requestedAt":null,"canRequest":false}`
const GRANTED_PRISM = `{"state":"granted","grantedCategories":["prism"],"expiresAt":"2027-01-01T00:00:00+00:00","requestedAt":null,"canRequest":false}`

function renderCard(member: RosterMember) {
  return render(
    <MemoryRouter>
      <MemberCard member={member} sharingReadWorked />
    </MemoryRouter>,
  )
}

function gatedOnScreen(): string[] {
  const out: string[] = []
  if (screen.queryByText(U6D_STORED.headline)) out.push("headline")
  if (screen.queryByText(U6D_STORED.topMatch) || screen.queryByTestId("member-card-top-match")) out.push("topMatch")
  if (screen.queryByText("Active")) out.push("plan")
  if (screen.queryByRole("img", { name: /milestones complete/ }) || screen.queryByLabelText(/milestones complete/)) out.push("milestones")
  return out
}

describe("withheld card: chip, tick, and no withheld field", () => {
  it.each([
    [["prism", "development"], ["headline", "topMatch", "plan", "milestones"]],
    [["prism"], ["headline", "topMatch"]],
    [["development"], ["topMatch", "plan", "milestones"]],
  ] as const)("withheld %j: keeps the PRISM tick, renders none of %j", (withheld, gone) => {
    renderCard(parse(u6dRow([...withheld], NONE)))
    if (withheld.length === 2) {
      // Fully withheld: the chip shows.
      expect(screen.getByTestId("member-card-sharing")).toHaveTextContent(/^Not asked$/)
    } else {
      // Partly withheld: the other category's field was still sent (a page gate
      // off for it, or an exempt caller), so "Not asked" would sit beside it.
      expect(screen.queryByTestId("member-card-sharing")).not.toBeInTheDocument()
    }
    expect(screen.getByTestId("coverage-prism-complete")).toBeInTheDocument()
    const shown = gatedOnScreen()
    for (const g of gone) expect(shown).not.toContain(g)
    expect(shown).toEqual(
      ["headline", "topMatch", "plan", "milestones"].filter((f) => !(gone as readonly string[]).includes(f)),
    )
  })

  it("planStatus null with development withheld renders and says the plan is withheld, not 'No plan'", () => {
    expect(() => renderCard(parse(u6dRow(["development"], NONE)))).not.toThrow()
    expect(screen.getByTestId("member-card-plan-withheld")).toHaveTextContent("Plan withheld")
    expect(screen.queryByText("No plan")).not.toBeInTheDocument()
  })

  it.each([[[]], [null]])("planStatus null with withheld %j still never reads 'No plan' and does not throw", (w) => {
    const m = { ...parse(u6dRow([], NONE)), planStatus: null, withheld: w }
    expect(() => renderCard(m)).not.toThrow()
    expect(screen.queryByText("No plan")).not.toBeInTheDocument()
  })

  it("prism withheld with a PRISM on file says withheld, not 'Invite to complete PRISM'", () => {
    renderCard(parse(u6dRow(["prism"], NONE)))
    expect(screen.getByTestId("member-card-profile-withheld")).toBeInTheDocument()
    expect(screen.queryByText(/Invite to complete/)).not.toBeInTheDocument()
  })

  it("withheld is read from `withheld`, not inferred from a grant: Shared: PRISM and still withheld", () => {
    // A whole-organisation caller can hold a live grant the page rule refuses.
    renderCard(parse(u6dRow(["prism"], GRANTED_PRISM)))
    expect(screen.queryByText(U6D_STORED.headline)).not.toBeInTheDocument()
    expect(screen.getByTestId("member-card-profile-withheld")).toBeInTheDocument()
  })

  it("nothing withheld and both shared: everything shows with the chip", () => {
    renderCard(parse(u6dRow([], GRANTED_BOTH)))
    expect(screen.getByTestId("member-card-sharing")).toHaveTextContent(/^Shared: Development, PRISM$|^Shared: PRISM, Development$/)
    expect(gatedOnScreen()).toEqual(["headline", "topMatch", "plan", "milestones"])
    expect(screen.queryByTestId("member-card-plan-withheld")).not.toBeInTheDocument()
  })

  it("an empty `withheld` with nothing shared (an exempt caller): data shows and no not-shared chip beside it", () => {
    renderCard(parse(u6dRow([], NONE)))
    expect(screen.getByText(U6D_STORED.headline)).toBeInTheDocument()
    expect(screen.queryByTestId("member-card-sharing")).not.toBeInTheDocument()
  })

  it("with `withheld` present the kept PRISM tick does not hide the chip (D12a)", () => {
    renderCard(parse(u6dRow(["prism", "development"], NONE)))
    expect(screen.getByTestId("coverage-prism-complete")).toBeInTheDocument()
    expect(screen.getByTestId("member-card-sharing")).toBeInTheDocument()
  })
})

describe("fallback: no `withheld` (older backend, switch off)", () => {
  it.each([undefined, null])("withheld %p: a PRISM tick still hides a Not asked chip", (w) => {
    const m = { ...parse(u6dRow([], NONE)), withheld: w }
    renderCard(m)
    expect(screen.queryByTestId("member-card-sharing")).not.toBeInTheDocument()
  })
})

describe("PlanStatusBadge", () => {
  it.each([null, undefined, "archived"])("status %p renders nothing and does not throw", (s) => {
    const { container } = render(<PlanStatusBadge status={s as never} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("a known status still renders its label", () => {
    render(<PlanStatusBadge status="at_risk" />)
    expect(screen.getByText(/at risk/i)).toBeInTheDocument()
  })
})
