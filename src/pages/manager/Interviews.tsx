import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerInterviewSchedule } from "@/hooks/manager/useManagerTeam"

type Interview = {
  time: string
  candidate: string
  position: string
  type: string
  status: string
  interviewer: string
  group: string
}

const FALLBACK_INTERVIEWS: Interview[] = [
  { time: "9:00 AM", candidate: "Sarah Chen", position: "Frontend Developer", type: "Technical", status: "confirmed", interviewer: "James Wilson", group: "Today" },
  { time: "10:30 AM", candidate: "Marcus Johnson", position: "Product Manager", type: "Behavioral", status: "confirmed", interviewer: "Lisa Park", group: "Today" },
  { time: "1:00 PM", candidate: "David Kim", position: "Backend Engineer", type: "Technical", status: "pending", interviewer: "Chris Martin", group: "Today" },
  { time: "2:30 PM", candidate: "Priya Patel", position: "QA Lead", type: "Screening", status: "confirmed", interviewer: "Sarah Lee", group: "Today" },
  { time: "9:30 AM", candidate: "Elena Rodriguez", position: "UX Designer", type: "Portfolio Review", status: "pending", interviewer: "Maria Garcia", group: "Tomorrow" },
  { time: "11:00 AM", candidate: "Tom Harris", position: "Frontend Developer", type: "Final Round", status: "confirmed", interviewer: "Alex Thompson", group: "Tomorrow" },
  { time: "10:00 AM", candidate: "Lisa Wang", position: "Data Analyst", type: "Technical", status: "scheduled", interviewer: "James Wilson", group: "This Week" },
  { time: "2:00 PM", candidate: "Chris Lee", position: "DevOps Engineer", type: "Behavioral", status: "scheduled", interviewer: "Chris Martin", group: "This Week" },
]

const typeColor = (type: string) => {
  const map: Record<string, string> = {
    Technical: "#3B5BFF",
    Behavioral: "#8B5CF6",
    Screening: "#0D9488",
    "Portfolio Review": "#E53E3E",
    "Final Round": "#10B981",
  }
  return map[type] ?? "#6b7280"
}

export default function ManagerInterviews() {
  const { data: scheduleData, isLoading, error, refetch } = useManagerInterviewSchedule()
  const interviews = ((scheduleData as { interviews?: Interview[] } | undefined)?.interviews ?? FALLBACK_INTERVIEWS) as Interview[]

  const groups = ["Today", "Tomorrow", "This Week"]
  const todayCount = interviews.filter((i) => i.group === "Today").length
  const weekCount = interviews.length
  const upcomingCount = interviews.filter((i) => i.status === "pending" || i.status === "scheduled").length
  const completedCount = 12 // TODO: wire to real endpoint when available

  const STATS = [
    { label: "Today's Interviews", value: String(todayCount), color: "#3B5BFF" },
    { label: "This Week", value: String(weekCount), color: "#0D9488" },
    { label: "Upcoming", value: String(upcomingCount), color: "#3B82F6" },
    { label: "Completed", value: String(completedCount), color: "#10B981" },
  ]

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Interviews</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Schedule and track candidate interviews.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-7 w-12 mx-auto mb-1" />
            ) : (
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
            )}
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444] mb-4">
          Failed to load interview schedule.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
        </div>
      )}

      {groups.map((group) => {
        const groupInterviews = interviews.filter((i) => i.group === group)
        if (groupInterviews.length === 0) return null
        return (
          <DataCard key={group} title={group} badge={groupInterviews.length}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] text-[#6b7280] border-b border-[#e5e7eb]">
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Candidate</th>
                      <th className="pb-2 font-medium">Position</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Interviewer</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupInterviews.map((i) => (
                      <tr key={`${i.candidate}-${i.time}`} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                        <td className="py-2.5 font-medium text-[#111827]">{i.time}</td>
                        <td className="py-2.5 text-[#111827]">{i.candidate}</td>
                        <td className="py-2.5 text-[#6b7280]">{i.position}</td>
                        <td className="py-2.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${typeColor(i.type)}15`, color: typeColor(i.type) }}>
                            {i.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-[#6b7280]">{i.interviewer}</td>
                        <td className="py-2.5"><StatusBadge status={i.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataCard>
        )
      })}
    </ManagerLayout>
  )
}
