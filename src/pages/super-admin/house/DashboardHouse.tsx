import { Link } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { ViewAsSwitcher } from "@/components/super-admin/house/ViewAsSwitcher"
import UsedCoachesChart from "@/components/super-admin/dashboard/UsedCoachesChart"
import { PlatformAgentsTable, type PlatformAgentRow } from "@/components/super-admin/dashboard/PlatformAgentsTable"
import {
  formatCostPerSession,
  formatCostPerUser,
  readCostFigures,
} from "@/components/super-admin/dashboard/costFigures"
import { useDashboardSystem } from "@/hooks/super-admin/dashboard/useDashboardSystem"
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement"
import { useCoachesList } from "@/hooks/super-admin/coach-management/useCoaches"
import { useFeedbackStats } from "@/hooks/feedback/useFeedback"
import { useCostDashboard } from "@/hooks/trainer/useTrainer"
import { ROUTES } from "@/constants/routes"
import { ADMIN_HOME_LABEL } from "@/constants/house/superAdminNav"
import { formatDate } from "@/lib/house/formatDate"
import { NO_VALUE, tileState, type TileState } from "./dashboardTiles"

type TileProps = {
  label: string
  state: TileState
  linkTo?: string
  linkLabel?: string
}

/**
 * One figure. Loading shows a grey outline; a failed load says so; a missing
 * figure shows a dash and why — so a broken source can't pass for a real zero.
 */
function Tile({ label, state, linkTo, linkLabel }: TileProps) {
  return (
    <Card className="shadow-sm" data-testid={`tile-${label}`}>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        {state.kind === "loading" ? (
          <Skeleton className="mt-2 h-7 w-20 bg-muted" />
        ) : (
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {state.kind === "value" ? state.value : NO_VALUE}
          </p>
        )}
        {state.kind === "error" && (
          <p className="mt-1 text-xs text-destructive">We couldn't load this.</p>
        )}
        {(state.kind === "value" || state.kind === "unavailable") && state.note && (
          <p className="mt-1 text-xs text-muted-foreground">{state.note}</p>
        )}
        {linkTo && linkLabel && (
          <Link to={linkTo} className="mt-2 inline-block text-xs text-primary hover:underline">
            {linkLabel} →
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

function personName(u: { full_name?: string | null; first_name?: string | null; last_name?: string | null }): string {
  return u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" ") || NO_VALUE
}

/**
 * House-style admin home (area switch `admin`). Uses the same data hooks as
 * the classic dashboard and adds no server call. The classic "Platform Health"
 * cards printed fixed figures nothing measured; here the card says plainly
 * that health monitoring is not connected.
 */
export default function SuperAdminDashboardHouse() {
  const users = useUserManagement({ page: 1, limit: 5 })
  const coaches = useCoachesList({ page: 1, limit: 100 })
  const feedback = useFeedbackStats()
  const cost = useCostDashboard()
  const system = useDashboardSystem()

  const totalUsers = users.data?.data?.pagination?.total
  const latestUsers = users.data?.data?.users ?? []

  const coachesRaw = coaches.data?.data
  const coachList: PlatformAgentRow[] = Array.isArray(coachesRaw)
    ? coachesRaw
    : ((coachesRaw as { agents?: PlatformAgentRow[] } | undefined)?.agents ?? [])
  const activeCoaches = coachList.filter((c) => c.status?.toLowerCase() !== "deactivated").length

  const feedbackStats = feedback.data?.data
  const costFigures = readCostFigures(cost.data)
  const { totalCost, totalSessions } = costFigures

  const orgStats = system.data?.data?.organization_statistics
  const bizStats = system.data?.data?.business_statistics

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={ADMIN_HOME_LABEL}
          description="What needs your attention across the platform today."
          action={<ViewAsSwitcher />}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Tile
            label="People"
            state={tileState(users, totalUsers != null ? totalUsers.toLocaleString() : null)}
            linkTo={ROUTES.SUPER_ADMIN.USERS}
            linkLabel="People"
          />
          <Tile
            label="Active coaches"
            state={tileState(
              coaches,
              coaches.data ? activeCoaches.toLocaleString() : null,
              coaches.data ? `${coachList.length} in total` : undefined,
            )}
            linkTo={ROUTES.SUPER_ADMIN.MENTOR_MANAGEMENT}
            linkLabel="Coach setup"
          />
          <Tile
            label="Coach feedback"
            state={tileState(
              feedback,
              feedbackStats?.total_count != null ? feedbackStats.total_count.toLocaleString() : null,
              feedbackStats?.avg_rating != null ? `Average rating ${feedbackStats.avg_rating.toFixed(1)}` : undefined,
            )}
          />
          <Tile
            label="AI cost this month"
            state={tileState(cost, totalCost != null ? `$${totalCost.toLocaleString()}` : null)}
          />
          <Tile
            label="Platform health"
            state={{ kind: "unavailable", note: "Health monitoring isn't set up yet." }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Tile label="Cost per person" state={tileState(cost, formatCostPerUser(costFigures))} />
          <Tile
            label="Total sessions"
            state={tileState(cost, totalSessions != null ? totalSessions.toLocaleString() : null)}
          />
          <Tile label="Cost per session" state={tileState(cost, formatCostPerSession(costFigures))} />
        </div>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">New people</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.SUPER_ADMIN.USERS}>See all →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {users.isLoading ? (
              <PageState kind="loading" rows={5} />
            ) : users.isError ? (
              <PageState
                kind="error"
                message="We couldn't load new people."
                onRetry={() => void users.refetch()}
              />
            ) : latestUsers.length === 0 ? (
              <PageState kind="empty" title="No people yet" message="New sign-ups will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestUsers.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <span className="font-medium text-foreground">{personName(u)}</span>
                        <span className="block text-xs text-muted-foreground">{u.email}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.role}</TableCell>
                      <TableCell className="text-muted-foreground">{u.is_active ? "Active" : "Inactive"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm" data-testid="panel-organizations">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Organizations</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.SUPER_ADMIN.ORGANIZATIONS}>See all →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {system.isLoading ? (
              <PageState kind="loading" rows={2} />
            ) : system.isError ? (
              <PageState
                kind="error"
                message="We couldn't load organization counts."
                onRetry={() => void system.refetch()}
              />
            ) : !orgStats ? (
              <PageState kind="unavailable" message="Organization counts aren't available yet." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Tile label="Organizations" state={{ kind: "value", value: orgStats.total.toLocaleString() }} />
                <Tile label="Active organizations" state={{ kind: "value", value: orgStats.active.toLocaleString() }} />
                <Tile label="Inactive organizations" state={{ kind: "value", value: orgStats.inactive.toLocaleString() }} />
              </div>
            )}
            {bizStats && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Business units</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Tile label="Business units" state={{ kind: "value", value: bizStats.total.toLocaleString() }} />
                  <Tile label="Active units" state={{ kind: "value", value: bizStats.active.toLocaleString() }} />
                  <Tile label="Corporate" state={tileState(system, bizStats.by_type?.corporate?.toLocaleString() ?? null)} />
                  <Tile label="Education" state={tileState(system, bizStats.by_type?.education?.toLocaleString() ?? null)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm" data-testid="panel-agents">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">All agents</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.SUPER_ADMIN.MENTOR_MANAGEMENT}>Coach setup →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div data-testid="coach-usage-chart">
              <UsedCoachesChart />
              <p className="px-6 text-xs text-muted-foreground">
                Sample figures. Coach usage isn't measured yet.
              </p>
            </div>
            <PlatformAgentsTable coaches={coachList} />
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  )
}
