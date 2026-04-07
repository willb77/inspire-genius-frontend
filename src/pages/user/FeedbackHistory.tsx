import { useState } from "react"
import { useTranslation } from "react-i18next";
import UserLayout from "@/layouts/UserLayout"
import DataCard from "@/components/dashboard/DataCard"
import { useFeedbackList, useFeedbackStats } from "@/hooks/feedback/useFeedback"
import { ThumbsUp, ThumbsDown, Pencil, Star, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import type { FeedbackEntry } from "@/types/feedback"

function ratingLabel(rating: number): "positive" | "negative" | "correction" {
  if (rating >= 4) return "positive"
  if (rating <= 2) return "negative"
  return "correction"
}

const RATING_CONFIG = {
  positive: { icon: ThumbsUp, color: "text-[#10B981]", label: "Positive" },
  negative: { icon: ThumbsDown, color: "text-[#EF4444]", label: "Negative" },
  correction: { icon: Pencil, color: "text-[#3B5BFF]", label: "Neutral" },
} as const

function RatingBadge({ rating }: { rating: number }) {
  const type = ratingLabel(rating)
  const { icon: Icon, color, label } = RATING_CONFIG[type]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${color}`} title={`${label} (${rating}/5)`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= rating ? "text-[#F59E0B] fill-[#F59E0B]" : "text-[#d1d5db]"}`}
        />
      ))}
    </span>
  )
}

const PAGE_SIZE = 10

export default function FeedbackHistory() {
  const { t } = useTranslation(["common", "coaching"]);
  const [ratingFilter, setRatingFilter] = useState("")
  const [page, setPage] = useState(1)

  const RATING_OPTIONS = [
    { label: t("coaching:feedback.allRatings"), value: "" },
    { label: t("coaching:feedback.fiveStars"), value: "5" },
    { label: t("coaching:feedback.fourStars"), value: "4" },
    { label: t("coaching:feedback.threeStars"), value: "3" },
    { label: t("coaching:feedback.twoStars"), value: "2" },
    { label: t("coaching:feedback.oneStar"), value: "1" },
  ]

  const listParams = {
    rating: ratingFilter ? Number(ratingFilter) : undefined,
    page,
    limit: PAGE_SIZE,
  }

  const { data: listData, isLoading: listLoading, isError: listError } = useFeedbackList(listParams)
  const { data: statsData, isLoading: statsLoading } = useFeedbackStats()

  const feedback = listData?.data?.feedback ?? []
  const pagination = listData?.data?.pagination
  const stats = statsData?.data

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-AU", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  return (
    <UserLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">{t("coaching:feedback.history")}</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">{t("coaching:feedback.reviewDescription")}</p>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5 animate-pulse">
              <div className="h-3 bg-[#e5e7eb] rounded w-20 mb-2" />
              <div className="h-7 bg-[#e5e7eb] rounded w-12" />
            </div>
          ))
        ) : (
          [
            { label: t("coaching:feedback.totalFeedback"), value: stats?.total_count ?? 0 },
            { label: t("coaching:feedback.avgRating"), value: stats?.avg_rating ? `${stats.avg_rating.toFixed(1)} / 5` : "—" },
            { label: t("coaching:feedback.fiveStarCount"), value: stats?.rating_distribution?.["5"] ?? 0 },
            { label: t("coaching:feedback.oneStarCount"), value: stats?.rating_distribution?.["1"] ?? 0 },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
              <div className="text-xs text-[#6b7280]">{s.label}</div>
              <div className="text-2xl font-bold text-[#111827]">{s.value}</div>
            </div>
          ))
        )}
      </div>

      <DataCard title={t("coaching:feedback.feedback")}>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={ratingFilter}
            onChange={(e) => { setRatingFilter(e.target.value); setPage(1) }}
            className="border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[#3B5BFF]"
          >
            {RATING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {pagination && (
            <span className="text-xs text-[#9ca3af]">
              {pagination.total} {t("coaching:feedback.result")}{pagination.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Loading */}
        {listLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[#3B5BFF] animate-spin" />
            <span className="ml-2 text-sm text-[#6b7280]">{t("coaching:feedback.loadingFeedback")}</span>
          </div>
        )}

        {/* Error */}
        {listError && !listLoading && (
          <div className="text-center py-8 text-sm text-[#EF4444]">
            {t("coaching:feedback.failedLoadFeedback")}
          </div>
        )}

        {/* Table */}
        {!listLoading && !listError && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                    {["Date", "Coach", "Rating", "Sentiment", "Correction"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((f: FeedbackEntry) => (
                    <tr key={f.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5 text-xs text-[#6b7280] whitespace-nowrap">{formatDate(f.created_at)}</td>
                      <td className="px-3 py-2.5 text-[13px] font-medium text-[#374151]">{f.coach_id}</td>
                      <td className="px-3 py-2.5"><StarRating rating={f.rating} /></td>
                      <td className="px-3 py-2.5"><RatingBadge rating={f.rating} /></td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151] max-w-[300px] truncate">
                        {f.correction_text || <span className="text-[#9ca3af]">—</span>}
                      </td>
                    </tr>
                  ))}
                  {feedback.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-[13px] text-[#9ca3af]">No feedback found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.total > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f3f4f6]">
                <span className="text-xs text-[#9ca3af]">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 text-xs text-[#374151] px-2.5 py-1.5 rounded-lg border border-[#e5e7eb] hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3 h-3" /> Prev
                  </button>
                  <button
                    disabled={!pagination.has_more}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 text-xs text-[#374151] px-2.5 py-1.5 rounded-lg border border-[#e5e7eb] hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </DataCard>
    </UserLayout>
  )
}
