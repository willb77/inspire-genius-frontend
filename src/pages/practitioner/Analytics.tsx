import PractitionerLayout from "@/layouts/PractitionerLayout"
import {
  EngagementChart,
  CostTrendChart,
  GoalsBreakdownChart,
  type GoalsBreakdownDatum,
} from "@/components/analytics/charts"
import { usePractitionerAnalytics } from "@/hooks/analytics/useAnalytics"

const FALLBACK_CLIENTS = [
  { client: "Sophie L.", sessions: 20 }, { client: "Emma W.", sessions: 18 }, { client: "James M.", sessions: 15 },
  { client: "Lisa F.", sessions: 14 }, { client: "Marcus C.", sessions: 12 }, { client: "Aisha P.", sessions: 8 },
]
const FALLBACK_WEEKLY = Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, sessions: Math.floor(Math.random() * 5) + 5 }))
const FALLBACK_PRISM_RATES: GoalsBreakdownDatum[] = [{ name: "Completed", value: 18 }, { name: "In Progress", value: 4 }, { name: "Not Started", value: 2 }]
const PRISM_COLORS = ["#10B981", "#ECC94B", "#e5e7eb"]

export default function PractitionerAnalytics() {
  const { data: analyticsData, isLoading, error, refetch } = usePractitionerAnalytics()

  const ad = analyticsData as {
    clients?: typeof FALLBACK_CLIENTS;
    weekly?: typeof FALLBACK_WEEKLY;
    prismRates?: typeof FALLBACK_PRISM_RATES;
  } | undefined

  const CLIENTS = ad?.clients ?? FALLBACK_CLIENTS
  const WEEKLY = ad?.weekly ?? FALLBACK_WEEKLY
  const PRISM_RATES = ad?.prismRates ?? FALLBACK_PRISM_RATES

  const errorString = error ? "Failed to load analytics data." : undefined

  return (
    <PractitionerLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Practice Analytics</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Client engagement, session frequency, and PRISM completion metrics.</p>

      {error && (
        <div className="flex items-center gap-2 py-2 mb-4 text-[13px] text-[#EF4444]">
          Failed to load analytics data.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EngagementChart
          title="Client Engagement (Top 6)"
          data={CLIENTS}
          xKey="client"
          valueKey="sessions"
          loading={isLoading}
          error={errorString}
          height={200}
        />

        <CostTrendChart
          title="Weekly Session Frequency"
          data={WEEKLY}
          xKey="week"
          primary={{ key: "sessions", label: "Sessions", color: "#2DD4BF" }}
          loading={isLoading}
          error={errorString}
          height={200}
        />

        <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-[1fr_minmax(200px,_240px)] gap-5 items-start">
          <GoalsBreakdownChart
            title="PRISM Completion Rates"
            data={PRISM_RATES}
            colors={PRISM_COLORS}
            loading={isLoading}
            error={errorString}
            height={220}
          />
          {!isLoading && !error && (
            <div className="space-y-2 self-center">
              {PRISM_RATES.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PRISM_COLORS[i] }} />
                  <span className="text-[13px] text-[#374151]">{r.name}: <strong>{r.value}</strong> clients</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PractitionerLayout>
  )
}
