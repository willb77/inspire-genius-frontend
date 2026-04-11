import { useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Building2,
  Brain,
  DollarSign,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSystem } from "@/hooks/super-admin/dashboard/useDashboardSystem";
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement";
import { useCoachesList } from "@/hooks/super-admin/coach-management/useCoaches";
import { useAuditStats } from "@/hooks/audit/useAudit";
import { useFeedbackStats } from "@/hooks/feedback/useFeedback";
import { useCostDashboard } from "@/hooks/trainer/useTrainer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number | undefined | null, prefix = ""): string {
  if (n == null) return "--";
  return `${prefix}${n.toLocaleString()}`;
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
  );
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
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SuperAdminDashboard() {
  const [dateRange, setDateRange] = useState("30");

  // ── Real data hooks ──────────────────────────────────────────────
  const { data: dashboardData, isLoading: isDashboardLoading } =
    useDashboardSystem();

  const { data: usersData, isLoading: isUsersLoading } = useUserManagement({
    page: 1,
    limit: 5,
  });

  const { data: coachesData, isLoading: isCoachesLoading } = useCoachesList({
    page: 1,
    limit: 100,
  });

  const { data: auditData, isLoading: isAuditLoading } = useAuditStats();
  const { data: feedbackData, isLoading: isFeedbackLoading } = useFeedbackStats();
  const { data: costData, isLoading: isCostLoading } = useCostDashboard();

  // Derived real values
  const orgStats = dashboardData?.data?.organization_statistics;
  const bizStats = dashboardData?.data?.business_statistics;
  const totalUsers = usersData?.data?.pagination?.total;
  const latestUsers = usersData?.data?.users ?? [];
  const feedbackStats = feedbackData?.data;
  const auditStats = auditData?.data;

  // Cost dashboard data
  const costDash = (costData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const totalCost = costDash?.total_cost as number | undefined;
  const costPerUser = costDash?.cost_per_user as number | undefined;
  const totalSessions = costDash?.total_sessions as number | undefined;
  const costBreakdown = (costDash?.breakdown as Array<{ category: string; amount: number; percentage: number }>) ?? [];
  const agentCosts = (costDash?.agent_costs as Array<{ agent: string; sessions: number; cost: number; percentage: number }>) ?? [];

  // Coaches list
  const coachesRaw = coachesData?.data;
  const coaches = Array.isArray(coachesRaw) ? coachesRaw : (coachesRaw as { agents?: Array<{ id: string; name: string; status?: string }> })?.agents ?? [];
  const activeCoaches = coaches.filter((c) => c.status?.toLowerCase() !== "deactivated").length;

  const isKpiLoading = isDashboardLoading || isUsersLoading;

  // Build KPI cards with real data
  const kpiCards = [
    {
      label: "Total Users",
      value: fmt(totalUsers),
      change: fmt(auditStats?.logs_today, ""),
      subLabel: "events today",
      trend: "up" as const,
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active Organizations",
      value: orgStats ? orgStats.total.toLocaleString() : "--",
      change: orgStats ? `${orgStats.active} active` : "--",
      subLabel: "",
      trend: "up" as const,
      icon: Building2,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Active Mentors",
      value: isCoachesLoading ? "--" : activeCoaches.toLocaleString(),
      change: isCoachesLoading ? "--" : `${coaches.length} total`,
      subLabel: "",
      trend: "up" as const,
      icon: GraduationCap,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Feedback Received",
      value: isFeedbackLoading ? "--" : fmt(feedbackStats?.total_count),
      change: isFeedbackLoading ? "--" : `avg ${feedbackStats?.avg_rating?.toFixed(1) ?? "--"} rating`,
      subLabel: "",
      trend: "up" as const,
      icon: Brain,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Platform Cost (MTD)",
      value: isCostLoading ? "--" : totalCost != null ? `$${totalCost.toLocaleString()}` : "--",
      change: isCostLoading ? "--" : costPerUser != null ? `$${costPerUser.toFixed(2)}/user` : "--",
      subLabel: "",
      trend: "up" as const,
      icon: DollarSign,
      color: "text-amber-600 bg-amber-50",
    },
  ];

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

        {/* ── Welcome Banner ─────────────────────────────────────────── */}
        <div
          className="rounded-xl p-6 md:p-8 text-white"
          style={{
            background: "linear-gradient(135deg, #3B5BFF 0%, #2DD4BF 100%)",
          }}
        >
          <h2 className="text-xl md:text-2xl font-bold mb-1">
            Inspire Genius Platform Overview
          </h2>
          <p className="text-white/80 text-sm md:text-base mb-5 max-w-2xl">
            Monitor platform performance, user engagement, and organizational
            health across all companies.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {fmt(totalUsers)} Users
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" /> {orgStats ? orgStats.total : "--"} Organizations
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> {isCoachesLoading ? "--" : activeCoaches} Mentors
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" /> {isCostLoading ? "--" : totalCost != null ? `$${totalCost.toLocaleString()}` : "--"} MTD
            </span>
          </div>
        </div>

        {/* ── KPI Stat Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {isKpiLoading
            ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
            : kpiCards.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <Card key={kpi.label} className="shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-lg",
                            kpi.color
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="flex items-center text-xs font-medium text-muted-foreground">
                          {kpi.change}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {kpi.label}
                      </p>
                      <p className="text-2xl font-bold tracking-tight">
                        {kpi.value}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ──────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Organization & Business Stats */}
              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Platform Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isDashboardLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg border-l-4 border-l-blue-500 bg-muted/40 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Total Users</span>
                        <p className="text-xl font-bold">{fmt(totalUsers)}</p>
                      </div>
                      <div className="rounded-lg border-l-4 border-l-indigo-500 bg-muted/40 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Organizations</span>
                        <p className="text-xl font-bold">{orgStats ? orgStats.total : "--"}</p>
                      </div>
                      <div className="rounded-lg border-l-4 border-l-emerald-500 bg-muted/40 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Active Orgs</span>
                        <p className="text-xl font-bold text-emerald-600">{orgStats ? orgStats.active : "--"}</p>
                      </div>
                      <div className="rounded-lg border-l-4 border-l-violet-500 bg-muted/40 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Businesses</span>
                        <p className="text-xl font-bold">{bizStats ? bizStats.total : "--"}</p>
                      </div>
                      <div className="rounded-lg border-l-4 border-l-amber-500 bg-muted/40 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Active Mentors</span>
                        <p className="text-xl font-bold">{isCoachesLoading ? "--" : activeCoaches}</p>
                      </div>
                      <div className="rounded-lg border-l-4 border-l-teal-500 bg-muted/40 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Audit Events</span>
                        <p className="text-xl font-bold">{isAuditLoading ? "--" : fmt(auditStats?.total_logs)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Platform Health */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold px-1">Platform Health</h3>
                <Card className="shadow-sm">
                  <CardContent className="p-5 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Feedback Score</p>
                    <p className="text-4xl font-bold tracking-tight text-emerald-600">
                      {isFeedbackLoading ? "--" : feedbackStats?.avg_rating?.toFixed(1) ?? "--"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isFeedbackLoading ? "" : `from ${fmt(feedbackStats?.total_count)} reviews`}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-5 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Events Today</p>
                    <p className="text-4xl font-bold tracking-tight text-blue-600">
                      {isAuditLoading ? "--" : fmt(auditStats?.logs_today)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-5 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Sessions</p>
                    <p className="text-4xl font-bold tracking-tight text-violet-600">
                      {isCostLoading ? "--" : fmt(totalSessions)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Mentor List */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Active Mentors</CardTitle>
              </CardHeader>
              <CardContent>
                {isCoachesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : coaches.length === 0 ? (
                  <EmptyState message="No mentors configured yet." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coaches.slice(0, 8).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-muted-foreground">{(c as Record<string, string>).category_name ?? "--"}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={cn(
                                c.status?.toLowerCase() === "deactivated"
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-emerald-100 text-emerald-700"
                              )}
                            >
                              {c.status?.toLowerCase() === "deactivated" ? "Inactive" : "Active"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Organizations Tab ──────────────────────────────────────── */}
          <TabsContent value="organizations" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Organization Statistics</CardTitle>
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

            {/* Latest Users */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Latest Users</CardTitle>
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
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRowSkeleton key={i} cols={5} />
                        ))
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
          </TabsContent>

          {/* ── Cost Analysis Tab ─────────────────────────────────────── */}
          <TabsContent value="cost" className="space-y-6">
            {/* Cost KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Total Cost (MTD)", value: totalCost != null ? `$${totalCost.toLocaleString()}` : "--", trend: "up" as const },
                { label: "Cost per User", value: costPerUser != null ? `$${costPerUser.toFixed(2)}` : "--", trend: "down" as const },
                { label: "Total Sessions", value: fmt(totalSessions), trend: "up" as const },
                { label: "Active Users", value: fmt(totalUsers), trend: "up" as const },
                { label: "Active Mentors", value: isCoachesLoading ? "--" : activeCoaches.toLocaleString(), trend: "up" as const },
              ].map((kpi) => (
                <Card key={kpi.label} className="shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold tracking-tight">
                      {isCostLoading && kpi.label.includes("Cost") || isCostLoading && kpi.label.includes("Sessions") ? (
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
  );
}
