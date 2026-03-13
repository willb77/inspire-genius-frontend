import { useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import RlhfMetricCards from "@/components/super-admin/rlhf/RlhfMetricCards"
import RlhfRatingChart from "@/components/super-admin/rlhf/RlhfRatingChart"
import RlhfFeedbackTable from "@/components/super-admin/rlhf/RlhfFeedbackTable"
import { useFeedbackList, useFeedbackStats } from "@/hooks/feedback/useFeedback"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

export default function RlhfTraining() {
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

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
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="size-4" />
              Export
            </Button>
          </div>
        </div>

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
      </div>
    </SuperAdminLayout>
  )
}
