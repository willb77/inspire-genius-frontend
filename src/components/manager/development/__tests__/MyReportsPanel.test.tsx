/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"

import type { OrgChartResponse, RosterMember } from "@/types/development"

/**
 * What the My Reports view SAYS in each state (TDS-10).
 *
 * The derivation itself is covered by `src/lib/__tests__/myReports.test.ts`.
 * This file asserts the sentence a manager actually reads, because the whole
 * package turns on one thing: for the manager measured on staging-b — four
 * reports on file, all four in other organisations — the correct answer is zero
 * reports, so "no reports" on its own is indistinguishable from a page that
 * broke. Every branch has to name its own cause.
 *
 * Invented people — this repo is public.
 */

let chartState: {
  data: OrgChartResponse | undefined
  isLoading: boolean
  isError: boolean
} = { data: undefined, isLoading: true, isError: false }

let rosterState: {
  data: RosterMember[] | undefined
  isLoading: boolean
  isError: boolean
} = { data: undefined, isLoading: true, isError: false }

jest.mock("@/hooks/manager/development/useOrgChart", () => ({
  useOrgChart: () => chartState,
}))
jest.mock("@/hooks/manager/development/useTeamDevelopmentRoster", () => ({
  useTeamDevelopmentRoster: () => rosterState,
}))

import { MyReportsPanel } from "../MyReportsPanel"
import { MY_REPORTS_COPY } from "@/constants/development"

function member(over: Partial<RosterMember> & { memberId: string }): RosterMember {
  return {
    name: `Person ${over.memberId}`,
    coverage: { prism: true, clifton: false, disc: false },
    planStatus: "no_plan",
    ...over,
  }
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <MyReportsPanel />
    </MemoryRouter>,
  )
}

/** Loaded, viewer known, two edges out of them. */
function chartWithTwoReports(): OrgChartResponse {
  return {
    nodes: [
      { id: "mgr", name: "Priya Anand", managerId: null },
      { id: "a", name: "Dana Whitfield", managerId: "mgr" },
      { id: "b", name: "Rowan Escobar", managerId: "mgr" },
    ],
    viewerId: "mgr",
    truncated: false,
  }
}

beforeEach(() => {
  chartState = { data: undefined, isLoading: true, isError: false }
  rosterState = { data: undefined, isLoading: true, isError: false }
})

describe("MyReportsPanel — while it does not yet know", () => {
  it("claims nothing about anyone", () => {
    renderPanel()
    expect(screen.queryByText(MY_REPORTS_COPY.none)).not.toBeInTheDocument()
    expect(screen.queryByText(MY_REPORTS_COPY.chartError)).not.toBeInTheDocument()
    expect(screen.queryAllByRole("button", { name: /Open development workspace/i })).toHaveLength(0)
  })
})

describe("MyReportsPanel — a failure says it failed", () => {
  it("a failed chart is not an empty team", () => {
    chartState = { data: undefined, isLoading: false, isError: true }
    rosterState = { data: [], isLoading: false, isError: false }
    renderPanel()
    expect(screen.getByText(MY_REPORTS_COPY.chartError)).toBeInTheDocument()
    expect(screen.queryByText(MY_REPORTS_COPY.none)).not.toBeInTheDocument()
  })

  it("a failed roster is reported as its own failure, not as the chart's", () => {
    chartState = { data: chartWithTwoReports(), isLoading: false, isError: false }
    rosterState = { data: undefined, isLoading: false, isError: true }
    renderPanel()
    expect(screen.getByText(MY_REPORTS_COPY.rosterError)).toBeInTheDocument()
    expect(screen.queryByText(MY_REPORTS_COPY.chartError)).not.toBeInTheDocument()
    expect(screen.queryByText(MY_REPORTS_COPY.none)).not.toBeInTheDocument()
  })
})

describe("MyReportsPanel — the three ways the question cannot be answered", () => {
  it("an unidentified organisation says so, and does not claim an empty team", () => {
    chartState = {
      data: { nodes: [], viewerId: null, truncated: false, orgResolved: false },
      isLoading: false,
      isError: false,
    }
    rosterState = { data: [], isLoading: false, isError: false }
    renderPanel()
    expect(screen.getByText(MY_REPORTS_COPY.orgUnresolved)).toBeInTheDocument()
    expect(screen.queryByText(MY_REPORTS_COPY.none)).not.toBeInTheDocument()
  })

  it("a chart that did not say who the viewer is says so", () => {
    chartState = {
      data: { ...chartWithTwoReports(), viewerId: null },
      isLoading: false,
      isError: false,
    }
    rosterState = { data: [member({ memberId: "a" })], isLoading: false, isError: false }
    renderPanel()
    expect(screen.getByText(MY_REPORTS_COPY.viewerUnknown)).toBeInTheDocument()
    // And critically: it does not fall back to listing the whole roster.
    expect(screen.queryAllByRole("button", { name: /Open development workspace/i })).toHaveLength(0)
  })

  it("a viewer missing from their own chart is a record gap, not an empty team", () => {
    chartState = {
      data: {
        nodes: [{ id: "a", name: "Dana Whitfield", managerId: null }],
        viewerId: "mgr",
        truncated: false,
      },
      isLoading: false,
      isError: false,
    }
    rosterState = { data: [member({ memberId: "a" })], isLoading: false, isError: false }
    renderPanel()
    expect(screen.getByText(MY_REPORTS_COPY.viewerAbsent)).toBeInTheDocument()
    expect(screen.queryByText(MY_REPORTS_COPY.none)).not.toBeInTheDocument()
  })
})

