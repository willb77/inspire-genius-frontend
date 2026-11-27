import type { ReactNode } from "react"
import { BarChart3 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { StatsGrid } from "@/components/job-blueprint/analytics/StatsGrid"
import { HiringFunnel } from "@/components/job-blueprint/analytics/HiringFunnel"
import { AccuracyChart } from "@/components/job-blueprint/analytics/AccuracyChart"
import { TimeToFillChart } from "@/components/job-blueprint/analytics/TimeToFillChart"
import { HiresPanel } from "@/components/job-blueprint/analytics/HiresPanel"
import { ActivityFeed } from "@/components/job-blueprint/analytics/ActivityFeed"
import {
  useBlueprintStats,
  useBlueprintFunnel,
  useBlueprintAccuracy,
  useBlueprintTimeToFill,
  useBlueprintHires,
  useBlueprintActivity,
} from "@/hooks/job-blueprint/useAnalytics"
import { JobDnaPageHeader, JobDnaLoading, JobDnaEmptyState, JobDnaError } from "./_shared"

/** The slice of a React Query result one panel needs to tell loading, failed and empty apart. */
type PanelRead = { isLoading?: boolean; isError?: boolean; refetch?: () => unknown }

/**
 * Hiring analytics dashboard, reading the live analytics endpoints
 * (`/v1/blueprint/analytics/{stats,funnel,accuracy,time-to-fill,hires}` and
 * `/v1/blueprint/activity`). Every panel has an honest empty state — a read
 * with no rows says so; it never renders as a chart of nothing.
 *
 * D-17 PR-B: a panel still loading shows a spinner, and a panel whose read
 * FAILED says so with a retry. Before, both rendered as "No … yet", which a
 * reader cannot tell apart from a genuinely empty account.
 */
export default function JobBlueprintAnalyticsPage() {
  const { t } = useTranslation("jobBlueprintPages")
  const statsQ = useBlueprintStats()
  const funnelQ = useBlueprintFunnel()
  const accuracyQ = useBlueprintAccuracy()
  const timeToFillQ = useBlueprintTimeToFill()
  const hiresQ = useBlueprintHires("month")
  const activityQ = useBlueprintActivity(10)
  const { data: stats, isLoading: loadingStats } = statsQ
  const { data: funnel } = funnelQ
  const { data: accuracy } = accuracyQ
  const { data: timeToFill } = timeToFillQ
  const { data: hires } = hiresQ
  const { data: activity } = activityQ

  /** Loading → spinner; failed with nothing to show → error + retry; else the panel or its empty state. */
  function panel(q: PanelRead, hasData: boolean, content: () => ReactNode, empty: string, testId: string) {
    if (q.isLoading) return <JobDnaLoading />
    if (q.isError && !hasData) {
      return (
        <div role="alert" data-testid={`analytics-error-${testId}`}>
          <JobDnaError
            message={t("analytics.loadFailed", { defaultValue: "This panel couldn't be loaded. That is not the same as having no data." })}
            onRetry={q.refetch ? () => void q.refetch?.() : undefined}
          />
        </div>
      )
    }
    return hasData ? content() : <JobDnaEmptyState>{empty}</JobDnaEmptyState>
  }

  return (
    <div className="max-w-6xl">
      <JobDnaPageHeader
        icon={BarChart3}
        title={t("analytics.title", { defaultValue: "Analytics" })}
        description={t("analytics.description", { defaultValue: "Hiring funnel, predicted fit distribution and time-to-fill across your Job DNAs." })}
      />

      {loadingStats ? (
        <JobDnaLoading label={t("analytics.loading", { defaultValue: "Loading analytics…" })} />
      ) : (
        <div className="space-y-6">
          {panel(statsQ, Boolean(stats), () => stats && <StatsGrid stats={stats} />, t("analytics.emptyStats", { defaultValue: "No stats available yet." }), "stats")}

          <div className="grid gap-6 lg:grid-cols-2">
            {panel(funnelQ, Boolean(funnel && funnel.length > 0), () => funnel && <HiringFunnel data={funnel} />, t("analytics.emptyFunnel", { defaultValue: "No funnel data yet." }), "funnel")}
            {panel(accuracyQ, Boolean(accuracy), () => accuracy && <AccuracyChart report={accuracy} />, t("analytics.emptyAccuracy", { defaultValue: "No accuracy data yet." }), "accuracy")}
          </div>

          {panel(timeToFillQ, Boolean(timeToFill && timeToFill.length > 0), () => timeToFill && <TimeToFillChart data={timeToFill} />, t("analytics.emptyTimeToFill", { defaultValue: "No time-to-fill data yet." }), "time-to-fill")}

          <div className="grid gap-6 lg:grid-cols-2">
            {panel(hiresQ, Boolean(hires && hires.length > 0), () => hires && <HiresPanel data={hires} />, t("analytics.emptyHires", { defaultValue: "No hires recorded yet." }), "hires")}
            {panel(activityQ, Boolean(activity && activity.length > 0), () => activity && <ActivityFeed items={activity} />, t("analytics.emptyActivity", { defaultValue: "No activity yet." }), "activity")}
          </div>
        </div>
      )}
    </div>
  )
}
