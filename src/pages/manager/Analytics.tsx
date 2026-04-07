import { useTranslation } from "react-i18next";
import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerAnalytics } from "@/hooks/analytics/useAnalytics"

const FALLBACK_ENGAGEMENT_DATA = [
  { name: "Alex T.", sessions: 12 }, { name: "Maria G.", sessions: 9 }, { name: "James W.", sessions: 14 },
  { name: "Sarah L.", sessions: 7 }, { name: "Chris M.", sessions: 11 }, { name: "Priya P.", sessions: 10 },
]
const FALLBACK_GOALS_DATA = [
  { name: "Alex T.", completed: 5, inProgress: 2, notStarted: 0 }, { name: "Maria G.", completed: 3, inProgress: 1, notStarted: 1 },
  { name: "James W.", completed: 6, inProgress: 2, notStarted: 0 }, { name: "Sarah L.", completed: 4, inProgress: 1, notStarted: 1 },
  { name: "Chris M.", completed: 7, inProgress: 1, notStarted: 0 }, { name: "Priya P.", completed: 4, inProgress: 1, notStarted: 0 },
]
const FALLBACK_HIRING_STAGES = [{ name: "Applied", value: 47 }, { name: "Screening", value: 18 }, { name: "Interview", value: 8 }, { name: "Offer", value: 3 }, { name: "Hired", value: 2 }]
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
        <DataCard title={t("admin:manager.coachingEngagement")} className="!mt-0">
          {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ENGAGEMENT_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="sessions" fill="#3B5BFF" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          )}
        </DataCard>

        <DataCard title={t("admin:manager.goalCompletion")} className="!mt-0">
          {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={GOALS_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                <Bar dataKey="completed" stackId="a" fill="#10B981" /><Bar dataKey="inProgress" stackId="a" fill="#ECC94B" /><Bar dataKey="notStarted" stackId="a" fill="#e5e7eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DataCard>

        <DataCard title={t("admin:manager.memberPerformance")} className="!mt-0">
          {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={MEMBER_TREND}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis domain={[70, 95]} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="score" stroke="#3B5BFF" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          )}
        </DataCard>

        <DataCard title={t("admin:manager.candidatesByStage")} className="!mt-0">
          {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={HIRING_STAGES} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                {HIRING_STAGES.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          )}
        </DataCard>
      </div>

      <DataCard title={t("admin:manager.timeToHire")}>
        {isLoading ? <Skeleton className="h-[180px] w-full" /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={TIME_TO_HIRE} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis dataKey="position" type="category" tick={{ fontSize: 11 }} width={80} /><Tooltip /><Bar dataKey="days" fill="#8B5CF6" radius={[0, 4, 4, 0]} /></BarChart>
          </ResponsiveContainer>
        )}
      </DataCard>
    </ManagerLayout>
  )
}
