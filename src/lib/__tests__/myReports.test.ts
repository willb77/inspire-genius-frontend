import { directReportIds, myReportsState, type MyReportsInput } from "../myReports"
import type { OrgChartNode, OrgChartResponse, RosterMember } from "@/types/development"

/**
 * The derivation behind the My Reports view (TDS-10).
 *
 * What is actually being defended here is a cross-tenant disclosure, so the
 * tests are written against the MECHANISM rather than the output: the only
 * input is the org chart's own nodes, and the only edges that exist are the
 * ones the server chose to emit. `GET /v1/growth/org-chart` filters nodes on
 * `up.org_id` (resolved from the caller's signed sub, not from any parameter)
 * and then nulls every `manager_id` that does not resolve inside that set — so
 * a manager whose reports sit in another organisation arrives here with those
 * edges already gone, and there is nothing in this module that could put them
 * back.
 *
 * Measured on staging-b, 2026-09-30: four `employee_profiles` rows name the
 * roster's one manager; the org chart draws zero of them, because all four sit
 * in three different organisations. Platform-wide 46 raw edges become 42 and
 * all four lost are the cross-org ones. Dev has none, which is why a query over
 * `employee_profiles` would have looked correct in every environment we can
 * click through.
 *
 * Invented people throughout — this repo is public.
 */

function node(over: Partial<OrgChartNode> & { id: string }): OrgChartNode {
  return { name: `Person ${over.id}`, title: null, department: null, managerId: null, ...over }
}

function member(over: Partial<RosterMember> & { memberId: string }): RosterMember {
  return {
    name: `Person ${over.memberId}`,
    coverage: { prism: true, clifton: false, disc: false },
    planStatus: "no_plan",
    ...over,
  }
}

function chart(over: Partial<OrgChartResponse> = {}): OrgChartResponse {
  return { nodes: [], viewerId: null, truncated: false, ...over }
}

function input(over: {
  chart?: Partial<MyReportsInput["chart"]>
  roster?: Partial<MyReportsInput["roster"]>
}): MyReportsInput {
  return {
    chart: { data: chart(), isLoading: false, isError: false, ...over.chart },
    roster: { data: [], isLoading: false, isError: false, ...over.roster },
  }
}

describe("directReportIds — the edges, and only the edges", () => {
  it("returns the people whose chart edge points at the viewer", () => {
    const ids = directReportIds(
      [
        node({ id: "mgr" }),
        node({ id: "a", managerId: "mgr" }),
        node({ id: "b", managerId: "mgr" }),
        node({ id: "c", managerId: "someone-else" }),
      ],
      "mgr",
    )
    expect(ids).toEqual(["a", "b"])
  })

  /**
   * This is the cross-tenant guard, stated as the only fact this module reads.
   *
   * `null` is exactly what the server emits for a manager who sits outside the
   * returned org — it nulls any `manager_id` not present in the node set rather
   * than leaving it dangling. So these four rows are the staging-b manager's
   * four cross-org reports as this code actually receives them, and the answer
   * has to be nothing. There is no second input here that could restore them.
   */
  it("cannot reconstruct an edge the server withheld", () => {
    const withheld = [
      node({ id: "mgr" }),
      node({ id: "a", managerId: null }),
      node({ id: "b", managerId: null }),
      node({ id: "c", managerId: null }),
      node({ id: "d", managerId: null }),
    ]
    expect(directReportIds(withheld, "mgr")).toEqual([])
  })

  it("an unknown viewer yields nobody, never everybody", () => {
    const nodes = [node({ id: "a", managerId: "mgr" }), node({ id: "b", managerId: "mgr" })]
    expect(directReportIds(nodes, null)).toEqual([])
    expect(directReportIds(nodes, undefined)).toEqual([])
    expect(directReportIds(nodes, "")).toEqual([])
  })

  it("a self-edge is a data fault, not a report", () => {
    expect(directReportIds([node({ id: "mgr", managerId: "mgr" })], "mgr")).toEqual([])
  })

  it("no nodes at all is no reports, not a crash", () => {
    expect(directReportIds(undefined, "mgr")).toEqual([])
  })
})

