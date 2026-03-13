import { useState } from "react"
import {
  DataTable,
  type Column,
} from "@/components/super-admin/organization/DataTable"
import { Star, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Pagination from "@/components/shared/Pagination"
import RlhfFeedbackDetailModal from "./RlhfFeedbackDetailModal"
import type { FeedbackEntry, FeedbackListData } from "@/types/feedback"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"

type RlhfFeedbackTableProps = {
  data?: FeedbackListData | null
  isLoading?: boolean
  page: number
  onPageChange: (page: number) => void
}

type FeedbackRow = FeedbackEntry & Record<string, unknown>

export default function RlhfFeedbackTable({
  data,
  isLoading,
  page,
  onPageChange,
}: RlhfFeedbackTableProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<FeedbackEntry | null>(null)

  const feedback = data?.feedback ?? []
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 10, has_more: false }

  const rows: FeedbackRow[] = feedback.map((f) => ({ ...f }))

  const columns: Column<FeedbackRow>[] = [
    {
      key: "created_at",
      header: "Date",
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
    { key: "coach_id", header: "Coach" },
    { key: "user_id", header: "User" },
    {
      key: "rating",
      header: "Rating",
      render: (row) => (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={cn(
                "size-3.5",
                i <= row.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              )}
            />
          ))}
        </div>
      ),
    },
    {
      key: "correction_text",
      header: "Correction",
      render: (row) => (
        <span className="text-sm truncate max-w-[200px] block">
          {row.correction_text || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelected(row)
            setDetailOpen(true)
          }}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {isLoading ? (
        <LoadingSkeleton columns={6} rows={10} />
      ) : (
        <DataTable columns={columns} data={rows} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {feedback.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
          {" "}to {Math.min(pagination.page * pagination.limit, pagination.total)}
          {" "}of {pagination.total} results
        </div>
        <Pagination
          pageCount={Math.max(1, Math.ceil(pagination.total / pagination.limit))}
          page={page}
          onPageChange={onPageChange}
        />
      </div>

      <RlhfFeedbackDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        entry={selected}
      />
    </div>
  )
}
