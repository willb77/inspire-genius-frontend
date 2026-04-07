import DistributorLayout from "@/layouts/DistributorLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import ProgressBar from "@/components/dashboard/ProgressBar"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useDistributorTerritory } from "@/hooks/distributor/useDistributor"

type Region = {
  name: string
  practitionerCount: number
  coveragePct: number
  allocatedCredits: number
  utilizationPct: number
  status: string
}

const FALLBACK_REGIONS: Region[] = [
  { name: "Northeast", practitionerCount: 12, coveragePct: 85, allocatedCredits: 2400, utilizationPct: 82, status: "Active" },
  { name: "Southeast", practitionerCount: 8, coveragePct: 72, allocatedCredits: 1800, utilizationPct: 78, status: "Active" },
  { name: "Midwest", practitionerCount: 6, coveragePct: 60, allocatedCredits: 1200, utilizationPct: 65, status: "Active" },
  { name: "West Coast", practitionerCount: 10, coveragePct: 88, allocatedCredits: 2200, utilizationPct: 86, status: "Active" },
  { name: "Southwest", practitionerCount: 5, coveragePct: 55, allocatedCredits: 1000, utilizationPct: 70, status: "Active" },
  { name: "Pacific NW", practitionerCount: 4, coveragePct: 45, allocatedCredits: 800, utilizationPct: 60, status: "Active" },
  { name: "Central", practitionerCount: 3, coveragePct: 38, allocatedCredits: 600, utilizationPct: 55, status: "Active" },
  { name: "Mountain", practitionerCount: 2, coveragePct: 25, allocatedCredits: 400, utilizationPct: 40, status: "pending" },
]

const coverageColor = (pct: number) => pct >= 75 ? "#10B981" : pct >= 50 ? "#3B82F6" : "#D97706"

export default function DistributorTerritory() {
  const { data: territoryData, isLoading, error, refetch } = useDistributorTerritory()
  const regions = ((territoryData as { regions?: Region[] } | undefined)?.regions ?? FALLBACK_REGIONS) as Region[]

  const totalPractitioners = regions.reduce((s, r) => s + r.practitionerCount, 0)
  const avgCoverage = Math.round(regions.reduce((s, r) => s + r.coveragePct, 0) / regions.length)
  const totalCredits = regions.reduce((s, r) => s + r.allocatedCredits, 0)

  const STATS = [
    { label: "Total Regions", value: String(regions.length), color: "#3B5BFF" },
    { label: "Active Practitioners", value: String(totalPractitioners), color: "#0D9488" },
    { label: "Avg Coverage", value: `${avgCoverage}%`, color: "#10B981" },
    { label: "Allocated Credits", value: totalCredits.toLocaleString(), color: "#8B5CF6" },
  ]

  return (
    <DistributorLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Territory Management</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Manage your geographic regions and credit distribution across territories.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            {isLoading ? <Skeleton className="h-7 w-12 mx-auto mb-1" /> : <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>}
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <DataCard title="Territory Grid" badge={regions.length}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load territory data.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-[#6b7280] border-b border-[#e5e7eb]">
                  <th className="pb-2 font-medium">Region</th>
                  <th className="pb-2 font-medium">Practitioners</th>
                  <th className="pb-2 font-medium w-[140px]">Coverage</th>
                  <th className="pb-2 font-medium">Credits</th>
                  <th className="pb-2 font-medium w-[140px]">Utilization</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((r) => (
                  <tr key={r.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                    <td className="py-2.5 font-medium text-[#111827]">{r.name}</td>
                    <td className="py-2.5 text-[#6b7280]">{r.practitionerCount}</td>
                    <td className="py-2.5"><ProgressBar value={r.coveragePct} color={coverageColor(r.coveragePct)} /></td>
                    <td className="py-2.5 text-[#6b7280]">{r.allocatedCredits.toLocaleString()}</td>
                    <td className="py-2.5"><ProgressBar value={r.utilizationPct} color={coverageColor(r.utilizationPct)} /></td>
                    <td className="py-2.5"><StatusBadge status={r.status.toLowerCase()} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </DistributorLayout>
  )
}
