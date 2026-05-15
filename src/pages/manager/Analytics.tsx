import { useTranslation } from "react-i18next";
import ManagerLayout from "@/layouts/ManagerLayout"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import {
  EngagementChart,
  CostTrendChart,
  GoalsBreakdownChart,
  type GoalsBreakdownDatum,
} from "@/components/analytics/charts"
import DataCard from "@/components/dashboard/DataCard"
import CostBoard from "@/components/super-admin/CostBoard"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerAnalytics } from "@/hooks/analytics/useAnalytics"

const FALLBACK_ENGAGEMENT_DATA = [
  { name: "Alex T.", sessions: 12 }, { name: "Maria G.", sessions: 9 }, { name: "James W.", sessions: 14 },
  { name: "Sarah L.", sessions: 7 }, { name: "Chris M.", sessions: 11 }, { name: "Priya P.", sessions: 10 },
]
// Goals data uses stacked bars in the original (completed / inProgress / notStarted).
// ChartKit's EngagementChart is single-series; show "completed" as the primary metric
// and let Wave 3 evidence reveal whether a stacked variant is needed.
const FALLBACK_GOALS_DATA = [
  { name: "Alex T.", completed: 5, inProgress: 2, notStarted: 0 }, { name: "Maria G.", completed: 3, inProgress: 1, notStarted: 1 },
  { name: "James W.", completed: 6, inProgress: 2, notStarted: 0 }, { name: "Sarah L.", completed: 4, inProgress: 1, notStarted: 1 },
  { name: "Chris M.", completed: 7, inProgress: 1, notStarted: 0 }, { name: "Priya P.", completed: 4, inProgress: 1, notStarted: 0 },
]
const FALLBACK_HIRING_STAGES: GoalsBreakdownDatum[] = [{ name: "Applied", value: 47 }, { name: "Screening", value: 18 }, { name: "Interview", value: 8 }, { name: "Offer", value: 3 }, { name: "Hired", value: 2 }]
const FALLBACK_TIME_TO_HIRE = [{ position: "Frontend", days: 21 }, { position: "Backend", days: 28 }, { position: "PM", days: 18 }, { position: "Designer", days: 24 }, { position: "Analyst", days: 20 }]
const FALLBACK_MEMBER_TREND = [{ month: "Oct", score: 78 }, { month: "Nov", score: 80 }, { month: "Dec", score: 79 }, { month: "Jan", score: 83 }, { month: "Feb", score: 85 }, { month: "Mar", score: 88 }]
const STAGE_COLORS = ["#3B5BFF", "#2DD4BF", "#ECC94B", "#10B981", "#8B5CF6"]

export default function ManagerAnalytics() {
  const { t } = useTranslation(["admin", "common"]);
  const { data: analyticsData, isLoading, error, refetch } = useManagerAnalytics()

  const ad = analyticsData as {
    engagementData?: typeof FALLBACK_ENGAGEMENT_DATA;
    goalsData?: typeof FALLBACK_GOALS_DATA;
    hiringStages?: typeof FALLBACK_HIRING_STAGES;
    timeToHire?: typeof FALLBACK_TIME_TO_HIRE;
    memberTrend?: typeof FALLBACK_MEMBER_TREND;
  } | undefined

  const ENGAGEMENT_DATA = ad?.engagementData ?? FALLBACK_ENGAGEMENT_DATA
  const GOALS_DATA = ad?.goalsData ?? FALLBACK_GOALS_DATA
  const HIRING_STAGES = ad?.hiringStages ?? FALLBACK_HIRING_STAGES
  const TIME_TO_HIRE = ad?.timeToHire ?? FALLBACK_TIME_TO_HIRE
  const MEMBER_TREND = ad?.memberTrend ?? FALLBACK_MEMBER_TREND

  const errorString = error ? "Failed to load analytics data." : undefined

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Team Analytics (TODO: translate)</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Track coaching engagement, goals, training, and hiring metrics.</p>

      {error && (
        <div className="flex items-center gap-2 py-2 mb-4 text-[13px] text-[#EF4444]">
          Failed to load analytics data.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EngagementChart
          title={t("admin:manager.coachingEngagement")}
          data={ENGAGEMENT_DATA}
          xKey="name"
          valueKey="sessions"
          loading={isLoading}
          error={errorString}
          height={200}
        />

        <EngagementChart
          title={t("admin:manager.goalCompletion")}
          data={GOALS_DATA}
          xKey="name"
          valueKey="completed"
          color="#10B981"
          loading={isLoading}
          error={errorString}
          height={200}
        />

        <CostTrendChart
          title={t("admin:manager.memberPerformance")}
          data={MEMBER_TREND}
          xKey="month"
          primary={{ key: "score", label: "Score", color: "#3B5BFF" }}
          loading={isLoading}
          error={errorString}
          height={200}
        />

        <GoalsBreakdownChart
          title={t("admin:manager.candidatesByStage")}
          data={HIRING_STAGES}
          colors={STAGE_COLORS}
          loading={isLoading}
          error={errorString}
          height={200}
        />
      </div>

      {/* Time to Hire — kept as a horizontal BarChart since the kit's EngagementChart
          is vertical only. Direct recharts usage stays here until a horizontal-bar
          variant ships in the kit. */}
      <DataCard title={t("admin:manager.timeToHire")}>
        {isLoading ? <Skeleton className="h-[180px] w-full" /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={TIME_TO_HIRE} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis dataKey="position" type="category" tick={{ fontSize: 11 }} width={80} /><Tooltip /><Bar dataKey="days" fill="#8B5CF6" radius={[0, 4, 4, 0]} /></BarChart>
          </ResponsiveContainer>
        )}
      </DataCard>

      {/* Wave 3 Lane 3.A (P7.4) — manager Cost Slice. Mounts the shared
          <CostBoard scope="dept" /> panel. Data validation in Wave 3 once
          R-2.4 telemetry visibly populates the dept-scoped endpoint. */}
      <div className="mt-5">
        <CostBoard scope="dept" />
      </div>
    </ManagerLayout>
  )
}
