import DistributorLayout from "@/layouts/DistributorLayout"
import DataCard from "@/components/dashboard/DataCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useDistributorCredits, useDistributorTransactions } from "@/hooks/distributor/useDistributor"
import {
  CREDITS_WRITE,
  DistributorAllocateControl,
  DistributorPurchaseControl,
} from "@/components/credits/CreditsWriteControls"

const FALLBACK_CHART_BARS = [
  { label: "Sep", val: 320, pct: 51.6 },
  { label: "Oct", val: 480, pct: 77.4 },
  { label: "Nov", val: 540, pct: 87.1 },
  { label: "Dec", val: 410, pct: 66.1 },
  { label: "Jan", val: 620, pct: 100 },
  { label: "Feb", val: 530, pct: 85.5 },
]

type TxItem = { date: string; type: string; desc: string; amount: string; amtColor: string; balance: string }

const FALLBACK_TRANSACTIONS: TxItem[] = [
  { date: "Mar 15", type: "Purchase", desc: "Purchase", amount: "+500", amtColor: "text-[#10B981]", balance: "1,800" },
  { date: "Mar 14", type: "Allocation", desc: "Allocation to Dr. Chen", amount: "-200", amtColor: "text-[#EF4444]", balance: "1,300" },
  { date: "Mar 12", type: "Allocation", desc: "Allocation to M. Torres", amount: "-150", amtColor: "text-[#EF4444]", balance: "1,450" },
  { date: "Mar 10", type: "Purchase", desc: "Purchase", amount: "+1,000", amtColor: "text-[#10B981]", balance: "1,600" },
  { date: "Mar 8", type: "Allocation", desc: "Allocation to J. Okafor", amount: "-100", amtColor: "text-[#EF4444]", balance: "600" },
  { date: "Mar 5", type: "Return", desc: "Return from D. Kim", amount: "+50", amtColor: "text-[#10B981]", balance: "700" },
  { date: "Mar 3", type: "Allocation", desc: "Allocation to R. Foster", amount: "-100", amtColor: "text-[#EF4444]", balance: "650" },
  { date: "Mar 1", type: "Purchase", desc: "Purchase", amount: "+500", amtColor: "text-[#10B981]", balance: "750" },
  { date: "Feb 28", type: "Allocation", desc: "Allocation to A. Nguyen", amount: "-200", amtColor: "text-[#EF4444]", balance: "250" },
]

function txColor(type: string) {
  if (type === "Purchase") return "text-[#10B981]"
  if (type === "Allocation") return "text-[#3B82F6]"
  return "text-[#8B5CF6]"
}

export default function DistributorCredits() {
  const { data: creditsData, isLoading: creditsLoading } = useDistributorCredits()
  const { data: txData, isLoading: txLoading, error: txError, refetch: refetchTx } = useDistributorTransactions()

  const cd = creditsData as { chartBars?: typeof FALLBACK_CHART_BARS } | undefined
  const CHART_BARS = cd?.chartBars ?? FALLBACK_CHART_BARS

  const transactions = ((txData as { transactions?: TxItem[] } | undefined)?.transactions ?? FALLBACK_TRANSACTIONS) as TxItem[]

  return (
    <DistributorLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Credit Management</h1>
          <p className="text-[13px] text-[#6b7280]">Purchase, allocate, and track PRISM assessment credits.</p>
        </div>
        {CREDITS_WRITE ? (
          <div className="flex items-center gap-2">
            <DistributorAllocateControl />
            <DistributorPurchaseControl className="bg-[#3B5BFF] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#2A47CC] transition-colors" />
          </div>
        ) : (
          <button className="bg-[#3B5BFF] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#2A47CC] transition-colors">
            Purchase Credits
          </button>
        )}
      </div>

      {/* Credit Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Purchased", value: "10,000", color: "#3B5BFF" },
          { label: "Total Allocated", value: "3,200", color: "#2DD4BF" },
          { label: "Available Pool", value: "1,800", color: "#10B981" },
          { label: "Used by Practitioners", value: "5,000", color: "#3B82F6" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            {creditsLoading ? (
              <Skeleton className="h-9 w-20 mx-auto mb-1" />
            ) : (
              <div className="text-[28px] font-bold" style={{ color: s.color }}>{s.value}</div>
            )}
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Usage Trend */}
      <DataCard title="Credit Usage Trend">
        <div className="flex items-end justify-around h-[180px] pt-2">
          {CHART_BARS.map((b) => (
            <div key={b.label} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-[#4b5563]">{b.val}</span>
              <div className="w-10 rounded-t-md bg-[#3B5BFF] hover:opacity-80 transition-opacity" style={{ height: `${b.pct * 1.8}px` }} />
              <span className="text-[11px] text-[#6b7280] font-medium mt-0.5">{b.label}</span>
            </div>
          ))}
        </div>
      </DataCard>

      {/* Allocations by Practitioner */}
      <DataCard title="Allocations by Practitioner">
        {[
          { name: "Dr. Sarah Chen", allocated: 500, used: 420, pct: 84 },
          { name: "Michael Torres", allocated: 450, used: 385, pct: 86 },
          { name: "Jennifer Okafor", allocated: 400, used: 310, pct: 78 },
          { name: "David Kim", allocated: 350, used: 275, pct: 79 },
          { name: "Rebecca Foster", allocated: 300, used: 240, pct: 80 },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-3 py-2.5 border-b border-[#f3f4f6] last:border-b-0">
            <span className="text-[13px] font-semibold text-[#1f2937] flex-1">{p.name}</span>
            <span className="text-xs text-[#6b7280] w-[100px] text-right">{p.used}/{p.allocated} used</span>
            <div className="w-[100px] h-1.5 rounded-full bg-[#f3f4f6] shrink-0">
              <div className="h-full rounded-full bg-[#3B5BFF]" style={{ width: `${p.pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-[#374151] w-10 text-right">{p.pct}%</span>
          </div>
        ))}
      </DataCard>

      {/* Transaction Log */}
      <DataCard title="Transaction History">
        {txError && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetchTx()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Date", "Type", "Amount", "Balance"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txLoading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={4} className="px-3 py-3">
                      <Skeleton className="h-8 w-full" />
                    </td></tr>
                  ))
                : transactions.map((t, i) => (
                    <tr key={i} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5 text-xs text-[#6b7280]">{t.date}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[13px] font-medium ${txColor(t.type)}`}>{t.desc}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[13px] font-bold ${t.amtColor}`}>{t.amount}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#6b7280]">{t.balance}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </DataCard>
    </DistributorLayout>
  )
}
