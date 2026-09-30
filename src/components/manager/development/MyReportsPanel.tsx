import { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { MY_REPORTS_COPY } from "@/constants/development"
import { myReportsState } from "@/lib/myReports"
import { useOrgChart } from "@/hooks/manager/development/useOrgChart"
import { useTeamDevelopmentRoster } from "@/hooks/manager/development/useTeamDevelopmentRoster"
import { MemberCard } from "./MemberCard"
import { useDevSkin } from "./skin"

/**
 * The people who report to the signed-in manager — and nobody else.
 *
 * The set of ids comes from the ORG CHART's surviving edges, not from a second
 * query over `employee_profiles`. `GET /v1/growth/org-chart` takes no org
 * parameter, resolves the organisation from the caller's own signed `sub`,
 * filters the node query on `up.org_id`, and nulls any `manager_id` that does
 * not resolve inside the returned set — so this view inherits that org
 * predicate rather than reimplementing it. The reasoning, and the staging-b
 * measurement that made it necessary (four of one manager's reports sit in
 * three other organisations, and the chart draws none of those edges), is in
 * `@/lib/myReports`.
 *
 * The roster is used only to LOOK UP the card for an id that already survived
 * that filter. It is a wider set than the organisation — `list_roster` unions
 * in Studio-added members and anyone with a dossier — so using it as the source
 * of ids, and the chart as the filter, would be the wrong way round.
 *
 * Every non-ready branch below is a different sentence, because for a manager
 * whose whole reporting line is cross-org the correct answer here is zero, and
 * a plain "no reports" would be indistinguishable from a page that broke.
 */
export function MyReportsPanel({
  onInvite,
}: {
  onInvite?: (memberId: string, framework: "prism" | "clifton" | "disc") => void
}) {
  const sk = useDevSkin()
  const chart = useOrgChart()
  const roster = useTeamDevelopmentRoster()

  const state = useMemo(
    () =>
      myReportsState({
        chart: { data: chart.data, isLoading: chart.isLoading, isError: chart.isError },
        roster: { data: roster.data, isLoading: roster.isLoading, isError: roster.isError },
      }),
    [chart.data, chart.isLoading, chart.isError, roster.data, roster.isLoading, roster.isError],
  )

  if (state.kind === "loading") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-44 w-full", sk.radius)} />
        ))}
      </div>
    )
  }

  if (state.kind !== "ready") {
    const message =
      state.kind === "chart-error"
        ? MY_REPORTS_COPY.chartError
        : state.kind === "roster-error"
          ? MY_REPORTS_COPY.rosterError
          : state.kind === "org-unresolved"
            ? MY_REPORTS_COPY.orgUnresolved
            : state.kind === "viewer-unknown"
              ? MY_REPORTS_COPY.viewerUnknown
              : state.kind === "viewer-absent"
                ? MY_REPORTS_COPY.viewerAbsent
                : state.kind === "reports-off-roster"
                  ? MY_REPORTS_COPY.offRoster(state.count)
                  : MY_REPORTS_COPY.none

    // `role="status"` rather than a bare paragraph: this replaces a grid of
    // cards, so a screen reader that was reading the list needs to be told the
    // region now carries an explanation instead.
    return (
      <div
        role="status"
        className={cn(
          "border border-dashed px-6 py-16 text-center text-sm",
          sk.radius,
          sk.border200,
          sk.text500,
        )}
      >
        <p className="mx-auto max-w-xl">{message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {state.unmatched > 0 && (
        <p className={cn("text-xs", sk.text500)}>
          {MY_REPORTS_COPY.unmatchedNote(state.unmatched)}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {state.members.map((m) => (
          <MemberCard key={m.memberId} member={m} onInvite={onInvite} />
        ))}
      </div>
    </div>
  )
}

export default MyReportsPanel
