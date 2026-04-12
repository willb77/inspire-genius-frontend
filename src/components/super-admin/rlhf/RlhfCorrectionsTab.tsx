import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, FileCheck, Clock, XCircle } from "lucide-react"
import { useCorrections, useCorrectionStats, useApproveCorrection, useRejectCorrection } from "@/hooks/rlhf/useCorrections"
import { useAuth } from "@/context/useAuth"
import type { CorrectionEntry } from "@/services/rlhf/corrections.service"

export default function RlhfCorrectionsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("pending")
  const { user } = useAuth()

  const { data: statsData, isLoading: statsLoading } = useCorrectionStats()
  const { data: listData, isLoading: listLoading } = useCorrections({ status: statusFilter === "all" ? undefined : statusFilter })

  const stats = statsData?.data
  const corrections = listData?.data?.corrections ?? []

  const approveMutation = useApproveCorrection()
  const rejectMutation = useRejectCorrection()

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<CorrectionEntry | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const handleApprove = (c: CorrectionEntry) => {
    approveMutation.mutate({ correctionId: c.correction_id, approvedBy: user?.email ?? "admin" })
  }

  const openRejectDialog = (c: CorrectionEntry) => {
    setRejectTarget(c)
    setRejectReason("")
    setRejectDialogOpen(true)
  }

  const handleReject = () => {
    if (!rejectTarget) return
    rejectMutation.mutate(
      { correctionId: rejectTarget.correction_id, rejectedBy: user?.email ?? "admin", reason: rejectReason },
      { onSuccess: () => setRejectDialogOpen(false) }
    )
  }

  const statCards = [
    { label: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Approved", value: stats?.approved ?? 0, icon: FileCheck, color: "text-emerald-600 bg-emerald-50" },
    { label: "Rejected", value: stats?.rejected ?? 0, icon: XCircle, color: "text-red-600 bg-red-50" },
  ]

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsLoading ? "..." : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "pending", "approved", "rejected"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* List */}
      {listLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : corrections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No {statusFilter === "all" ? "" : statusFilter} corrections</p>
        </div>
      ) : (
        <div className="space-y-3">
          {corrections.map((c) => (
            <Card key={c.correction_id} className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{c.agent_id}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                    <Badge
                      variant="secondary"
                      className={
                        c.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                        c.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                  {c.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1 text-emerald-600 border-emerald-300" onClick={() => handleApprove(c)} disabled={approveMutation.isPending}>
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-300" onClick={() => openRejectDialog(c)} disabled={rejectMutation.isPending}>
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  <strong>Query:</strong> {c.query_text}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-semibold text-red-800 uppercase mb-1">Original Response</div>
                    <div className="text-xs bg-red-50 border border-red-200 rounded p-2 max-h-24 overflow-y-auto">
                      {c.original_response}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-emerald-800 uppercase mb-1">Corrected Response</div>
                    <div className="text-xs bg-emerald-50 border border-emerald-200 rounded p-2 max-h-24 overflow-y-auto">
                      {c.corrected_response}
                    </div>
                  </div>
                </div>

                {c.submitted_by && (
                  <p className="text-xs text-muted-foreground">Submitted by: {c.submitted_by}</p>
                )}
                {c.rejection_reason && (
                  <p className="text-xs text-red-600">Rejection reason: {c.rejection_reason}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Correction</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this correction.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why is this correction being rejected?"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
