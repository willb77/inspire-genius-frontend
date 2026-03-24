import { useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { useAuditLogs, useAuditStats } from "@/hooks/audit/useAudit"
import { Shield, Activity, Users } from "lucide-react"
import type { AuditLogEntry } from "@/types/audit"

type AuditRow = AuditLogEntry & Record<string, unknown>

const ACTION_TYPES = [
  "all",
  "login",
  "logout",
  "login_failed",
  "password_changed",
  "user_created",
  "user_updated",
  "user_deleted",
  "user_activated",
  "user_deactivated",
  "user_role_changed",
  "document_uploaded",
  "document_processed",
  "document_deleted",
  "settings_changed",
  "export_requested",
  "system_error",
]

const PAGE_SIZE = 15

export default function AuditLog() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState("all")
  const [actorSearch, setActorSearch] = useState("")

  const params = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    action: actionFilter === "all" ? undefined : actionFilter,
    actor_id: actorSearch || undefined,
  }

  const { data: logsData, isLoading: logsLoading } = useAuditLogs(params)
  const { data: statsData, isLoading: statsLoading } = useAuditStats()

  const logsPayload = logsData?.data
  const logs = logsPayload?.logs ?? []
  const total = logsPayload?.total ?? 0
  const limit = logsPayload?.limit ?? PAGE_SIZE
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
    <SuperAdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>

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
        <div className="h-[calc(100vh-26rem)] overflow-y-auto">
          {logsLoading ? (
            <LoadingSkeleton columns={5} rows={15} />
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
    </SuperAdminLayout>
  )
}
