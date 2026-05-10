import { useState } from "react"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import ProgressBar from "@/components/dashboard/ProgressBar"
import { Skeleton } from "@/components/ui/skeleton"
import { useDistributorPractitioners } from "@/hooks/distributor/useDistributor"

type Practitioner = { id: string; name: string; region: string; email: string; allocated: number; used: number; util: number; status: string; clients: number; joinDate: string }

const FALLBACK_PRACTITIONERS: Practitioner[] = [
  { id: "p-1", name: "Dr. Sarah Chen", region: "Northeast", email: "sarah.chen@prism.com", allocated: 500, used: 420, util: 84, status: "active", clients: 18, joinDate: "Jan 2025" },
  { id: "p-2", name: "Michael Torres", region: "Southeast", email: "m.torres@prism.com", allocated: 450, used: 385, util: 86, status: "active", clients: 15, joinDate: "Mar 2025" },
  { id: "p-3", name: "Jennifer Okafor", region: "Midwest", email: "j.okafor@prism.com", allocated: 400, used: 310, util: 78, status: "active", clients: 12, joinDate: "Feb 2025" },
  { id: "p-4", name: "David Kim", region: "West Coast", email: "d.kim@prism.com", allocated: 350, used: 275, util: 79, status: "active", clients: 10, joinDate: "Apr 2025" },
  { id: "p-5", name: "Rebecca Foster", region: "Southwest", email: "r.foster@prism.com", allocated: 300, used: 240, util: 80, status: "active", clients: 9, joinDate: "May 2025" },
  { id: "p-6", name: "Alex Nguyen", region: "Pacific NW", email: "a.nguyen@prism.com", allocated: 400, used: 320, util: 80, status: "active", clients: 14, joinDate: "Jun 2025" },
  { id: "p-7", name: "Maria Santos", region: "Central", email: "m.santos@prism.com", allocated: 350, used: 280, util: 80, status: "leave", clients: 11, joinDate: "Jul 2025" },
  { id: "p-8", name: "John Parker", region: "Northeast", email: "j.parker@prism.com", allocated: 450, used: 370, util: 82, status: "active", clients: 16, joinDate: "Aug 2025" },
]

export function PractitionersBody() {
  const [search, setSearch] = useState("")
  const { data: practsData, isLoading, error, refetch } = useDistributorPractitioners()

  const allPractitioners = ((practsData as { practitioners?: Practitioner[] } | undefined)?.practitioners ?? FALLBACK_PRACTITIONERS) as Practitioner[]
  const filtered = allPractitioners.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.region.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div data-testid="practitioners-body">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-[#111827]">Practitioner Roster</h2>
          <p className="text-[13px] text-[#6b7280]">Manage practitioners in your territory, onboard new ones, and allocate credits.</p>
        </div>
        <button className="bg-[#3B5BFF] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#2A47CC] transition-colors">
          + Onboard Practitioner
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Practitioners", value: "8" },
          { label: "Active", value: "7" },
          { label: "Total Clients Served", value: "105" },
          { label: "Avg Utilization", value: "81%" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
            <div className="text-xs text-[#6b7280]">{s.label}</div>
            <div className="text-2xl font-bold text-[#111827]">{s.value}</div>
          </div>
        ))}
      </div>

      <DataCard title="Practitioners" badge={8}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B5BFF] transition-colors"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Name", "Region", "Allocated", "Used", "Utilization", "Clients", "Status", "Joined"].map((h) => (
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
                : filtered.map((p) => (
                    <tr key={p.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5">
                        <div className="text-[13px] font-semibold text-[#1f2937]">{p.name}</div>
                        <div className="text-[11px] text-[#9ca3af]">{p.email}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{p.region}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{p.allocated}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{p.used}</td>
                      <td className="px-3 py-2.5 w-[140px]">
                        <ProgressBar value={p.util} color="#3B5BFF" showPct />
                      </td>
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#374151]">{p.clients}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={p.status === "leave" ? "leave" : "active"} label={p.status === "leave" ? "On Leave" : "Active"} /></td>
                      <td className="px-3 py-2.5 text-xs text-[#6b7280]">{p.joinDate}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* By Region */}
      <DataCard title="Practitioners by Region">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { region: "Northeast", count: 2, color: "#3B5BFF" },
            { region: "Southeast", count: 1, color: "#2DD4BF" },
            { region: "Midwest", count: 1, color: "#10B981" },
            { region: "West Coast", count: 1, color: "#8B5CF6" },
            { region: "Southwest", count: 1, color: "#EF4444" },
            { region: "Pacific NW", count: 1, color: "#3B82F6" },
            { region: "Central", count: 1, color: "#e9c46a" },
          ].map((r) => (
            <div key={r.region} className="bg-white border border-[#e5e7eb] rounded-lg p-3 border-l-[3px]" style={{ borderLeftColor: r.color }}>
              <div className="text-[13px] font-semibold text-[#1f2937]">{r.region}</div>
              <div className="text-xs text-[#6b7280] mt-0.5">{r.count} practitioner{r.count !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
      </DataCard>
    </div>
  )
}
