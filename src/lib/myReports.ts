import type { OrgChartResponse, RosterMember } from "@/types/development"

/**
 * "Who reports to me" — derived from the ORG CHART's edges, never from a new
 * query over `employee_profiles`.
 *
 * This is the whole security argument for the My Reports view, so it is written
 * down rather than left implicit.
 *
 * `GET /v1/growth/org-chart` takes no organisation parameter. The org is
 * resolved server-side from the caller's own signed `sub`
 * (`org_chart.resolve_caller_org`), the node query is filtered
 * `WHERE up.org_id = :org_id AND COALESCE(up.is_active,TRUE) AND up.user_id IS
 * NOT NULL`, and a caller whose org cannot be established gets an EMPTY chart
 * rather than every org. On top of that the server nulls any `manager_id` that
 * does not resolve to a node inside the returned set — so an edge that survives
 * into `nodes` is, by construction, an edge between two people in the caller's
 * own organisation.
 *
 * Reading `employee_profiles.manager_id` directly would have none of that.
 * Measured on staging-b on 2026-09-30: four rows name the roster's one manager,
 * and the org chart draws **zero** of those edges, because all four reports sit
 * in three DIFFERENT organisations. Platform-wide, 46 raw edges become 42, and
 * every one of the 4 lost is cross-org. A "my reports" view built from the raw
 * column would therefore have shown that manager four people from three other
 * companies. Dev has zero cross-org edges, which is why this is invisible there.
 *
 * So the rule is: the set of ids is taken from chart edges, and the roster is
 * only ever used to look up the card for an id that already survived that
 * filter. Narrowing, never widening.
 */

/** Which claim the view is entitled to make. Every branch is a DIFFERENT fact. */
export type MyReportsState =
  /** Still fetching. Says nothing about anyone. */
  | { kind: "loading" }
  /** The chart failed to load. Not an empty team. */
  | { kind: "chart-error" }
  /** The chart loaded; the roster it is matched against did not. */
  | { kind: "roster-error" }
  /** The server could not establish which organisation the caller is in. */
  | { kind: "org-unresolved" }
  /** The chart came back without saying which node is the viewer. */
  | { kind: "viewer-unknown" }
  /** The viewer is named but is not on their own organisation's chart. */
  | { kind: "viewer-absent" }
  /** The viewer is on the chart and no edge inside this org points at them. */
  | { kind: "no-reports" }
  /** Edges exist, but not one of them matched a roster row. */
  | { kind: "reports-off-roster"; count: number }
  /**
   * At least one report resolved to a roster card. `unmatched` counts edges
   * that did not — reported rather than dropped, because a report missing from
   * the list looks exactly like a smaller team.
   */
  | { kind: "ready"; members: RosterMember[]; unmatched: number }

export type MyReportsInput = {
  chart: {
    data: OrgChartResponse | undefined
    isLoading: boolean
    isError: boolean
  }
  roster: {
    data: RosterMember[] | undefined
    isLoading: boolean
    isError: boolean
  }
}

/**
 * The ids of everyone whose chart edge points at `viewerId`.
 *
 * Exported so the org-scoping argument above can be tested on its own: given a
 * node whose `managerId` is the viewer, it is returned; given nodes the server
 * would never have emitted together, there is nothing here that could invent an
 * edge between them.
 *
 * An empty or missing `viewerId` returns nothing. It must NOT fall back to
 * "everyone", which is the direction that turns an unknown viewer into a
 * disclosure.
 */
export function directReportIds(
  nodes: OrgChartResponse["nodes"] | undefined,
  viewerId: string | null | undefined,
): string[] {
  if (!viewerId) return []
  const out: string[] = []
  for (const node of nodes ?? []) {
    // A self-edge is a data fault, not a report. Including it would put the
    // manager's own card in their list of reports.
    if (node.managerId && node.managerId === viewerId && node.id !== viewerId) {
      out.push(node.id)
    }
  }
  return out
}

/**
 * Resolve the two queries into exactly one claim.
 *
 * Errors are considered before loading, and before any statement about people,
 * because "we could not load this" outranks every other branch — reporting a
 * failure as "nobody reports to you" is the dishonest empty state this whole
 * surface keeps having to defend against, and for the cross-org manager
 * measured above the CORRECT answer is also zero, so the two would be
 * indistinguishable on screen.
 */
export function myReportsState(input: MyReportsInput): MyReportsState {
  const { chart, roster } = input

  if (chart.isError) return { kind: "chart-error" }
  if (roster.isError) return { kind: "roster-error" }
  if (chart.isLoading || roster.isLoading) return { kind: "loading" }
  if (!chart.data || !roster.data) return { kind: "loading" }

  // `orgResolved === false` is the server saying it never identified an
  // organisation. Optional in the payload, so `undefined` reads as resolved.
  if (chart.data.orgResolved === false) return { kind: "org-unresolved" }

  const viewerId = chart.data.viewerId
  if (!viewerId) return { kind: "viewer-unknown" }
  if (!chart.data.nodes.some((n) => n.id === viewerId)) return { kind: "viewer-absent" }

  const ids = directReportIds(chart.data.nodes, viewerId)
  if (!ids.length) return { kind: "no-reports" }

  const byId = new Map(roster.data.map((m) => [m.memberId, m]))
  const members: RosterMember[] = []
  for (const id of ids) {
    const row = byId.get(id)
    if (row) members.push(row)
  }
  const unmatched = ids.length - members.length

  if (!members.length) return { kind: "reports-off-roster", count: ids.length }

  // By name, so a short list is scannable. Deliberately NOT by the readiness
  // score the grid uses: that is a ranking, and ranking one's own reports is a
  // claim this view has not been asked to make.
  members.sort((a, b) => a.name.localeCompare(b.name))
  return { kind: "ready", members, unmatched }
}
