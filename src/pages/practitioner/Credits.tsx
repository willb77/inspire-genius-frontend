import PractitionerLayout from "@/layouts/PractitionerLayout"
import DataCard from "@/components/dashboard/DataCard"
import { Skeleton } from "@/components/ui/skeleton"
import { usePractitionerCredits } from "@/hooks/practitioner/usePractitioner"
import { CREDITS_WRITE, PractitionerUseControl } from "@/components/credits/CreditsWriteControls"

const FALLBACK_MONTHLY = [
  { month: "Oct", used: 6, h: 48 },
  { month: "Nov", used: 8, h: 64 },
  { month: "Dec", used: 5, h: 40 },
  { month: "Jan", used: 10, h: 80 },
  { month: "Feb", used: 9, h: 72 },
  { month: "Mar", used: 7, h: 56 },
]

const FALLBACK_HISTORY = [
  { date: "Mar 15", type: "Used", client: "Marcus Chen", amount: -1, balance: 38 },
  { date: "Mar 13", type: "Used", client: "James Morrison", amount: -1, balance: 39 },
  { date: "Mar 10", type: "Purchased", client: null, amount: 20, balance: 40 },
  { date: "Mar 8", type: "Used", client: "Lisa Fernandez", amount: -1, balance: 20 },
  { date: "Mar 5", type: "Used", client: "Sophie Laurent", amount: -1, balance: 21 },
  { date: "Mar 3", type: "Used", client: "Emma Watson", amount: -1, balance: 22 },
  { date: "Mar 1", type: "Purchased", client: null, amount: 10, balance: 23 },
]

type CreditSummary = { remaining?: number; totalPurchased?: number; usedThisMonth?: number; avgMonthlyUsage?: number }

export default function PractitionerCredits() {
  const { data: creditsData, isLoading, error, refetch } = usePractitionerCredits()

  const summary = creditsData as CreditSummary | undefined

  const creditStats = [
    { label: "Credits Remaining", value: String(summary?.remaining ?? 38), color: "#10B981" },
    { label: "Total Purchased", value: String(summary?.totalPurchased ?? 100), color: "#3B5BFF" },
    { label: "Used This Month", value: String(summary?.usedThisMonth ?? 7), color: "#8B5CF6" },
    { label: "Avg Monthly Usage", value: String(summary?.avgMonthlyUsage ?? 7.5), color: "#2DD4BF" },
  ]

  return (
    <PractitionerLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Credit Management</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Track and manage your PRISM assessment credits.</p>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {creditStats.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-9 w-16 mx-auto mb-1" />
            ) : (
              <div className="text-[28px] font-bold" style={{ color: s.color }}>{s.value}</div>
            )}
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Usage Chart */}
      <DataCard title="Monthly Credit Usage">
        <div className="flex items-end gap-4 h-[140px] pt-2.5">
          {FALLBACK_MONTHLY.map((c) => (
            <div key={c.month} className="flex flex-col items-center flex-1">
              <span className="text-[11px] font-bold text-[#374151] mb-1">{c.used}</span>
              <div className="w-8 rounded-t-md bg-[#3B5BFF] hover:opacity-80 transition-opacity" style={{ height: c.h }} />
              <span className="text-[11px] text-[#6b7280] mt-2 font-medium">{c.month}</span>
            </div>
          ))}
        </div>
      </DataCard>

      {/* Transaction History */}
      <DataCard title="Credit History">
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Date", "Type", "Client", "Amount", "Balance"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-3 py-3">
                      <Skeleton className="h-8 w-full" />
                    </td></tr>
                  ))
                : FALLBACK_HISTORY.map((h, i) => (
                    <tr key={i} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5 text-xs text-[#6b7280]">{h.date}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[13px] font-medium ${h.type === "Purchased" ? "text-[#10B981]" : "text-[#3B82F6]"}`}>{h.type}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{h.client ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[13px] font-bold ${h.amount > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                          {h.amount > 0 ? `+${h.amount}` : h.amount}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{h.balance}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Purchase Credits */}
      <DataCard title="Purchase Credits">
        <div className="flex items-center gap-4">
          <p className="text-[13px] text-[#6b7280] flex-1">Need more PRISM assessment credits? Contact your distributor or purchase directly.</p>
          {CREDITS_WRITE ? (
            <PractitionerUseControl />
          ) : (
            <button className="bg-[#3B5BFF] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#2A47CC] transition-colors shrink-0">
              Request Credits
            </button>
          )}
        </div>
      </DataCard>
    </PractitionerLayout>
  )
}
