import ManagerLayout from "@/layouts/ManagerLayout"
import ProgressBar from "@/components/dashboard/ProgressBar"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerCareerPaths } from "@/hooks/manager/useManagerTeam"

type Skill = { name: string; current: number; target: number }
type CareerPath = {
  name: string
  currentRole: string
  targetRole: string
  progressPct: number
  prismAlignment: number
  skills: Skill[]
}

const FALLBACK_PATHS: CareerPath[] = [
  { name: "Alex Thompson", currentRole: "Senior Developer", targetRole: "Tech Lead", progressPct: 72, prismAlignment: 85, skills: [{ name: "Architecture", current: 70, target: 90 }, { name: "Mentoring", current: 60, target: 85 }, { name: "Strategy", current: 55, target: 80 }] },
  { name: "Maria Garcia", currentRole: "UX Designer", targetRole: "Design Lead", progressPct: 58, prismAlignment: 78, skills: [{ name: "Team Management", current: 50, target: 80 }, { name: "Research", current: 85, target: 90 }, { name: "Presentations", current: 65, target: 85 }] },
  { name: "James Wilson", currentRole: "Product Manager", targetRole: "Director of Product", progressPct: 85, prismAlignment: 92, skills: [{ name: "P&L Management", current: 70, target: 85 }, { name: "Executive Comms", current: 80, target: 90 }, { name: "OKRs", current: 90, target: 95 }] },
  { name: "Sarah Lee", currentRole: "Data Analyst", targetRole: "Senior Analyst", progressPct: 65, prismAlignment: 80, skills: [{ name: "Machine Learning", current: 45, target: 75 }, { name: "SQL Advanced", current: 80, target: 90 }, { name: "Visualization", current: 70, target: 85 }] },
  { name: "Chris Martin", currentRole: "DevOps Engineer", targetRole: "Platform Lead", progressPct: 40, prismAlignment: 74, skills: [{ name: "Kubernetes", current: 60, target: 90 }, { name: "IaC", current: 75, target: 90 }, { name: "Observability", current: 50, target: 80 }] },
  { name: "Priya Patel", currentRole: "QA Lead", targetRole: "Engineering Manager", progressPct: 52, prismAlignment: 82, skills: [{ name: "Test Strategy", current: 90, target: 95 }, { name: "People Mgmt", current: 45, target: 80 }, { name: "Agile Coaching", current: 60, target: 85 }] },
]

const alignmentColor = (score: number) =>
  score >= 85 ? "#10B981" : score >= 75 ? "#3B82F6" : "#D97706"

export default function ManagerCareerManagement() {
  const { data: pathData, isLoading, error, refetch } = useManagerCareerPaths()
  const paths = ((pathData as { paths?: CareerPath[] } | undefined)?.paths ?? FALLBACK_PATHS) as CareerPath[]

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Career Management</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Track career paths, skill gaps, and PRISM alignment for your team.</p>

      {error && (
        <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444] mb-4">
          Failed to load career paths.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
          {paths.map((path) => (
            <div key={path.name} className="bg-white border border-[#e5e7eb] rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[14px] font-semibold text-[#111827]">{path.name}</div>
                  <div className="text-[12px] text-[#6b7280] mt-0.5">
                    {path.currentRole} <span className="text-[#3B5BFF] mx-1">&rarr;</span> {path.targetRole}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-[#6b7280]">PRISM Alignment</div>
                  <div className="text-[14px] font-bold" style={{ color: alignmentColor(path.prismAlignment) }}>
                    {path.prismAlignment}%
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-[#6b7280]">Overall Progress</span>
                  <span className="text-[11px] font-semibold text-[#3B5BFF]">{path.progressPct}%</span>
                </div>
                <ProgressBar value={path.progressPct} color="#3B5BFF" showPct={false} />
              </div>

              <div className="text-[11px] font-semibold text-[#6b7280] mb-2">Skill Gaps</div>
              <div className="space-y-1.5">
                {path.skills.map((skill) => {
                  const gap = skill.target - skill.current
                  return (
                    <div key={skill.name} className="flex items-center gap-2">
                      <span className="text-[11px] text-[#374151] w-[100px] shrink-0">{skill.name}</span>
                      <div className="flex-1 h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden relative">
                        <div className="h-full rounded-full bg-[#3B5BFF]" style={{ width: `${skill.current}%` }} />
                        <div className="absolute top-0 h-full border-r-2 border-dashed border-[#9CA3AF]" style={{ left: `${skill.target}%` }} />
                      </div>
                      <span className={`text-[10px] font-semibold w-10 text-right ${gap > 20 ? "text-[#D97706]" : "text-[#10B981]"}`}>
                        -{gap}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </ManagerLayout>
  )
}
