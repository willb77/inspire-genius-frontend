import { useEffect, useMemo, useRef } from "react"
import { toast } from "sonner"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import UserLayout from "@/layouts/UserLayout"
import { V2Panel, V2Card } from "@/components/v2"
import DataCard from "@/components/dashboard/DataCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, Target, BookOpen, BarChart3 } from "lucide-react"
import { useUserAnalytics } from "@/hooks/analytics/useAnalytics"
import { useTranslation } from "react-i18next"

type SessionTrendPoint = { period: string; count: number }
type TrainingSummary = { total: number; completed: number; completion_pct: number }
type UserAnalyticsData = {
  total_sessions?: number
  goals_by_status?: Record<string, number>
  session_trends?: SessionTrendPoint[]
  training?: TrainingSummary
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#10B981",
  in_progress: "#3B5BFF",
  not_started: "#9ca3af",
  cancelled: "#EF4444",
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * AnalyticsV2 — the new-design ("HomeV2" system) variant of Analytics. Flag-gated
 * (new_user_surfaces) additive swap; the classic page is unchanged and remains at
 * /analytics/classic. Same data/hooks/logic — only the presentation is re-skinned
 * to the cream panel + tokens + serif heading. Chart/status colors are preserved.
 * RTL-safe (logical CSS).
 */
export default function AnalyticsV2() {
  const { t } = useTranslation("userPages")
  const { data, isLoading, isSuccess, error, refetch } = useUserAnalytics()
  const analytics = data as UserAnalyticsData | undefined

  const totalSessions = analytics?.total_sessions ?? 0
  const sessionTrends: SessionTrendPoint[] = analytics?.session_trends ?? []
  const training: TrainingSummary = analytics?.training ?? { total: 0, completed: 0, completion_pct: 0 }

  const goalsChart = useMemo(() => {
    const entries = Object.entries(analytics?.goals_by_status ?? {})
    return entries.map(([status, count]) => ({
      status: formatStatus(status),
      count,
      fill: STATUS_COLORS[status] ?? "#3B5BFF",
    }))
  }, [analytics?.goals_by_status])

  const goalsTotal = goalsChart.reduce((acc, g) => acc + g.count, 0)

  const isEmpty =
    isSuccess &&
    totalSessions === 0 &&
    sessionTrends.length === 0 &&
    goalsChart.length === 0 &&
    training.total === 0

  const emptyToastShownRef = useRef(false)
  useEffect(() => {
    if (isEmpty && !emptyToastShownRef.current) {
      toast.info(t("analyticsV2.noAnalyticsYetYourChartsWill", "No analytics yet — your charts will populate as you complete sessions and goals."))
      emptyToastShownRef.current = true
    }
    if (!isEmpty) {
      emptyToastShownRef.current = false
    }
  }, [isEmpty, t])

  return (
    <UserLayout>
      <V2Panel>
        <div>
          <h1 className="font-serif text-xl font-bold text-ink mb-1">{t("analyticsV2.yourAnalytics", "Your Analytics")}</h1>
          <p className="text-[13px] text-body-slate mb-5">
            {t("analyticsV2.trackYourCoachingJourneyGoalsAnd", "Track your coaching journey, goals, and training progress.")}
          </p>

          {error && (
            <div className="flex items-center gap-2 py-2 mb-4 text-[13px] text-[#EF4444]">
              {t("analyticsV2.failedToLoadAnalytics", "Failed to load analytics.")}
              <button onClick={() => void refetch()} className="underline ms-1 text-ink">
                {t("analyticsV2.retry", "Retry")}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatTile label={t("analyticsV2.totalSessions", "Total Sessions")} value={totalSessions} icon={Activity} color="#3B5BFF" loading={isLoading} />
            <StatTile label={t("analyticsV2.goalsTracked", "Goals Tracked")} value={goalsTotal} icon={Target} color="#10B981" loading={isLoading} />
            <StatTile label={t("analyticsV2.trainingCompleted", "Training Completed")} value={training.completed} icon={BookOpen} color="#8B5CF6" loading={isLoading} />
            <StatTile label={t("analyticsV2.trainingCompletion", "Training Completion")} value={`${training.completion_pct}%`} icon={BarChart3} color="#D97706" loading={isLoading} />
          </div>

          {isEmpty ? (
            <DataCard title={t("analyticsV2.noAnalyticsYet", "No analytics yet")}>
              <div className="py-8 text-center">
                <p className="text-[13px] text-body-slate">
                  {t("analyticsV2.onceYouCompleteYourFirstSession", "Once you complete your first session or goal, your activity will appear here.")}
                </p>
              </div>
            </DataCard>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <DataCard title={t("analyticsV2.sessionActivity", "Session Activity")} className="!mt-0">
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : sessionTrends.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-body-slate">{t("analyticsV2.noSessionActivityYet", "No session activity yet.")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={sessionTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3B5BFF" strokeWidth={2} dot={{ r: 3 }} name="Sessions" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </DataCard>

              <DataCard title={t("analyticsV2.goalsByStatus", "Goals by Status")} className="!mt-0">
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : goalsChart.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-body-slate">{t("analyticsV2.noGoalsTrackedYet", "No goals tracked yet.")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={goalsChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Goals" fill="#3B5BFF" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </DataCard>
            </div>
          )}
        </div>
      </V2Panel>
    </UserLayout>
  )
}

type StatTileProps = {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
  loading: boolean
}

function StatTile({ label, value, icon: Icon, color, loading }: StatTileProps) {
  return (
    <V2Card className="rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-body-slate">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className="text-2xl font-bold text-ink">{value}</div>
      )}
    </V2Card>
  )
}
