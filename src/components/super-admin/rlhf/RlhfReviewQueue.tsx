import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { useFeedbackList } from "@/hooks/feedback/useFeedback"
import { Skeleton } from "@/components/ui/skeleton"
import type { FeedbackEntry } from "@/types/feedback"

export default function RlhfReviewQueue() {
  const [page, setPage] = useState(1)
  const [reviewedIds, setReviewedIds] = useState<Record<string, "approved" | "rejected">>({})

  // Fetch corrections (feedback with correction_text) from the real API
  const { data: feedbackData, isLoading } = useFeedbackList({
    page,
    limit: 20,
  })

  const allFeedback = feedbackData?.data?.feedback ?? []
  // Filter to corrections (entries with correction_text)
  const corrections = allFeedback.filter((f) => f.correction_text)
  const pagination = feedbackData?.data?.pagination

  function handleAction(id: string, action: "approved" | "rejected") {
    setReviewedIds((prev) => ({ ...prev, [id]: action }))
    toast.success(`Correction ${action}`)
  }

  const pending = corrections.filter((c) => !reviewedIds[c.id ?? ""])
  const reviewed = corrections.filter((c) => reviewedIds[c.id ?? ""])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#111827]">
          Review Queue{" "}
          <span className="text-[#3B5BFF] text-[13px]">
            ({pending.length} pending)
          </span>
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : corrections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No corrections submitted yet</p>
          <p className="text-xs mt-1">
            User corrections will appear here when they suggest improvements to agent responses.
          </p>
        </div>
      ) : (
        <>
          {pending.length === 0 && (
            <p className="text-[13px] text-[#9ca3af] py-4 text-center">
              All corrections have been reviewed.
            </p>
          )}

          {pending.map((item) => (
            <CorrectionCard
              key={item.id}
              item={item}
              onApprove={() => handleAction(item.id ?? "", "approved")}
              onReject={() => handleAction(item.id ?? "", "rejected")}
            />
          ))}

          {reviewed.length > 0 && (
            <div className="mt-4">
              <h4 className="text-[13px] font-semibold text-[#6b7280] mb-2">
                Recently Reviewed ({reviewed.length})
              </h4>
              {reviewed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-[#f3f4f6] last:border-b-0"
                >
                  <span className="text-[13px] text-[#374151]">
                    {item.coach_id}: {(item.correction_text ?? "").slice(0, 60)}...
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      reviewedIds[item.id ?? ""] === "approved"
                        ? "bg-[#D1FAE5] text-[#065F46]"
                        : "bg-[#FEE2E2] text-[#991B1B]"
                    }`}
                  >
                    {reviewedIds[item.id ?? ""]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.has_more && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CorrectionCard({
  item,
  onApprove,
  onReject,
}: {
  item: FeedbackEntry
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="border border-[#e5e7eb] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#1f2937]">
            {item.coach_id}
          </span>
          <span className="text-[11px] text-[#9ca3af]">
            {new Date(item.created_at).toLocaleDateString()}
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
            Rating: {item.rating}/5
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-[#10B981] border-[#10B981] hover:bg-[#ECFDF5]"
            onClick={onApprove}
          >
            <Check className="w-3.5 h-3.5" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-[#EF4444] border-[#EF4444] hover:bg-[#FEF2F2]"
            onClick={onReject}
          >
            <X className="w-3.5 h-3.5" /> Reject
          </Button>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-[#065F46] uppercase mb-1">
          User Correction
        </div>
        <div className="text-[12px] text-[#374151] bg-[#ECFDF5] border border-[#A7F3D0] rounded p-2">
          {item.correction_text}
        </div>
      </div>
    </div>
  )
}
