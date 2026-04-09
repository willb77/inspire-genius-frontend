import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Download, Send, ArrowUpDown, Clock, CheckCircle2, Mail, Eye, Link, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { InvitationRecord, InvitationStatus } from "@/types/bulk-import"
import type { InvitationStatusResponse } from "@/types/bulk-import"

type DeliveryTrackerProps = {
  data: InvitationStatusResponse | undefined
  isLoading: boolean
  onResend: (inviteId: string) => void
  isResending: boolean
}

type SortField = "name" | "email" | "role" | "status" | "sentAt" | "deliveredAt" | "openedAt"
type SortDirection = "asc" | "desc"

const STATUS_CONFIG: Record<InvitationStatus, { label: string; color: string; icon: React.ElementType }> = {
  queued: { label: "Queued", color: "bg-gray-100 text-gray-700 border-gray-300", icon: Clock },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Send },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
  opened: { label: "Opened", color: "bg-purple-100 text-purple-700 border-purple-300", icon: Eye },
  clicked: { label: "Clicked", color: "bg-indigo-100 text-indigo-700 border-indigo-300", icon: Link },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "\u2014"
  const date = new Date(value)
  if (isNaN(date.getTime())) return "\u2014"

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12 || 12

  return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`
}

function getSortValue(record: InvitationRecord, field: SortField): string {
  switch (field) {
    case "name":
      return record.recipient_name?.toLowerCase() ?? ""
    case "email":
      return record.recipient_email?.toLowerCase() ?? ""
    case "role":
      return record.role?.toLowerCase() ?? ""
    case "status":
      return record.status ?? ""
    case "sentAt":
      return record.sent_at ?? ""
    case "deliveredAt":
      return record.delivered_at ?? ""
    case "openedAt":
      return record.opened_at ?? ""
    default:
      return ""
  }
}

export function DeliveryTracker({ data, isLoading, onResend, isResending }: DeliveryTrackerProps) {
  const [sortField, setSortField] = useState<SortField>("sentAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const records = data?.invitations ?? []

  const stats = useMemo(() => {
    const total = records.length
    const sent = records.filter((r) => r.status === "sent" || r.status === "delivered" || r.status === "opened" || r.status === "clicked").length
    const delivered = records.filter((r) => r.status === "delivered" || r.status === "opened" || r.status === "clicked").length
    const opened = records.filter((r) => r.status === "opened" || r.status === "clicked").length
    const failed = records.filter((r) => r.status === "failed").length
    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0
    return { total, sent, delivered, opened, failed, deliveryRate, openRate }
  }, [records])

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const aVal = getSortValue(a, sortField)
      const bVal = getSortValue(b, sortField)
      const cmp = aVal.localeCompare(bVal)
      return sortDirection === "asc" ? cmp : -cmp
    })
  }, [records, sortField, sortDirection])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  function exportCSV() {
    const headers = ["Name", "Email", "Role", "Status", "Sent At", "Delivered At", "Opened At"]
    const rows = sortedRecords.map((r) => [
      r.recipient_name ?? "",
      r.recipient_email ?? "",
      r.role ?? "",
      r.status ?? "",
      r.sent_at ?? "",
      r.delivered_at ?? "",
      r.opened_at ?? "",
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `invitation-report-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function SortableHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <TableHead>
        <button
          type="button"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => handleSort(field)}
        >
          {children}
          <ArrowUpDown className={cn("h-3.5 w-3.5", sortField === field ? "text-foreground" : "text-muted-foreground/50")} />
        </button>
      </TableHead>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading delivery status...</span>
        </CardContent>
      </Card>
    )
  }

  if (!data || records.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Mail className="h-6 w-6 text-muted-foreground mr-2" />
          <span className="text-muted-foreground">No invitation data available.</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.opened}</p>
            <p className="text-xs text-muted-foreground">Opened</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery & Open Rate Progress Bars */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery Rate</span>
              <span className="font-medium">{stats.deliveryRate}%</span>
            </div>
            <Progress value={stats.deliveryRate} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Open Rate</span>
              <span className="font-medium">{stats.openRate}%</span>
            </div>
            <Progress value={stats.openRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Invitation Details</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            Export Report
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="name">Name</SortableHeader>
                  <SortableHeader field="email">Email</SortableHeader>
                  <SortableHeader field="role">Role</SortableHeader>
                  <SortableHeader field="status">Status</SortableHeader>
                  <SortableHeader field="sentAt">Sent At</SortableHeader>
                  <SortableHeader field="deliveredAt">Delivered At</SortableHeader>
                  <SortableHeader field="openedAt">Opened At</SortableHeader>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRecords.map((record) => {
                  const config = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.queued
                  const StatusIcon = config.icon
                  return (
                    <TableRow key={record.invite_id}>
                      <TableCell className="font-medium">{record.recipient_name ?? "\u2014"}</TableCell>
                      <TableCell className="text-muted-foreground">{record.recipient_email}</TableCell>
                      <TableCell className="capitalize">{record.role ?? "\u2014"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1", config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(record.sent_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(record.delivered_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(record.opened_at)}
                      </TableCell>
                      <TableCell>
                        {record.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onResend(record.invite_id)}
                            disabled={isResending}
                          >
                            {isResending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-1.5">Resend</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
