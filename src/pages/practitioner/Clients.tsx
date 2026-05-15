import { useState } from "react"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { usePractitionerClients } from "@/hooks/practitioner/usePractitioner"

type Client = { id: string; name: string; org: string; email: string; prism: number; sessions: number; status: string; lastSession: string; nextSession: string; notes: string; tier: string }

const FALLBACK_CLIENTS: Client[] = [
  { id: "cl-1", name: "Marcus Chen", org: "TechCorp Inc", email: "marcus@techcorp.com", prism: 82, sessions: 12, status: "active", lastSession: "Mar 15", nextSession: "Mar 22", notes: "Working on delegation skills", tier: "mid" },
  { id: "cl-2", name: "Aisha Patel", org: "GlobalHealth", email: "aisha@globalhealth.com", prism: 78, sessions: 8, status: "active", lastSession: "Mar 14", nextSession: "Mar 21", notes: "Career transition coaching", tier: "mid" },
  { id: "cl-3", name: "James Morrison", org: "Finova Group", email: "james@finova.com", prism: 85, sessions: 15, status: "active", lastSession: "Mar 13", nextSession: "Mar 20", notes: "Leadership development", tier: "high" },
  { id: "cl-4", name: "Sophie Laurent", org: "CreativeEdge", email: "sophie@creativeedge.com", prism: 91, sessions: 20, status: "active", lastSession: "Mar 12", nextSession: "Mar 19", notes: "Executive coaching", tier: "high" },
  { id: "cl-5", name: "David Kimura", org: "DataPrime", email: "david@dataprime.com", prism: 76, sessions: 6, status: "new", lastSession: "Mar 11", nextSession: "Mar 25", notes: "Onboarding phase", tier: "mid" },
  { id: "cl-6", name: "Emma Watson", org: "MediaFlow", email: "emma@mediaflow.com", prism: 88, sessions: 18, status: "active", lastSession: "Mar 10", nextSession: "Mar 24", notes: "Team dynamics focus", tier: "high" },
  { id: "cl-7", name: "Ryan Park", org: "BuildRight", email: "ryan@buildright.com", prism: 73, sessions: 4, status: "new", lastSession: "Mar 9", nextSession: "Mar 23", notes: "Initial assessment phase", tier: "low" },
  { id: "cl-8", name: "Lisa Fernandez", org: "EduNext", email: "lisa@edunext.com", prism: 87, sessions: 14, status: "active", lastSession: "Mar 8", nextSession: "Mar 22", notes: "Goal-setting review", tier: "high" },
]

const prismBg = (tier: string) =>
  tier === "high" ? "bg-[#D1FAE5] text-[#065F46]" : tier === "mid" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#FEE2E2] text-[#991B1B]"

export default function PractitionerClients() {
  const [search, setSearch] = useState("")
  const { data: clientsData, isLoading, error, refetch } = usePractitionerClients()

  const allClients = ((clientsData as { clients?: Client[] } | undefined)?.clients ?? FALLBACK_CLIENTS) as Client[]
  const filtered = allClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.org.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PractitionerLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Client Management</h1>
          <p className="text-[13px] text-[#6b7280]">Manage your client roster, PRISM assessments, and session history.</p>
        </div>
        <button className="bg-[#3B5BFF] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#2A47CC] transition-colors">
          + Add Client
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Clients", value: "24" },
          { label: "Active", value: "20" },
          { label: "New (This Month)", value: "3" },
          { label: "Avg PRISM Score", value: "83" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
            <div className="text-xs text-[#6b7280]">{s.label}</div>
            <div className="text-2xl font-bold text-[#111827]">{s.value}</div>
          </div>
        ))}
      </div>

      <DataCard title="Client Roster" badge={24}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B5BFF] transition-colors"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Client", "Organization", "PRISM", "Sessions", "Status", "Last Session", "Next Session", "Notes"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-3 py-3">
                      <Skeleton className="h-8 w-full" />
                    </td></tr>
                  ))
                : filtered.map((c) => (
                    <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5">
                        <div className="text-[13px] font-semibold text-[#1f2937]">{c.name}</div>
                        <div className="text-[11px] text-[#9ca3af]">{c.email}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{c.org}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${prismBg(c.tier)}`}>{c.prism}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{c.sessions}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={c.status} label={c.status.charAt(0).toUpperCase() + c.status.slice(1)} /></td>
                      <td className="px-3 py-2.5 text-xs text-[#6b7280]">{c.lastSession}</td>
                      <td className="px-3 py-2.5 text-xs text-[#374151] font-medium">{c.nextSession}</td>
                      <td className="px-3 py-2.5 text-xs text-[#6b7280] max-w-[140px] truncate">{c.notes}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </DataCard>
    </PractitionerLayout>
  )
}
