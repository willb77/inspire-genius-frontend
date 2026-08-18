import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DataTable,
  type Column,
} from "@/components/super-admin/organization/DataTable"
import Pagination from "@/components/shared/Pagination"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
// Wave 1 Lane 1.C (P3.4) — Analytics tab charts now use the shared ChartKit
// primitives (PR #34). Recharts only stays in this file for the audit-log /
// project-log / sitemap tabs that aren't part of this lane.
import {
  EngagementChart,
  GoalsBreakdownChart,
  type GoalsBreakdownDatum,
} from "@/components/analytics/charts"
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement"
import { useCoachesList } from "@/hooks/super-admin/coach-management/useCoaches"
import { useAuditLogs, useAuditStats } from "@/hooks/audit/useAudit"
import { useFeedbackStats } from "@/hooks/feedback/useFeedback"
import { useOrganizationManagement } from "@/hooks/super-admin/organization-management/useOrganizationManagement"
import {
  BarChart3, Shield, Activity, Users, FileText, Map,
} from "lucide-react"
import ProjectLogMoved from "@/components/super-admin/ProjectLogMoved"
import type { AuditLogEntry } from "@/types/audit"

type AuditRow = AuditLogEntry & Record<string, unknown>

const COLORS = ["#3B5BFF", "#2DD4BF", "#8B5CF6", "#10B981", "#EF4444", "#e9c46a"]

const ACTION_TYPES = [
  "all", "login", "logout", "login_failed", "password_changed",
  "user_created", "user_updated", "user_deleted", "user_activated",
  "user_deactivated", "user_role_changed", "document_uploaded",
  "document_processed", "document_deleted", "settings_changed",
  "export_requested", "system_error",
]

const AUDIT_PAGE_SIZE = 15

const SITEMAP_MERMAID = `graph TD
  A["/login"] --> B["/home"]
  A --> C["/signup"]
  A --> D["/forgot"]
  A --> E["/social-login"]

  B --> F["/dashboard"]
  B --> G["/documents"]
  B --> H["/settings"]
  B --> I["/help"]
  B --> J["/coaches"]
  B --> K["/feedback"]
  B --> L["/analytics"]

  M["/manager"] --> M1["/manager/dashboard"]
  M --> M2["/manager/team"]
  M --> M3["/manager/bulk-import"]
  M --> M4["/manager/analytics"]

  N["/company-admin"] --> N1["/company-admin/dashboard"]
  N --> N2["/company-admin/users"]
  N --> N3["/company-admin/organization"]
  N --> N4["/company-admin/bulk-import"]

  O["/practitioner"] --> O1["/practitioner/dashboard"]
  O --> O2["/practitioner/clients"]

  P["/distributor"] --> P1["/distributor/dashboard"]
  P --> P2["/distributor/practitioners"]
  P --> P3["/distributor/territory"]

  Q["/super-admin"] --> Q1["/super-admin/dashboard"]
  Q --> Q2["/super-admin/users"]
  Q --> Q3["/super-admin/mentor-management"]
  Q --> Q4["/super-admin/rlhf-training"]
  Q --> Q5["/super-admin/prompt-builder"]
  Q --> Q6["/super-admin/analytics"]
  Q --> Q7["/super-admin/voice-settings"]
  Q --> Q8["/super-admin/agent-trainer"]
  Q --> Q9["/super-admin/process-builder"]
  Q --> Q10["/super-admin/bulk-import"]
  Q --> Q11["/super-admin/settings"]

  style A fill:#ef4444,color:#fff
  style B fill:#3b82f6,color:#fff
  style M fill:#10b981,color:#fff
  style N fill:#8b5cf6,color:#fff
  style O fill:#f59e0b,color:#fff
  style P fill:#ec4899,color:#fff
  style Q fill:#6366f1,color:#fff`

