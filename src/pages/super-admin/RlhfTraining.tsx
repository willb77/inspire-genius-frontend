import { useState, useCallback } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import RlhfMetricCards from "@/components/super-admin/rlhf/RlhfMetricCards"
import RlhfRatingChart from "@/components/super-admin/rlhf/RlhfRatingChart"
import RlhfFeedbackTable from "@/components/super-admin/rlhf/RlhfFeedbackTable"
import RlhfReviewQueue from "@/components/super-admin/rlhf/RlhfReviewQueue"
import RlhfModelHistory from "@/components/super-admin/rlhf/RlhfModelHistory"
import RlhfTrainingStatus from "@/components/super-admin/rlhf/RlhfTrainingStatus"
import RlhfCorrectionsTab from "@/components/super-admin/rlhf/RlhfCorrectionsTab"
import { useFeedbackList, useFeedbackStats } from "@/hooks/feedback/useFeedback"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, FileJson, FileSpreadsheet } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { DateRange } from "react-day-picker"
import type { FeedbackEntry } from "@/types/feedback"

/**
 * Rows for the JSON/CSV export, built from the feedback actually fetched.
 *
 * This used to serialise a five-row `MOCK_EXPORT_DATA` constant — invented
 * feedback for Meridian/Aura/Nova/Atlas with made-up dates and ratings — and
 * then reported `toast.success("Exported as CSV")`. The export ignored both
 * the fetched list AND the date-range picker, so an operator could filter to
 * a week, export, and get the same fabricated five rows every time, with no
 * indication they were not real. Fabricated data leaving the platform in a
 * file labelled "rlhf-training-data" is worse than no export button.
 */
function toExportRows(entries: FeedbackEntry[]) {
  return entries.map((f) => ({
    id: f.feedback_id ?? f.id ?? "",
    date: f.created_at ?? "",
    agent: f.agent_id ?? f.coach_id ?? "",
    session_id: f.session_id ?? "",
    feedback_type: f.feedback_type ?? "",
    value: f.value ?? f.rating ?? "",
    text: f.text ?? "",
    correction: f.correction_text ?? "",
  }))
}

/** RFC-4180 quoting: feedback text contains commas, quotes and newlines. */
function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const cell = (v: unknown) => {
    const str = v === null || v === undefined ? "" : String(v)
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => cell(r[h])).join(",")),
  ].join("\n")
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function RlhfTraining() {
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<"overview" | "queue" | "models" | "training" | "corrections">("overview")

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined

  const { data: statsData, isLoading: statsLoading } = useFeedbackStats({
    date_from: dateFrom,
    date_to: dateTo,
  })
  const { data: listData, isLoading: listLoading } = useFeedbackList({
    page,
    limit: 10,
    date_from: dateFrom,
    date_to: dateTo,
  })

  const stats = statsData?.data ?? null
  const listResult = listData?.data ?? null

  const feedbackEntries: FeedbackEntry[] = listResult?.feedback ?? []
  const rangeSuffix = dateFrom || dateTo ? `_${dateFrom ?? "start"}_to_${dateTo ?? "now"}` : ""

  const exportJSON = useCallback(() => {
    const rows = toExportRows(feedbackEntries)
    if (rows.length === 0) {
      toast.error("Nothing to export for the selected range.")
      return
    }
    downloadBlob(JSON.stringify(rows, null, 2), `rlhf-feedback${rangeSuffix}.json`, "application/json")
    toast.success(`Exported ${rows.length} feedback ${rows.length === 1 ? "row" : "rows"} as JSON`)
  }, [feedbackEntries, rangeSuffix])

  const exportCSV = useCallback(() => {
    const rows = toExportRows(feedbackEntries)
    if (rows.length === 0) {
      toast.error("Nothing to export for the selected range.")
      return
    }
    downloadBlob(toCsv(rows), `rlhf-feedback${rangeSuffix}.csv`, "text/csv;charset=utf-8")
    toast.success(`Exported ${rows.length} feedback ${rows.length === 1 ? "row" : "rows"} as CSV`)
  }, [feedbackEntries, rangeSuffix])

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">RLHF Training Dashboard</h1>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="size-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    "Date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportJSON}>
              <FileJson className="size-4" />
              JSON
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
              <FileSpreadsheet className="size-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#e5e7eb]">
          {([
            { key: "overview", label: "Overview" },
            { key: "queue", label: "Review Queue" },
            { key: "models", label: "Model History" },
            { key: "training", label: "Training Status" },
            { key: "corrections", label: "Corrections" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-[13px] font-semibold border-b-2 transition-colors ${
                activeTab === tab.key ? "border-[#3B5BFF] text-[#3B5BFF]" : "border-transparent text-[#6b7280] hover:text-[#374151]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <>
            {/* Metric cards */}
            <RlhfMetricCards stats={stats} isLoading={statsLoading} />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RlhfRatingChart stats={stats} />
            </div>

            {/* Feedback table */}
            <RlhfFeedbackTable
              data={listResult}
              isLoading={listLoading}
              page={page}
              onPageChange={setPage}
            />
          </>
        ) : activeTab === "queue" ? (
          <RlhfReviewQueue />
        ) : activeTab === "models" ? (
          <RlhfModelHistory />
        ) : activeTab === "training" ? (
          <RlhfTrainingStatus />
        ) : activeTab === "corrections" ? (
          <RlhfCorrectionsTab />
        ) : null}
      </div>
    </SuperAdminLayout>
  )
}
