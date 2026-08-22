/**
 * RLHF Review Queue — triage of PENDING user corrections.
 *
 * Previously this read `/v1/feedback` and filtered client-side for rows with
 * `correction_text`, then "approved" or "rejected" them like this:
 *
 *     function handleAction(id, action) {
 *       setReviewedIds((prev) => ({ ...prev, [id]: action }))
 *       toast.success(`Correction ${action}`)
 *     }
 *
 * — local React state plus a success toast. Nothing was sent anywhere, and a
 * page reload restored every "reviewed" item to pending. The operator was
 * told the action succeeded each time.
 *
 * The mutations to do it properly already existed and were already in use by
 * the Corrections tab (`useApproveCorrection` / `useRejectCorrection` →
 * `POST /v1/rlhf/corrections/{id}/approve|reject`). This queue now reads the
 * same corrections resource those mutations write to — `/v1/feedback` rows
 * carry different ids from a different table, so the old data source could
 * not have been wired to them regardless.
 *
 * Approved corrections feed the reward-model training set (the Step Function
 * runs `aggregate_corrections`), which is why a silent no-op here mattered:
 * it looked like a curated queue and contributed nothing.
 */
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, MessageSquare, Loader2, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  useCorrections,
  useApproveCorrection,
  useRejectCorrection,
} from "@/hooks/rlhf/useCorrections"
import { useAuth } from "@/context/useAuth"
import type { CorrectionEntry } from "@/services/rlhf/corrections.service"

export default function RlhfReviewQueue() {
  const { data, isLoading, error } = useCorrections({ status: "pending", limit: 50 })
  const approve = useApproveCorrection()
  const reject = useRejectCorrection()
  const { user } = useAuth()

  const reviewer = user?.email ?? "super-admin"
  const pending = data?.data?.corrections ?? []
  const busyId =
    (approve.isPending ? approve.variables?.correctionId : undefined) ??
    (reject.isPending ? reject.variables?.correctionId : undefined)

  // A failed load must not render as an empty queue: "nothing to review" and
  // "we could not ask" are different, and only one of them means you are done.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive/60" />
        <p className="text-sm font-medium">Could not load the review queue</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          {error.response?.data?.message ??
            error.message ??
            "The corrections service did not respond."}{" "}
          This is not an empty queue — corrections may be waiting.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#111827]">
          Review Queue{" "}
          <span className="text-[13px] text-[#3B5BFF]">({pending.length} pending)</span>
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MessageSquare className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No corrections awaiting review</p>
          <p className="mt-1 text-xs">
            User corrections appear here while their status is <code>pending</code>. Approved
            and rejected ones move to the Corrections tab.
          </p>
        </div>
      ) : (
        pending.map((item) => (
          <CorrectionCard
            key={item.correction_id}
            item={item}
            busy={busyId === item.correction_id}
            onApprove={() =>
              approve.mutate({ correctionId: item.correction_id, approvedBy: reviewer })
            }
            onReject={(reason) =>
              reject.mutate({
                correctionId: item.correction_id,
                rejectedBy: reviewer,
                reason,
              })
            }
          />
        ))
      )}
    </div>
  )
}

function CorrectionCard({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: CorrectionEntry
  busy: boolean
  onApprove: () => void
  onReject: (reason: string) => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  return (
    <div className="space-y-3 rounded-lg border border-[#e5e7eb] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-[#1f2937]">{item.agent_id}</span>
          <span className="text-[11px] text-[#9ca3af]">
            {new Date(item.created_at).toLocaleString()}
          </span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700">
            {item.status}
          </span>
          {item.submitted_by && (
            <span className="text-[11px] text-[#9ca3af]">by {item.submitted_by}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            className="gap-1 border-[#10B981] text-[#10B981] hover:bg-[#ECFDF5]"
            onClick={onApprove}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            className="gap-1 border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2]"
            onClick={() => setRejecting((v) => !v)}
          >
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      </div>

      {item.query_text && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-[#6b7280]">Question</div>
          <div className="rounded border bg-muted/30 p-2 text-[12px] text-[#374151]">
            {item.query_text}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-[#991B1B]">
            Original response
          </div>
          <div className="rounded border border-[#FECACA] bg-[#FEF2F2] p-2 text-[12px] text-[#374151]">
            {item.original_response}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-[#065F46]">
            User correction
          </div>
          <div className="rounded border border-[#A7F3D0] bg-[#ECFDF5] p-2 text-[12px] text-[#374151]">
            {item.corrected_response}
          </div>
        </div>
      </div>

      {rejecting && (
        <div className="space-y-2 rounded border border-[#FECACA] bg-[#FEF2F2] p-3">
          <label className="text-[11px] font-semibold uppercase text-[#991B1B]">
            Reason for rejection
          </label>
          {/* The API requires a reason. Sending an empty one produced a 422
              that the old UI would have shown as a generic failure. */}
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this correction not suitable for training?"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={() => {
                onReject(reason.trim())
                setRejecting(false)
                setReason("")
              }}
            >
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Confirm rejection
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