describe("myReportsState — a failure never reads as an empty team", () => {
  it("a failed chart is reported as a failed chart", () => {
    const state = myReportsState(input({ chart: { isError: true } }))
    expect(state.kind).toBe("chart-error")
  })

  it("a failed roster is a different claim from a failed chart", () => {
    const state = myReportsState(input({ roster: { isError: true } }))
    expect(state.kind).toBe("roster-error")
  })

  /**
   * Ordering matters because for the measured manager the correct answer is
   * ALSO zero. If an error fell through to "no-reports", the broken page and
   * the correct page would be the same page.
   */
  it("an error outranks loading and outranks the zero-report answer", () => {
    expect(
      myReportsState(input({ chart: { isError: true }, roster: { isLoading: true } })).kind,
    ).toBe("chart-error")
    expect(
      myReportsState(
        input({
          chart: { data: chart({ nodes: [node({ id: "mgr" })], viewerId: "mgr" }) },
          roster: { isError: true },
        }),
      ).kind,
    ).toBe("roster-error")
  })

  it("either query still in flight says nothing about anyone", () => {
    expect(myReportsState(input({ chart: { isLoading: true } })).kind).toBe("loading")
    expect(myReportsState(input({ roster: { isLoading: true } })).kind).toBe("loading")
    expect(myReportsState(input({ chart: { data: undefined } })).kind).toBe("loading")
    expect(myReportsState(input({ roster: { data: undefined } })).kind).toBe("loading")
  })

  it("an unidentified organisation is not an empty organisation", () => {
    const state = myReportsState(
      input({ chart: { data: chart({ orgResolved: false, viewerId: "mgr" }) } }),
    )
    expect(state.kind).toBe("org-unresolved")
  })

  it("a payload with no viewer cannot answer the question", () => {
    const state = myReportsState(
      input({ chart: { data: chart({ nodes: [node({ id: "a", managerId: "mgr" })] }) } }),
    )
    expect(state.kind).toBe("viewer-unknown")
  })

  it("a viewer who is not on their own chart is distinguished from having no reports", () => {
    const state = myReportsState(
      input({ chart: { data: chart({ nodes: [node({ id: "a" })], viewerId: "mgr" }) } }),
    )
    expect(state.kind).toBe("viewer-absent")
  })
})

describe("myReportsState — the answers about people", () => {
  /** The staging-b shape: on the chart, four reports on file, none in this org. */
  it("zero reports inside the organisation is a first-class answer", () => {
    const state = myReportsState(
      input({
        chart: {
          data: chart({
            nodes: [
              node({ id: "mgr" }),
              node({ id: "a", managerId: null }),
              node({ id: "b", managerId: null }),
            ],
            viewerId: "mgr",
          }),
        },
        roster: { data: [member({ memberId: "a" }), member({ memberId: "b" })] },
      }),
    )
    expect(state.kind).toBe("no-reports")
  })

  it("edges with no roster row are reported as a records gap, not as no reports", () => {
    const state = myReportsState(
      input({
        chart: {
          data: chart({
            nodes: [node({ id: "mgr" }), node({ id: "a", managerId: "mgr" })],
            viewerId: "mgr",
          }),
        },
        roster: { data: [member({ memberId: "someone-else" })] },
      }),
    )
    expect(state).toEqual({ kind: "reports-off-roster", count: 1 })
  })

  it("resolves each edge to its roster card, and counts the ones it could not", () => {
    const state = myReportsState(
      input({
        chart: {
          data: chart({
            nodes: [
              node({ id: "mgr" }),
              node({ id: "a", managerId: "mgr" }),
              node({ id: "b", managerId: "mgr" }),
              node({ id: "c", managerId: "mgr" }),
            ],
            viewerId: "mgr",
          }),
        },
        roster: {
          data: [
            member({ memberId: "b", name: "Rowan Escobar" }),
            member({ memberId: "a", name: "Dana Whitfield" }),
          ],
        },
      }),
    )
    if (state.kind !== "ready") throw new Error(`expected ready, got ${state.kind}`)
    expect(state.members.map((m) => m.name)).toEqual(["Dana Whitfield", "Rowan Escobar"])
    // "c" is on the chart and not on the roster. Counted, never dropped: a
    // report missing from the list looks exactly like a smaller team.
    expect(state.unmatched).toBe(1)
  })

  /**
   * The direction of the join, asserted.
   *
   * The roster is a WIDER set than the organisation — `list_roster` unions the
   * org query with `growth.roster_members` and with anyone holding a dossier,
   * "including people with no `user_profiles` row in this org". So a roster row
   * must never put somebody into this view on its own.
   */
  it("a roster row with no chart edge is not a report", () => {
    const state = myReportsState(
      input({
        chart: {
          data: chart({
            nodes: [node({ id: "mgr" }), node({ id: "a", managerId: "mgr" })],
            viewerId: "mgr",
          }),
        },
        roster: {
          data: [
            member({ memberId: "a", name: "Dana Whitfield" }),
            member({ memberId: "studio-added", name: "Mira Halvorsen" }),
          ],
        },
      }),
    )
    if (state.kind !== "ready") throw new Error(`expected ready, got ${state.kind}`)
    expect(state.members.map((m) => m.name)).toEqual(["Dana Whitfield"])
    expect(state.unmatched).toBe(0)
  })
})