describe("MyReportsPanel — zero reports, said honestly", () => {
  /**
   * The staging-b case, reproduced in the shape this code receives it: the
   * manager is on the chart, their four reports are on the ROSTER, and the
   * server nulled every one of those edges because all four sit in other
   * organisations. Zero is the right answer and the page has to explain it.
   */
  it("says WHY there are none, and names the organisation boundary", () => {
    chartState = {
      data: {
        nodes: [
          { id: "mgr", name: "Priya Anand", managerId: null },
          { id: "x", name: "Ines Oyelaran", managerId: null },
        ],
        viewerId: "mgr",
        truncated: false,
      },
      isLoading: false,
      isError: false,
    }
    rosterState = {
      data: [member({ memberId: "x" }), member({ memberId: "cross-org-1" })],
      isLoading: false,
      isError: false,
    }
    renderPanel()
    const said = screen.getByText(MY_REPORTS_COPY.none)
    expect(said).toBeInTheDocument()
    expect(said.textContent).toMatch(/different organisation/i)
    expect(said.textContent).toMatch(/Org Chart/)
    // Nobody is listed, and nobody is invented from the roster either.
    expect(screen.queryAllByRole("button", { name: /Open development workspace/i })).toHaveLength(0)
  })

  it("edges with no roster row read as a records gap, with the count", () => {
    chartState = { data: chartWithTwoReports(), isLoading: false, isError: false }
    rosterState = { data: [member({ memberId: "nobody" })], isLoading: false, isError: false }
    renderPanel()
    expect(screen.getByText(MY_REPORTS_COPY.offRoster(2))).toBeInTheDocument()
    expect(screen.getByText(/2 people report to you/)).toBeInTheDocument()
    expect(screen.queryByText(MY_REPORTS_COPY.none)).not.toBeInTheDocument()
  })
})

describe("MyReportsPanel — when it can answer", () => {
  it("lists a card per resolved report, and only those", () => {
    chartState = { data: chartWithTwoReports(), isLoading: false, isError: false }
    rosterState = {
      data: [
        member({ memberId: "b", name: "Rowan Escobar" }),
        member({ memberId: "a", name: "Dana Whitfield" }),
        // On the roster, NOT on the chart under this manager. `list_roster`
        // unions in Studio-added members, so this row is ordinary — and it
        // must not appear here.
        member({ memberId: "studio-added", name: "Mira Halvorsen" }),
      ],
      isLoading: false,
      isError: false,
    }
    renderPanel()
    const cards = screen.getAllByRole("button", { name: /Open development workspace for/i })
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual([
      "Open development workspace for Dana Whitfield",
      "Open development workspace for Rowan Escobar",
    ])
    expect(screen.queryByText("Mira Halvorsen")).not.toBeInTheDocument()
    expect(screen.queryByText(MY_REPORTS_COPY.none)).not.toBeInTheDocument()
  })

  it("reports the edges it could not resolve rather than dropping them", () => {
    chartState = {
      data: {
        nodes: [
          ...chartWithTwoReports().nodes,
          { id: "c", name: "Ines Oyelaran", managerId: "mgr" },
        ],
        viewerId: "mgr",
        truncated: false,
      },
      isLoading: false,
      isError: false,
    }
    rosterState = {
      data: [member({ memberId: "a", name: "Dana Whitfield" })],
      isLoading: false,
      isError: false,
    }
    renderPanel()
    expect(screen.getByText(MY_REPORTS_COPY.unmatchedNote(2))).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Open development workspace for Dana Whitfield" }),
    ).toBeInTheDocument()
  })

  it("says nothing about unresolved edges when there are none", () => {
    chartState = { data: chartWithTwoReports(), isLoading: false, isError: false }
    rosterState = {
      data: [
        member({ memberId: "a", name: "Dana Whitfield" }),
        member({ memberId: "b", name: "Rowan Escobar" }),
      ],
      isLoading: false,
      isError: false,
    }
    renderPanel()
    expect(screen.queryByText(/further person reports|further people report/)).not.toBeInTheDocument()
  })
})