// ─── Analytics Tab ────────────────────────────────────────────────
function AnalyticsTab() {
  const { data: usersData, isLoading: usersLoading } = useUserManagement({ page: 1, limit: 1 })
  const { data: coachesData, isLoading: coachesLoading } = useCoachesList({ page: 1, limit: 20 })
  const { data: auditData, isLoading: auditLoading } = useAuditStats()
  const { data: feedbackData, isLoading: feedbackLoading } = useFeedbackStats()
  const { data: orgsData, isLoading: orgsLoading } = useOrganizationManagement({ page: 1, limit: 10 })

  const totalUsers = usersData?.data?.pagination?.total
  const feedbackCount = feedbackData?.data?.total_count
  const auditStats = auditData?.data

  // Build agent usage from real coach data
  const coachesRaw = coachesData?.data
  const coachAgentsAll = Array.isArray(coachesRaw)
    ? coachesRaw
    : (coachesRaw as { agents?: { name: string; status?: string }[] })?.agents ?? []
  const coachAgents = coachAgentsAll.filter((a: { status?: string }) => a.status?.toLowerCase() !== "deactivated")
  const agentUsage: GoalsBreakdownDatum[] = coachAgents.length > 0
    ? coachAgents.slice(0, 6).map((agent: { name: string }) => ({ name: agent.name, value: 1 }))
    : []

  // Build org comparison from real organization data
  const orgsList = orgsData?.data?.organizations ?? []
  const orgCompare = orgsList.slice(0, 6).map((org: { name: string; status: boolean }) => ({
    org: org.name.length > 15 ? org.name.slice(0, 15) + "…" : org.name,
    status: org.status ? "Active" : "Inactive",
  }))

  // Build top audit actions chart
  const systemHealthData = auditStats?.top_actions?.slice(0, 10).map((a: { action: string; count: number }) => ({
    day: a.action.replace(/_/g, " "),
    responseTime: a.count,
    errorRate: 0,
  })) ?? []

  const isAnyLoading = usersLoading || coachesLoading || auditLoading || feedbackLoading

  return (
    <>
      {/* Platform stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Users", value: isAnyLoading ? "..." : totalUsers != null ? totalUsers.toLocaleString() : "--", color: "#3B5BFF" },
          { label: "Feedback Submitted", value: isAnyLoading ? "..." : feedbackCount != null ? feedbackCount.toLocaleString() : "--", color: "#10B981" },
          { label: "Audit Events Today", value: isAnyLoading ? "..." : auditStats?.logs_today != null ? auditStats.logs_today.toLocaleString() : "--", color: "#8B5CF6" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            <div className="text-[28px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GoalsBreakdownChart
          title="Agent Usage Distribution"
          data={agentUsage}
          colors={COLORS}
          loading={coachesLoading}
          height={220}
          emptyState="No active agents."
        />

        <DataCard title="Organizations" className="!mt-0">
          {orgsLoading ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-[#6b7280]">Loading organizations...</div>
          ) : orgCompare.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-[#6b7280]">No organizations yet</div>
          ) : (
            <div className="space-y-2 p-2">
              {orgCompare.map((org: { org: string; status: string }, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50">
                  <span className="text-sm font-medium">{org.org}</span>
                  <Badge variant={org.status === "Active" ? "default" : "secondary"} className="text-xs">
                    {org.status}
                  </Badge>
                </div>
              ))}
              <div className="text-xs text-muted-foreground text-center pt-2">
                {orgsData?.data?.total ?? orgsList.length} total organizations
              </div>
            </div>
          )}
        </DataCard>
      </div>

      <EngagementChart
        title="Top Audit Actions"
        data={systemHealthData}
        xKey="day"
        valueKey="responseTime"
        loading={auditLoading}
        height={220}
        emptyState="No audit data available yet."
      />
    </>
  )
}

// ─── Audit Log Tab ────────────────────────────────────────────────
function AuditLogTab() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState("all")
  const [actorSearch, setActorSearch] = useState("")

  const params = {
    limit: AUDIT_PAGE_SIZE,
    offset: (page - 1) * AUDIT_PAGE_SIZE,
    action: actionFilter === "all" ? undefined : actionFilter,
    actor_id: actorSearch || undefined,
  }

  const { data: logsData, isLoading: logsLoading } = useAuditLogs(params)
  const { data: statsData, isLoading: statsLoading } = useAuditStats()

  const logsPayload = logsData?.data
  const logs = logsPayload?.logs ?? []
  const total = logsPayload?.total ?? 0
  const limit = logsPayload?.limit ?? AUDIT_PAGE_SIZE
  const stats = statsData?.data

  const rows: AuditRow[] = logs.map((l) => ({ ...l }))
  const uniqueActors = stats?.top_actors?.length ?? 0

  const metricCards = [
    { title: "Total Events", value: stats?.total_logs ?? 0, icon: Shield, bg: "bg-teal-50", color: "text-teal-600" },
    { title: "Events Today", value: stats?.logs_today ?? 0, icon: Activity, bg: "bg-blue-50", color: "text-blue-600" },
    { title: "Unique Actors", value: uniqueActors, icon: Users, bg: "bg-purple-50", color: "text-purple-600" },
  ]

  const columns: Column<AuditRow>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (row) => new Date(row.timestamp).toLocaleString(),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-transparent">
          {row.action}
        </Badge>
      ),
    },
    {
      key: "actor_email",
      header: "Actor",
      render: (row) => <span>{row.actor_email ?? row.actor_type ?? "—"}</span>,
    },
    {
      key: "target_type",
      header: "Target",
      render: (row) => <span>{row.target_type ?? "—"}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="text-sm truncate max-w-[200px] block text-muted-foreground">
          {row.description ?? "—"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metricCards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <div className={`${c.bg} p-2 rounded-lg`}>
                <c.icon className={`size-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "..." : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All Actions" : t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search actor..."
          value={actorSearch}
          onChange={(e) => { setActorSearch(e.target.value); setPage(1); }}
          className="max-w-[250px]"
        />
      </div>

      {/* Table */}
      <div className="h-[calc(100vh-32rem)] overflow-y-auto">
        {logsLoading ? (
          <LoadingSkeleton columns={5} rows={15} />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Shield className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No audit events found</p>
            <p className="text-sm mt-1">Audit events will appear here as users interact with the platform.</p>
            {actionFilter !== "all" && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setActionFilter("all"); setPage(1); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <DataTable columns={columns} data={rows} />
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {logs.length > 0 ? (page - 1) * limit + 1 : 0}
          {" "}to {Math.min(page * limit, total)}
          {" "}of {total} results
        </div>
        <Pagination
          pageCount={Math.max(1, Math.ceil(total / limit))}
          page={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}

// ─── Mermaid Renderer ─────────────────────────────────────────────
const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25

function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1.2)

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          flowchart: { useMaxWidth: false, htmlLabels: true, curve: "basis" },
        })
        if (cancelled || !containerRef.current) return
        const { svg } = await mermaid.render("sitemap-diagram", chart)
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    }
    render()
    return () => { cancelled = true }
  }, [chart])

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">Failed to render diagram. Showing source:</p>
        <pre className="bg-slate-50 p-6 rounded-lg text-xs overflow-auto max-h-[calc(100vh-24rem)] font-mono whitespace-pre leading-relaxed">
          {chart}
        </pre>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
          disabled={zoom <= ZOOM_MIN}
        >
          −
        </Button>
        <span className="text-xs text-muted-foreground w-14 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
          disabled={zoom >= ZOOM_MAX}
        >
          +
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom(1.2)}
          className="text-xs"
        >
          Reset
        </Button>
      </div>

      {/* Scrollable + zoomable diagram */}
      <div className="overflow-auto border rounded-lg bg-white" style={{ maxHeight: "calc(100vh - 22rem)" }}>
        <div
          ref={containerRef}
          className="p-6 origin-top-left"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left", minWidth: "fit-content" }}
        />
      </div>
    </div>
  )
}

