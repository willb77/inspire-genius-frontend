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

  const totalUsers = users.data?.data?.pagination?.total
  const latestUsers = users.data?.data?.users ?? []

  const coachesRaw = coaches.data?.data
  const coachList: Array<{ status?: string }> = Array.isArray(coachesRaw)
    ? coachesRaw
    : ((coachesRaw as { agents?: Array<{ status?: string }> } | undefined)?.agents ?? [])
  const activeCoaches = coachList.filter((c) => c.status?.toLowerCase() !== "deactivated").length

  const feedbackStats = feedback.data?.data
  const costDash = (cost.data as Record<string, unknown> | undefined)?.data as
    | Record<string, unknown>
    | undefined
  const totalCost = costDash?.total_cost as number | undefined

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
            linkLabel="Users"
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
      </div>
    </SuperAdminLayout>
  )
}
