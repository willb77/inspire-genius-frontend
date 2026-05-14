import DistributorLayout from "@/layouts/DistributorLayout"
import DataCard from "@/components/dashboard/DataCard"
import {
  EngagementChart,
  UtilizationAreaChart,
} from "@/components/analytics/charts"
import ProgressBar from "@/components/dashboard/ProgressBar"
import { Skeleton } from "@/components/ui/skeleton"
import { useDistributorAnalytics } from "@/hooks/analytics/useAnalytics"

const FALLBACK_CREDITS_BY_REGION = [
  { region: "Northeast", credits: 890 }, { region: "Southeast", credits: 770 }, { region: "Midwest", credits: 620 },
  { region: "West Coast", credits: 550 }, { region: "Southwest", credits: 480 }, { region: "Pacific NW", credits: 640 },
]
const FALLBACK_PRAC_UTIL = [
  { name: "Dr. Chen", util: 84 }, { name: "M. Torres", util: 86 }, { name: "J. Okafor", util: 78 },
  { name: "D. Kim", util: 79 }, { name: "R. Foster", util: 80 }, { name: "A. Nguyen", util: 80 },
]
const FALLBACK_CREDIT_FLOW = [
  { month: "Oct", purchased: 450, allocated: 380, used: 320 }, { month: "Nov", purchased: 520, allocated: 440, used: 360 },
  { month: "Dec", purchased: 380, allocated: 350, used: 290 }, { month: "Jan", purchased: 600, allocated: 520, used: 420 },
  { month: "Feb", purchased: 550, allocated: 480, used: 385 }, { month: "Mar", purchased: 500, allocated: 420, used: 350 },
]

export default function DistributorAnalytics() {
  const { data: analyticsData, isLoading, error, refetch } = useDistributorAnalytics()

  const ad = analyticsData as {
    creditsByRegion?: typeof FALLBACK_CREDITS_BY_REGION;
    pracUtil?: typeof FALLBACK_PRAC_UTIL;
    creditFlow?: typeof FALLBACK_CREDIT_FLOW;
  } | undefined

  const CREDITS_BY_REGION = ad?.creditsByRegion ?? FALLBACK_CREDITS_BY_REGION
  const PRAC_UTIL = ad?.pracUtil ?? FALLBACK_PRAC_UTIL
  const CREDIT_FLOW = ad?.creditFlow ?? FALLBACK_CREDIT_FLOW

  const errorString = error ? "Failed to load analytics data." : undefined

  return (
    <DistributorLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Territory Analytics</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Territory performance, practitioner utilization, and credit flow.</p>

      {error && (
        <div className="flex items-center gap-2 py-2 mb-4 text-[13px] text-[#EF4444]">
          Failed to load analytics data.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EngagementChart
          title="Credits Used by Region"
          data={CREDITS_BY_REGION}
          xKey="region"
          valueKey="credits"
          loading={isLoading}
          error={errorString}
          height={220}
        />

        <DataCard title="Practitioner Utilization" className="!mt-0">
          {isLoading
            ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)
            : (
                <div className="space-y-3">
                  {PRAC_UTIL.map((p) => (
                    <ProgressBar key={p.name} label={p.name} value={p.util} color="#3B5BFF" />
                  ))}
                </div>
              )
          }
        </DataCard>
      </div>

      <UtilizationAreaChart
        title="Credit Flow (6 months)"
        data={CREDIT_FLOW}
        xKey="month"
        series={[
          { key: "purchased", label: "Purchased", color: "#3B5BFF" },
          { key: "allocated", label: "Allocated", color: "#2DD4BF" },
          { key: "used", label: "Used", color: "#8B5CF6" },
        ]}
        loading={isLoading}
        error={errorString}
        height={240}
      />
    </DistributorLayout>
  )
}
