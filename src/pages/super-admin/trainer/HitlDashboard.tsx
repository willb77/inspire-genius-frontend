import { useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { usePendingApprovals, useApproveApproval, useRejectApproval } from "@/hooks/trainer/useTrainer";
import { useAuth } from "@/context/useAuth";

type Approval = {
  id: string;
  execution_id: string | null;
  step_id: string | null;
  approver_role: string;
  context_summary: string;
  status: string;
  approved_by: string | null;
  rejection_reason: string | null;
  timeout_hours: number;
  expires_at: string | null;
  created_at: string | null;
  resolved_at: string | null;
  time_remaining_seconds: number | null;
};

function formatTimeRemaining(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "Expired";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function getUrgencyColor(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "text-red-500";
  if (seconds < 3600) return "text-red-500"; // < 1 hour
  if (seconds < 14400) return "text-amber-500"; // < 4 hours
  return "text-slate-500";
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending": return "default";
    case "approved": return "secondary";
    case "rejected": return "destructive";
    case "expired": return "outline";
    default: return "outline";
  }
}

export default function HitlDashboard() {
  const { user } = useAuth();
  const { data: response, isLoading, error } = usePendingApprovals();
  const approveMut = useApproveApproval();
  const rejectMut = useRejectApproval();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const approvals: Approval[] = response?.data ?? [];
  const count = (response as any)?.count ?? approvals.length;
  const currentUser = user?.email ?? user?.name ?? "super-admin";

  function handleApprove(approvalId: string) {
    approveMut.mutate({ approvalId, approvedBy: currentUser });
  }

  function handleRejectConfirm() {
    if (!rejectDialogId || !rejectReason.trim()) return;
    rejectMut.mutate(
      { approvalId: rejectDialogId, rejectedBy: currentUser, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          setRejectDialogId(null);
          setRejectReason("");
        },
      }
    );
  }

  return (
    <SuperAdminLayout>
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight">HITL Approvals</h1>
            <Badge variant="secondary" className="text-sm">
              {count} pending
            </Badge>
          </div>
        </div>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Clock className="h-5 w-5 animate-spin mr-2" />
            Loading approvals...
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6 flex items-center gap-3 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Failed to load approvals. Please try again.
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && approvals.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center text-slate-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <p className="text-lg font-medium">All clear</p>
              <p className="text-sm mt-1">No pending approvals at this time.</p>
            </CardContent>
          </Card>
        )}

        {/* Approval cards */}
        <div className="space-y-4">
          {approvals.map((approval) => {
            const isExpanded = expandedId === approval.id;
            const summaryPreview =
              approval.context_summary.length > 200 && !isExpanded
                ? approval.context_summary.slice(0, 200) + "..."
                : approval.context_summary;

            return (
              <Card key={approval.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold">
                        {approval.execution_id
                          ? `Workflow Execution`
                          : "Unknown"}
                        {approval.step_id && (
                          <span className="text-slate-400 font-normal ml-2">
                            Step: {approval.step_id.slice(0, 8)}...
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant={statusBadgeVariant(approval.status)}>
                          {approval.status}
                        </Badge>
                        <span className="text-slate-500">
                          Role: <span className="font-medium">{approval.approver_role}</span>
                        </span>
                        <span className={getUrgencyColor(approval.time_remaining_seconds)}>
                          <Clock className="h-3.5 w-3.5 inline mr-1" />
                          {formatTimeRemaining(approval.time_remaining_seconds)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {approval.created_at
                        ? new Date(approval.created_at).toLocaleString()
                        : ""}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Context summary */}
                  <div className="text-sm text-slate-700 bg-slate-50 rounded-md p-3">
                    <p className="whitespace-pre-wrap">{summaryPreview}</p>
                    {approval.context_summary.length > 200 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : approval.id)}
                        className="text-blue-600 text-xs mt-1 hover:underline"
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>

                  {/* Execution ID reference */}
                  {approval.execution_id && (
                    <p className="text-xs text-slate-400 font-mono">
                      Execution: {approval.execution_id}
                    </p>
                  )}

                  {/* Action buttons */}
                  {approval.status === "pending" && (
                    <div className="flex items-center gap-3 pt-1">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={approveMut.isPending}
                        onClick={() => handleApprove(approval.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={rejectMut.isPending}
                        onClick={() => {
                          setRejectDialogId(approval.id);
                          setRejectReason("");
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Reject confirmation dialog */}
      <Dialog
        open={!!rejectDialogId}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Approval</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this approval. This will be recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogId(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMut.isPending}
              onClick={handleRejectConfirm}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
