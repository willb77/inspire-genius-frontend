import { useState, useCallback } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import RlhfMetricCards from "@/components/super-admin/rlhf/RlhfMetricCards"
import RlhfRatingChart from "@/components/super-admin/rlhf/RlhfRatingChart"
import RlhfFeedbackTable from "@/components/super-admin/rlhf/RlhfFeedbackTable"
import RlhfReviewQueue from "@/components/super-admin/rlhf/RlhfReviewQueue"
import RlhfModelHistory from "@/components/super-admin/rlhf/RlhfModelHistory"
import RlhfTrainingStatus from "@/components/super-admin/rlhf/RlhfTrainingStatus"
import { useFeedbackList, useFeedbackStats } from "@/hooks/feedback/useFeedback"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, FileJson, FileSpreadsheet } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { DateRange } from "react-day-picker"

const MOCK_EXPORT_DATA = [
  { id: "f1", date: "2026-03-21", agent: "Meridian", rating: 5, type: "positive", correction: null },
  { id: "f2", date: "2026-03-21", agent: "Aura", rating: 1, type: "correction", correction: "Improved response text" },
  { id: "f3", date: "2026-03-20", agent: "Nova", rating: 1, type: "negative", correction: null },
  { id: "f4", date: "2026-03-20", agent: "Meridian", rating: 5, type: "positive", correction: null },
  { id: "f5", date: "2026-03-19", agent: "Atlas", rating: 5, type: "positive", correction: null },
]

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
  const [activeTab, setActiveTab] = useState<"overview" | "queue" | "models" | "training">("overview")

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

  const exportJSON = useCallback(() => {
    downloadBlob(JSON.stringify(MOCK_EXPORT_DATA, null, 2), "rlhf-training-data.json", "application/json")
    toast.success("Exported as JSON")
  }, [])

  const exportCSV = useCallback(() => {
    const headers = "id,date,agent,rating,type,correction\n"
    const rows = MOCK_EXPORT_DATA.map((d) => `${d.id},${d.date},${d.agent},${d.rating},${d.type},${d.correction ?? ""}`).join("\n")
    downloadBlob(headers + rows, "rlhf-training-data.csv", "text/csv")
    toast.success("Exported as CSV")
  }, [])

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
        ) : (
          <RlhfTrainingStatus />
        )}
      </div>
    </SuperAdminLayout>
  )
}
