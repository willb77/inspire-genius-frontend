import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import ProgressBar from "@/components/dashboard/ProgressBar"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerTeamComposition } from "@/hooks/manager/useManagerTeam"
import { AlertTriangle, CheckCircle } from "lucide-react"

type TeamMember = { name: string; role: string; primaryPrism: string; secondaryPrism: string; score: number }

const PRISM_COLORS: Record<string, string> = { Gold: "#E53E3E", Green: "#38A169", Blue: "#3182CE", Orange: "#ECC94B" }

const FALLBACK_MEMBERS: TeamMember[] = [
  { name: "Alex Thompson", role: "Senior Developer", primaryPrism: "Blue", secondaryPrism: "Gold", score: 88 },
  { name: "Maria Garcia", role: "UX Designer", primaryPrism: "Green", secondaryPrism: "Orange", score: 82 },
  { name: "James Wilson", role: "Product Manager", primaryPrism: "Gold", secondaryPrism: "Green", score: 91 },
  { name: "Sarah Lee", role: "Data Analyst", primaryPrism: "Blue", secondaryPrism: "Orange", score: 79 },
  { name: "Chris Martin", role: "DevOps Engineer", primaryPrism: "Blue", secondaryPrism: "Gold", score: 85 },
  { name: "Priya Patel", role: "QA Lead", primaryPrism: "Orange", secondaryPrism: "Blue", score: 87 },
  { name: "David Kim", role: "Backend Engineer", primaryPrism: "Blue", secondaryPrism: "Green", score: 83 },
  { name: "Lisa Park", role: "Scrum Master", primaryPrism: "Green", secondaryPrism: "Gold", score: 86 },
]

const CONFLICTS = [
  "Gold-Orange tension: Alex Thompson and Priya Patel may clash on decision speed vs process thoroughness.",
  "Blue-heavy team: 4 of 8 members are primary Blue — may lead to analysis paralysis on time-sensitive decisions.",
]

const COLLABORATIONS = [
  "James Wilson (Gold) + Maria Garcia (Green) — Strong leadership-empathy pairing for client presentations.",
  "Sarah Lee (Blue) + Lisa Park (Green) — Ideal pair for data-driven process improvements.",
  "Alex Thompson + Chris Martin — Both Blue/Gold, natural alignment on technical architecture decisions.",
]

export default function ManagerTeamBuilding() {
  const { data: compData, isLoading, error, refetch } = useManagerTeamComposition()
  const members = ((compData as { members?: TeamMember[] } | undefined)?.members ?? FALLBACK_MEMBERS) as TeamMember[]

  const distribution = Object.entries(PRISM_COLORS).map(([color, hex]) => ({
    label: color,
    value: Math.round((members.filter((m) => m.primaryPrism === color).length / members.length) * 100),
    color: hex,
  }))

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Team Building</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">PRISM team composition, conflict insights, and collaboration suggestions.</p>

      {error && (
        <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444] mb-4">
          Failed to load team data.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
        </div>
      )}

      <DataCard title="PRISM Color Distribution">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
        ) : (
          <div className="space-y-2.5">
            {distribution.map((d) => (
              <ProgressBar key={d.label} label={`${d.label} (${members.filter((m) => m.primaryPrism === d.label).length})`} value={d.value} color={d.color} />
            ))}
          </div>
        )}
      </DataCard>

      <DataCard title="Team Composition" badge={members.length}>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-[#6b7280] border-b border-[#e5e7eb]">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Primary</th>
                  <th className="pb-2 font-medium">Secondary</th>
                  <th className="pb-2 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                    <td className="py-2.5 font-medium text-[#111827]">{m.name}</td>
                    <td className="py-2.5 text-[#6b7280]">{m.role}</td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${PRISM_COLORS[m.primaryPrism]}20`, color: PRISM_COLORS[m.primaryPrism] }}>{m.primaryPrism}</span>
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${PRISM_COLORS[m.secondaryPrism]}20`, color: PRISM_COLORS[m.secondaryPrism] }}>{m.secondaryPrism}</span>
                    </td>
                    <td className="py-2.5 font-semibold text-[#3B5BFF]">{m.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataCard title="Conflict Insights">
          <div className="space-y-3">
            {CONFLICTS.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 bg-[#FEF3C7] rounded-lg">
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <span className="text-[12px] text-[#92400E]">{c}</span>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Collaboration Suggestions">
          <div className="space-y-3">
            {COLLABORATIONS.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 bg-[#D1FAE5] rounded-lg">
                <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span className="text-[12px] text-[#065F46]">{c}</span>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </ManagerLayout>
  )
}