// ─── Project Log Tab ──────────────────────────────────────────────
function ProjectLogTab() {
  const [subTab, setSubTab] = useState("log")

  return (
    <Tabs value={subTab} onValueChange={setSubTab} className="flex-1 flex flex-col">
      <TabsList className="w-fit">
        <TabsTrigger value="log" className="gap-2">
          <FileText className="h-3.5 w-3.5" />
          Change Log
        </TabsTrigger>
        <TabsTrigger value="sitemap" className="gap-2">
          <Map className="h-3.5 w-3.5" />
          Site Map
        </TabsTrigger>
      </TabsList>

      <TabsContent value="log" className="flex-1 flex flex-col mt-4">
        <ProjectLogMoved />
      </TabsContent>

      <TabsContent value="sitemap" className="flex-1 mt-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Application Route Map</CardTitle>
          </CardHeader>
          <CardContent>
            <MermaidDiagram chart={SITEMAP_MERMAID} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
const VALID_TABS = ["analytics", "audit", "project"] as const
type AnalyticsTab = (typeof VALID_TABS)[number]

function isAnalyticsTab(value: string | null): value is AnalyticsTab {
  return value !== null && (VALID_TABS as readonly string[]).includes(value)
}

export default function SuperAdminAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab: AnalyticsTab = isAnalyticsTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as AnalyticsTab)
    : "analytics"
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab)

  // Keep ?tab=… in sync if a deep-link arrives after mount (e.g. redirect from /super-admin/audit-log)
  useEffect(() => {
    const param = searchParams.get("tab")
    if (isAnalyticsTab(param) && param !== activeTab) {
      setActiveTab(param)
    }
  }, [searchParams, activeTab])

  const handleTabChange = (next: string) => {
    if (!isAnalyticsTab(next)) return
    setActiveTab(next)
    const params = new URLSearchParams(searchParams)
    if (next === "analytics") {
      params.delete("tab")
    } else {
      params.set("tab", next)
    }
    setSearchParams(params, { replace: true })
  }

  return (
    <SuperAdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-[#111827]">Analytics & Logs</h1>
          <p className="text-[13px] text-[#6b7280] mt-1">Platform analytics, audit trail, and project documentation.</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Shield className="h-3.5 w-3.5" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-2">
              <FileText className="h-3.5 w-3.5" />
              Project Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="flex-1 mt-4 overflow-y-auto">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="audit" className="flex-1 mt-4 overflow-y-auto">
            <AuditLogTab />
          </TabsContent>

          <TabsContent value="project" className="flex-1 mt-4 flex flex-col">
            <ProjectLogTab />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}
