import { useState } from "react"
import { Link } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Building2,
  Brain,
  DollarSign,
  GraduationCap,
  Activity,
  Wifi,
  AlertTriangle,
  Clock,
  UserPlus,
  ExternalLink,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useDashboardSystem } from "@/hooks/super-admin/dashboard/useDashboardSystem"
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement"
import { useCoachesList } from "@/hooks/super-admin/coach-management/useCoaches"
import { useAuditStats } from "@/hooks/audit/useAudit"
import { useFeedbackStats } from "@/hooks/feedback/useFeedback"
import { useCostDashboard } from "@/hooks/trainer/useTrainer"
import { ROUTES } from "@/constants/routes"
import { AGENT_VOICE_CONFIG, getDomainColor } from "@/constants/agentVoiceConfig"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number | undefined | null, prefix = ""): string {
  if (n == null) return "--"
  return `${prefix}${n.toLocaleString()}`
}

function KpiSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-7 w-24" />
      </CardContent>
    </Card>
  )
}

function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Clickable KPI card
// ---------------------------------------------------------------------------

type KpiCardProps = {
  label: string
  value: string
  change: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  linkTo?: string
}

function KpiCard({ label, value, change, icon: Icon, color, linkTo }: KpiCardProps) {
  const content = (
    <Card className={cn("shadow-sm transition-colors", linkTo && "hover:border-blue-300 cursor-pointer group")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("flex items-center justify-center h-10 w-10 rounded-lg", color)}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="flex items-center text-xs font-medium text-muted-foreground">
            {change}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          {linkTo && (
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>
  }
  return content
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SuperAdminDashboard() {
  const [dateRange, setDateRange] = useState("30")

  // ── Real data hooks ──────────────────────────────────────────────
  const { data: dashboardData, isLoading: isDashboardLoading } =
    useDashboardSystem()

  const { data: usersData, isLoading: isUsersLoading } = useUserManagement({
    page: 1,
    limit: 5,
  })

  const { data: coachesData, isLoading: isCoachesLoading } = useCoachesList({
    page: 1,
    limit: 100,
  })

  const { data: auditData } = useAuditStats()
  const { data: feedbackData, isLoading: isFeedbackLoading } = useFeedbackStats()
  const { data: costData, isLoading: isCostLoading } = useCostDashboard()

  // Derived real values
  const orgStats = dashboardData?.data?.organization_statistics
  const bizStats = dashboardData?.data?.business_statistics
  const totalUsers = usersData?.data?.pagination?.total
  const latestUsers = usersData?.data?.users ?? []
  const feedbackStats = feedbackData?.data
  const auditStats = auditData?.data

  // Cost dashboard data
  const costDash = (costData as Record<string, unknown>)?.data as Record<string, unknown> | undefined
  const totalCost = costDash?.total_cost as number | undefined
  const costPerUser = costDash?.cost_per_user as number | undefined
  const totalSessions = costDash?.total_sessions as number | undefined
  const costBreakdown = (costDash?.breakdown as Array<{ category: string; amount: number; percentage: number }>) ?? []
  const agentCosts = (costDash?.agent_costs as Array<{ agent: string; sessions: number; cost: number; percentage: number }>) ?? []

  // Coaches list
  const coachesRaw = coachesData?.data
  const coaches = Array.isArray(coachesRaw) ? coachesRaw : (coachesRaw as { agents?: Array<{ id: string; name: string; status?: string }> })?.agents ?? []
  const activeCoaches = coaches.filter((c) => c.status?.toLowerCase() !== "deactivated").length

  const isKpiLoading = isDashboardLoading || isUsersLoading

  // Build KPI cards with links
  const kpiCards: KpiCardProps[] = [
    {
      label: "Total Users",
      value: fmt(totalUsers),
      change: fmt(auditStats?.logs_today, "") + " events today",
      icon: Users,
      color: "text-blue-600 bg-blue-50",
      linkTo: ROUTES.SUPER_ADMIN.USERS,
    },
    {
      label: "Active Organizations",
      value: orgStats ? orgStats.total.toLocaleString() : "--",
      change: orgStats ? `${orgStats.active} active` : "--",
      icon: Building2,
      color: "text-indigo-600 bg-indigo-50",
      linkTo: ROUTES.SUPER_ADMIN.ORGANIZATIONS,
    },
    {
      label: "Active Mentors",
      value: isCoachesLoading ? "--" : activeCoaches.toLocaleString(),
      change: isCoachesLoading ? "--" : `${coaches.length} total`,
      icon: GraduationCap,
      color: "text-emerald-600 bg-emerald-50",
      linkTo: ROUTES.SUPER_ADMIN.MENTOR_MANAGEMENT,
    },
    {
      label: "Feedback Received",
      value: isFeedbackLoading ? "--" : fmt(feedbackStats?.total_count),
      change: isFeedbackLoading ? "--" : `avg ${feedbackStats?.avg_rating?.toFixed(1) ?? "--"} rating`,
      icon: Brain,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Platform Cost (MTD)",
      value: isCostLoading ? "--" : totalCost != null ? `$${totalCost.toLocaleString()}` : "--",
      change: isCostLoading ? "--" : costPerUser != null ? `$${costPerUser.toFixed(2)}/user` : "--",
      icon: DollarSign,
      color: "text-amber-600 bg-amber-50",
    },
  ]

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Platform Dashboard
          </h1>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── KPI Stat Cards (Row 1) ── clickable tiles ─────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {isKpiLoading
            ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
            : kpiCards.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </div>

        {/* ── Cost Summary (Row 2) ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Cost per User", value: costPerUser != null ? `$${costPerUser.toFixed(2)}` : "--" },
            { label: "Total Sessions", value: fmt(totalSessions) },
            { label: "Cost per Session", value: totalCost != null && totalSessions ? `$${(totalCost / totalSessions).toFixed(3)}` : "--" },
            { label: "Feedback Score", value: isFeedbackLoading ? "--" : feedbackStats?.avg_rating?.toFixed(1) ?? "--" },
          ].map((item) => (
            <Card key={item.label} className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold tracking-tight mt-1">
                  {isCostLoading && (item.label.includes("Cost") || item.label.includes("Session"))
                    ? <Skeleton className="h-6 w-16 inline-block" />
                    : item.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Platform Health (Row 3) ──────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Platform Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-50">
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agent Engine</p>
                  <p className="text-sm font-semibold text-emerald-600">Healthy</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50">
                  <Wifi className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">API Response Time</p>
                  <p className="text-sm font-semibold">~120ms</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Error Rate</p>
                  <p className="text-sm font-semibold">0.12%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-green-50">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="text-sm font-semibold">99.97%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── New Users Section ──────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">New User Registrations</CardTitle>
              </div>
              <Link to={ROUTES.SUPER_ADMIN.USERS}>
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View All <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isUsersLoading
                  ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                  : latestUsers.length > 0
                    ? latestUsers.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">
                            {u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" ") || "--"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn(u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>
                              {u.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </TableCell>
                        </TableRow>
                      ))
                    : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">No users found.</TableCell>
                        </TableRow>
                      )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="agents">All Agents (18)</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
          </TabsList>

          {/* ── Agents Tab — All 18 agents ────────────────────────────── */}
          <TabsContent value="agents" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">All Platform Agents</CardTitle>
                  <Link to={ROUTES.SUPER_ADMIN.MENTOR_MANAGEMENT}>
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      Manage Agents <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Voice</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AGENT_VOICE_CONFIG.map((agent) => {
                      const backendAgent = coaches.find((c) => c.id === agent.id)
                      const isActive = backendAgent
                        ? backendAgent.status?.toLowerCase() !== "deactivated"
                        : true
                      return (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">{agent.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("text-xs", getDomainColor(agent.domain))}>
                              {agent.domain}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{agent.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{agent.modelTier}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{agent.pollyVoice}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={cn(
                                isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600",
                              )}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link to={`${ROUTES.SUPER_ADMIN.MENTOR_MANAGEMENT}?agent=${agent.id}&tab=settings`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Organizations Tab ──────────────────────────────────────── */}
          <TabsContent value="organizations" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Organization Statistics</CardTitle>
                  <Link to={ROUTES.SUPER_ADMIN.ORGANIZATIONS}>
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      View All <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isDashboardLoading ? (
                  <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                  </div>
                ) : orgStats ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="shadow-sm">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{orgStats.total}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="text-2xl font-bold text-emerald-600">{orgStats.active}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Inactive</p>
                        <p className="text-2xl font-bold text-red-500">{orgStats.inactive}</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <EmptyState message="No organization data available." />
                )}
              </CardContent>
            </Card>

            {/* Business Stats */}
            {bizStats && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Business Units</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{bizStats.total}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-xl font-bold text-emerald-600">{bizStats.active}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Corporate</p>
                      <p className="text-xl font-bold">{bizStats.by_type?.corporate ?? "--"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Education</p>
                      <p className="text-xl font-bold">{bizStats.by_type?.education ?? "--"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Cost Analysis Tab ─────────────────────────────────────── */}
          <TabsContent value="cost" className="space-y-6">
            {/* Cost KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Total Cost (MTD)", value: totalCost != null ? `$${totalCost.toLocaleString()}` : "--" },
                { label: "Cost per User", value: costPerUser != null ? `$${costPerUser.toFixed(2)}` : "--" },
                { label: "Total Sessions", value: fmt(totalSessions) },
                { label: "Active Users", value: fmt(totalUsers) },
                { label: "Active Mentors", value: isCoachesLoading ? "--" : activeCoaches.toLocaleString() },
              ].map((kpi) => (
                <Card key={kpi.label} className="shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold tracking-tight">
                      {isCostLoading && (kpi.label.includes("Cost") || kpi.label.includes("Sessions")) ? (
                        <Skeleton className="h-7 w-24" />
                      ) : kpi.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cost Distribution + Top Users by Cost */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost Breakdown */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Cost Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {isCostLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : costBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {costBreakdown.map((item) => (
                        <div key={item.category} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{item.category}</span>
                            <span className="text-muted-foreground">
                              ${item.amount.toLocaleString()} ({item.percentage}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="Cost data will appear once the cost tracking service is active." />
                  )}
                </CardContent>
              </Card>

              {/* Agent Costs */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Cost by Mentor</CardTitle>
                </CardHeader>
                <CardContent>
                  {isCostLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : agentCosts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mentor</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="w-[120px]">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentCosts.map((a) => (
                          <TableRow key={a.agent}>
                            <TableCell className="font-medium">{a.agent}</TableCell>
                            <TableCell className="text-right">{a.sessions.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">${a.cost.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-teal-400"
                                    style={{ width: `${a.percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-8 text-right">{a.percentage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState message="Mentor cost data will appear once the cost tracking service is active." />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}
