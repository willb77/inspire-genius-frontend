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

const EVENT_TYPES = [
  "all",
  "user_login",
  "user_logout",
  "feedback_submitted",
  "prompt_saved",
  "prompt_updated",
  "user_invited",
  "user_updated",
  "user_deleted",
  "page_view",
  "coach_created",
  "coach_updated",
  "coach_deleted",
  "document_uploaded",
  "document_deleted",
  "onboarding_completed",
  "password_reset",
  "settings_updated",
]

export default function AuditLog() {
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState("all")
  const [actorSearch, setActorSearch] = useState("")

  const params = {
    page,
    limit: 15,
    event_type: eventType === "all" ? undefined : eventType,
    actor: actorSearch || undefined,
  }

  const { data: logsData, isLoading: logsLoading } = useAuditLogs(params)
  const { data: statsData, isLoading: statsLoading } = useAuditStats()

  const logs = logsData?.data?.logs ?? []
  const pagination = logsData?.data?.pagination ?? { total: 0, page: 1, limit: 15, has_more: false }
  const stats = statsData?.data

  const rows: AuditRow[] = logs.map((l) => ({ ...l }))

  const metricCards = [
    { title: "Total Events", value: stats?.total_events ?? 0, icon: Shield, bg: "bg-teal-50", color: "text-teal-600" },
    { title: "Events Today", value: stats?.events_today ?? 0, icon: Activity, bg: "bg-blue-50", color: "text-blue-600" },
    { title: "Unique Actors", value: stats?.unique_actors ?? 0, icon: Users, bg: "bg-purple-50", color: "text-purple-600" },
  ]

  const columns: Column<AuditRow>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (row) => new Date(row.timestamp).toLocaleString(),
    },
    {
      key: "event_type",
      header: "Event Type",
      render: (row) => (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-transparent">
          {row.event_type}
        </Badge>
      ),
    },
    { key: "actor", header: "Actor" },
    { key: "resource", header: "Resource" },
    {
      key: "details",
      header: "Details",
      render: (row) => (
        <span className="text-sm truncate max-w-[200px] block text-muted-foreground">
          {row.details ? JSON.stringify(row.details) : "—"}
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
          <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All Events" : t.replace(/_/g, " ")}
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
            Showing {logs.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            {" "}to {Math.min(pagination.page * pagination.limit, pagination.total)}
            {" "}of {pagination.total} results
          </div>
          <Pagination
            pageCount={Math.max(1, Math.ceil(pagination.total / pagination.limit))}
            page={page}
            onPageChange={setPage}
          />
        </div>
      </div>
    </SuperAdminLayout>
  )
}
