import { BarChart3 } from "lucide-react"
import { StatsGrid } from "@/components/job-blueprint/analytics/StatsGrid"
import { HiringFunnel } from "@/components/job-blueprint/analytics/HiringFunnel"
import { AccuracyChart } from "@/components/job-blueprint/analytics/AccuracyChart"
import { TimeToFillChart } from "@/components/job-blueprint/analytics/TimeToFillChart"
import {
  useBlueprintStats,
  useBlueprintFunnel,
  useBlueprintAccuracy,
  useBlueprintTimeToFill,
} from "@/hooks/job-blueprint/useAnalytics"
import { JobDnaPageHeader, JobDnaLoading, JobDnaEmptyState } from "./_shared"

/**
 * Hiring analytics dashboard, reading the live analytics endpoints
 * (`/v1/blueprint/analytics/{stats,funnel,accuracy,time-to-fill}`).
 */
export default function JobBlueprintAnalyticsPage() {
  const { data: stats, isLoading: loadingStats } = useBlueprintStats()
  const { data: funnel } = useBlueprintFunnel()
  const { data: accuracy } = useBlueprintAccuracy()
  const { data: timeToFill } = useBlueprintTimeToFill()

  return (
    <div className="max-w-6xl">
      <JobDnaPageHeader
        icon={BarChart3}
        title="Analytics"
        description="Hiring funnel, prediction accuracy and time-to-fill across your Job DNAs."
      />

      {loadingStats ? (
        <JobDnaLoading label="Loading analytics…" />
      ) : (
        <div className="space-y-6">
          {stats ? <StatsGrid stats={stats} /> : <JobDnaEmptyState>No stats available yet.</JobDnaEmptyState>}

          <div className="grid gap-6 lg:grid-cols-2">
            {funnel && funnel.length > 0 ? (
              <HiringFunnel data={funnel} />
            ) : (
              <JobDnaEmptyState>No funnel data yet.</JobDnaEmptyState>
            )}
            {accuracy && accuracy.length > 0 ? (
              <AccuracyChart data={accuracy} />
            ) : (
              <JobDnaEmptyState>No accuracy data yet.</JobDnaEmptyState>
            )}
          </div>

          {timeToFill && timeToFill.length > 0 ? (
            <TimeToFillChart data={timeToFill} />
          ) : (
            <JobDnaEmptyState>No time-to-fill data yet.</JobDnaEmptyState>
          )}
        </div>
      )}
    </div>
  )
}
