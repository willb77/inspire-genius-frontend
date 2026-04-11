import { useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  TrendingUp,
  TrendingDown,
  Brain,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSystem } from "@/hooks/super-admin/dashboard/useDashboardSystem";
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement";

// ---------------------------------------------------------------------------
// Static placeholder data (items without real endpoints)
// ---------------------------------------------------------------------------

const DEPARTMENTS = [
  { name: "Engineering", employees: 2340, color: "border-l-blue-500" },
  { name: "Sales", employees: 1890, color: "border-l-emerald-500" },
  { name: "Marketing", employees: 1120, color: "border-l-violet-500" },
  { name: "Human Resources", employees: 680, color: "border-l-amber-500" },
  { name: "Finance", employees: 920, color: "border-l-rose-500" },
  { name: "Operations", employees: 1540, color: "border-l-cyan-500" },
  { name: "Customer Success", employees: 1080, color: "border-l-orange-500" },
  { name: "Product", employees: 760, color: "border-l-teal-500" },
];

const HEALTH_METRICS = [
  { label: "Employee Engagement", value: 87, color: "text-emerald-600" },
  { label: "Retention Rate", value: 94, color: "text-blue-600" },
  { label: "PRISM Alignment", value: 82, color: "text-violet-600" },
];

const TRAINING_PROGRESS = [
  { department: "Engineering", progress: 85, color: "bg-blue-500" },
  { department: "Sales", progress: 72, color: "bg-emerald-500" },
  { department: "Marketing", progress: 91, color: "bg-violet-500" },
  { department: "Human Resources", progress: 96, color: "bg-amber-500" },
  { department: "Finance", progress: 68, color: "bg-rose-500" },
  { department: "Operations", progress: 77, color: "bg-cyan-500" },
  { department: "Customer Success", progress: 83, color: "bg-orange-500" },
  { department: "Product", progress: 79, color: "bg-teal-500" },
];

const TEAMS = [
  { name: "Platform Core", department: "Engineering", lead: "Sarah Chen", members: 12, prism: 92 },
  { name: "Growth", department: "Sales", lead: "Marcus Johnson", members: 8, prism: 85 },
  { name: "Brand", department: "Marketing", lead: "Emily Torres", members: 6, prism: 78 },
  { name: "Talent", department: "Human Resources", lead: "David Kim", members: 5, prism: 88 },
  { name: "Revenue Ops", department: "Finance", lead: "Rachel Patel", members: 7, prism: 81 },
  { name: "Infrastructure", department: "Engineering", lead: "Alex Rivera", members: 10, prism: 94 },
];

const COST_KPIS = [
  { label: "Total Cost", value: "$45,678", change: "+12.3%", trend: "up" as const },
  { label: "Cost per User", value: "$3.55", change: "-4.1%", trend: "down" as const },
  { label: "Total Sessions", value: "84,320", change: "+15.7%", trend: "up" as const },
  { label: "AI Cost %", value: "62%", change: "+3.2%", trend: "up" as const },
  { label: "Avg Session Cost", value: "$0.54", change: "-2.8%", trend: "down" as const },
];

const COST_BREAKDOWN = [
  { category: "LLM Inference", amount: "$28,320", pct: 62 },
  { category: "Embedding / Search", amount: "$6,852", pct: 15 },
  { category: "Voice (STT + TTS)", amount: "$4,568", pct: 10 },
  { category: "Infrastructure", amount: "$3,654", pct: 8 },
  { category: "Storage", amount: "$2,284", pct: 5 },
];

const TOP_USERS_BY_COST = [
  { name: "Sarah Chen", org: "Acme Corp", sessions: 342, cost: "$1,240" },
  { name: "Marcus Johnson", org: "TechVision Ltd", sessions: 287, cost: "$980" },
  { name: "Emily Torres", org: "Global Dynamics", sessions: 256, cost: "$870" },
  { name: "David Kim", org: "Pinnacle Group", sessions: 214, cost: "$720" },
  { name: "Rachel Patel", org: "Horizon Partners", sessions: 198, cost: "$650" },
];

