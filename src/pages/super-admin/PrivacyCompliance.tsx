import { useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import {
  useDeletionRequests,
  useDeletionManifest,
  useRetentionSweep,
} from "@/hooks/privacy/usePrivacy"
import { toast } from "sonner"
import {
  Shield,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileJson,
} from "lucide-react"

const STATUS_OPTIONS = ["all", "in_progress", "completed", "failed"] as const

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Badge>
    case "in_progress":
      return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />In Progress</Badge>
    case "failed":
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function PrivacyCompliance() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const { data: requestsData, isPending, refetch } = useDeletionRequests(
    statusFilter === "all" ? undefined : statusFilter,
  )
  const { data: manifestData, isPending: manifestLoading } = useDeletionManifest(selectedRequestId)
  const sweepMutation = useRetentionSweep()

  const requests = requestsData?.requests ?? []

  const handleRunSweep = () => {
    sweepMutation.mutate(undefined, {
      onSuccess: (resp) => {
        toast.success(resp.message)
        refetch()
      },
      onError: () => toast.error("Failed to run retention sweep."),
    })
  }

  // Summary stats
  const totalRequests = requests.length
  const completedCount = requests.filter((r) => r.status === "completed").length
  const pendingCount = requests.filter((r) => r.status === "in_progress").length
  const failedCount = requests.filter((r) => r.status === "failed").length

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Privacy & RTBF Compliance
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              GDPR Article 17 — Right to be Forgotten request management
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunSweep}
              disabled={sweepMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {sweepMutation.isPending ? "Running..." : "Run Retention Sweep"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalRequests}</div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <p className="text-sm text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Filter by status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deletion Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <LoadingSkeleton />
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No RTBF deletion requests found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4 font-medium">Request ID</th>
                      <th className="py-2 pr-4 font-medium">User ID</th>
                      <th className="py-2 pr-4 font-medium">Requested By</th>
                      <th className="py-2 pr-4 font-medium">Requested At</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium">Manifest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.request_id} className="border-b hover:bg-muted/50">
                        <td className="py-3 pr-4 font-mono text-xs">{req.request_id?.slice(0, 8)}...</td>
                        <td className="py-3 pr-4 font-mono text-xs">{req.user_id?.slice(0, 12)}...</td>
                        <td className="py-3 pr-4 text-xs">{req.requested_by ?? "self"}</td>
                        <td className="py-3 pr-4 text-xs">
                          {req.requested_at
                            ? new Date(req.requested_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-3 pr-4">{statusBadge(req.status)}</td>
                        <td className="py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRequestId(req.request_id)}
                          >
                            <FileJson className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manifest Dialog */}
        <Dialog
          open={!!selectedRequestId}
          onOpenChange={() => setSelectedRequestId(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Deletion Manifest
              </DialogTitle>
            </DialogHeader>
            {manifestLoading ? (
              <LoadingSkeleton />
            ) : manifestData?.manifest ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Request ID:</span>
                    <p className="font-mono text-xs">{manifestData.manifest.request_id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">User ID:</span>
                    <p className="font-mono text-xs">{manifestData.manifest.user_id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p>{statusBadge(manifestData.manifest.status)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requested By:</span>
                    <p className="text-xs">{manifestData.manifest.requested_by}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requested At:</span>
                    <p className="text-xs">
                      {manifestData.manifest.requested_at
                        ? new Date(manifestData.manifest.requested_at).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed At:</span>
                    <p className="text-xs">
                      {manifestData.manifest.completed_at
                        ? new Date(manifestData.manifest.completed_at).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Stores breakdown */}
                {manifestData.manifest.stores && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Data Stores Purged</h4>
                    <div className="space-y-2">
                      {Object.entries(manifestData.manifest.stores).map(([store, info]) => (
                        <div key={store} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="font-mono text-xs">{store}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={info.deleted_count > 0 ? "default" : "outline"}>
                              {info.deleted_count} records
                            </Badge>
                            {info.error && (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <details className="rounded-md border">
                  <summary className="px-3 py-2 text-sm font-medium cursor-pointer">
                    Raw Manifest JSON
                  </summary>
                  <pre className="p-3 text-xs overflow-x-auto bg-muted/50 rounded-b-md">
                    {JSON.stringify(manifestData.manifest, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Manifest not found.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  )
}