const AGENT_USAGE = [
  { agent: "Coaching Agent", sessions: 32400, cost: "$14,200", pctCost: 31 },
  { agent: "PRISM Assessment", sessions: 18900, cost: "$8,400", pctCost: 18 },
  { agent: "Document Analysis", sessions: 12600, cost: "$7,200", pctCost: 16 },
  { agent: "Onboarding Agent", sessions: 9800, cost: "$5,100", pctCost: 11 },
  { agent: "Training Planner", sessions: 6200, cost: "$4,800", pctCost: 11 },
  { agent: "General Assistant", sessions: 4420, cost: "$5,978", pctCost: 13 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prismBadgeVariant(score: number) {
  if (score >= 90) return "bg-emerald-100 text-emerald-700";
  if (score >= 80) return "bg-blue-100 text-blue-700";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
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

  // Derived real values
  const orgStats = dashboardData?.data?.organization_statistics;
  const totalUsers = usersData?.data?.pagination?.total;
  const latestUsers = usersData?.data?.users ?? [];

  const isKpiLoading = isDashboardLoading || isUsersLoading;

  // Build KPI cards with real data where available
  const kpiCards = [
    {
      label: "Total Users",
      value: totalUsers != null ? totalUsers.toLocaleString() : "--",
      change: "+8.2%",
      trend: "up" as const,
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active Organizations",
      value: orgStats ? orgStats.total.toLocaleString() : "--",
      change: orgStats
        ? `${orgStats.active} active`
        : "--",
      trend: "up" as const,
      icon: Building2,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Training Completion",
      value: "78%",
      change: "+5%",
      trend: "up" as const,
      icon: GraduationCap,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "PRISM Assessed",
      value: "89%",
      change: "+8%",
      trend: "up" as const,
      icon: Brain,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Platform Cost (MTD)",
      value: "$45,678",
      change: "+12.3%",
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
              <Users className="h-4 w-4" />{" "}
              {totalUsers != null
                ? `${totalUsers.toLocaleString()} Active Users`
                : "-- Active Users"}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />{" "}
              {orgStats
                ? `${orgStats.total} Organizations`
                : "-- Organizations"}
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> 78% Trained
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" /> $45,678 MTD Cost
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
                        <span
                          className={cn(
                            "flex items-center text-xs font-medium",
                            kpi.trend === "up"
                              ? "text-emerald-600"
                              : "text-red-500"
                          )}
                        >
                          {kpi.trend === "up" ? (
                            <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                          )}
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
            {/* Departments + Org Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Department Grid */}
              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Departments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DEPARTMENTS.map((dept) => (
                      <div
                        key={dept.name}
                        className={cn(
                          "flex items-center justify-between rounded-lg border-l-4 bg-muted/40 px-4 py-3",
                          dept.color
                        )}
                      >
                        <span className="text-sm font-medium">
                          {dept.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {dept.employees.toLocaleString()} employees
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Organization Health */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold px-1">
                  Organization Health
                </h3>
                {HEALTH_METRICS.map((m) => (
                  <Card key={m.label} className="shadow-sm">
                    <CardContent className="p-5 text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        {m.label}
                      </p>
                      <p
                        className={cn(
                          "text-4xl font-bold tracking-tight",
                          m.color
                        )}
                      >
                        {m.value}%
                      </p>
                      <Progress
                        value={m.value}
                        className="mt-3 h-2"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Training Progress by Department */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Training Progress by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {TRAINING_PROGRESS.map((tp) => (
                    <div key={tp.department} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{tp.department}</span>
                        <span className="text-muted-foreground">
                          {tp.progress}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            tp.color
                          )}
                          style={{ width: `${tp.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Teams Table */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Team Lead</TableHead>
                      <TableHead className="text-center">Members</TableHead>
                      <TableHead className="text-center">
                        Avg PRISM Score
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TEAMS.map((t) => (
                      <TableRow key={t.name}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.department}
                        </TableCell>
                        <TableCell>{t.lead}</TableCell>
                        <TableCell className="text-center">
                          {t.members}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-semibold",
                              prismBadgeVariant(t.prism)
                            )}
                          >
                            {t.prism}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Organizations Tab ──────────────────────────────────────── */}
          <TabsContent value="organizations" className="space-y-6">
            {/* Top Organizations */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Top Organizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isDashboardLoading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Active</TableHead>
                        <TableHead className="text-right">Inactive</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRowSkeleton key={i} cols={5} />
                      ))}
                    </TableBody>
                  </Table>
                ) : orgStats ? (
                  <div className="space-y-4">
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
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No organization data available.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Latest Users */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Latest Users
                </CardTitle>
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
                                {u.full_name ||
                                  [u.first_name, u.last_name]
                                    .filter(Boolean)
                                    .join(" ") ||
                                  "--"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {u.email}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{u.role}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    u.is_active
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-gray-100 text-gray-600"
                                  )}
                                >
                                  {u.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(u.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        : (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center text-muted-foreground py-4"
                              >
                                No users found.
                              </TableCell>
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
              {COST_KPIS.map((kpi) => (
                <Card key={kpi.label} className="shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground mb-1">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {kpi.value}
                    </p>
                    <span
                      className={cn(
                        "flex items-center text-xs font-medium mt-1",
                        kpi.trend === "down"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      )}
                    >
                      {kpi.trend === "up" ? (
                        <TrendingUp className="h-3.5 w-3.5 mr-1" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 mr-1" />
                      )}
                      {kpi.change}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cost Distribution + Top Users by Cost */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost Breakdown */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Cost Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {COST_BREAKDOWN.map((item) => (
                      <div key={item.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{item.category}</span>
                          <span className="text-muted-foreground">
                            {item.amount} ({item.pct}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Users by Cost */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Top Users by Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {TOP_USERS_BY_COST.map((u) => (
                        <TableRow key={u.name}>
                          <TableCell className="font-medium">
                            {u.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.org}
                          </TableCell>
                          <TableCell className="text-right">
                            {u.sessions}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {u.cost}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Agent Usage */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Agent Usage Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="w-[200px]">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AGENT_USAGE.map((a) => (
                      <TableRow key={a.agent}>
                        <TableCell className="font-medium">
                          {a.agent}
                        </TableCell>
                        <TableCell className="text-right">
                          {a.sessions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {a.cost}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-teal-400"
                                style={{ width: `${a.pctCost}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {a.pctCost}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}
