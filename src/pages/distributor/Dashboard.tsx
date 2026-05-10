import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import DistributorLayout from "@/layouts/DistributorLayout"
import WelcomeBanner from "@/components/dashboard/WelcomeBanner"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { useDistributorPractitioners, useDistributorCredits, useDistributorTransactions } from "@/hooks/distributor/useDistributor"

type NetworkEntry = { name: string; region: string; alloc: number; used: number; util: number; status: string }
type Transaction = { date: string; type: string; amount: string; amountClass: string; balance: string }

const FALLBACK_CHART_BARS = [
  { label: "Sep", val: 320, pct: 51.6 },
  { label: "Oct", val: 480, pct: 77.4 },
  { label: "Nov", val: 540, pct: 87.1 },
  { label: "Dec", val: 410, pct: 66.1 },
  { label: "Jan", val: 620, pct: 100 },
  { label: "Feb", val: 530, pct: 85.5 },
]

const FALLBACK_TOP_PRACTITIONERS = [
  { rank: 1, initials: "SC", name: "Dr. Sarah Chen", credits: 420, pct: 100, bg: "linear-gradient(135deg,#3B5BFF,#8B5CF6)" },
  { rank: 2, initials: "MT", name: "Michael Torres", credits: 385, pct: 91.7, bg: "linear-gradient(135deg,#2DD4BF,#10B981)" },
  { rank: 3, initials: "JO", name: "Jennifer Okafor", credits: 310, pct: 73.8, bg: "linear-gradient(135deg,#ECC94B,#e9c46a)" },
  { rank: 4, initials: "DK", name: "David Kim", credits: 275, pct: 65.5, bg: "linear-gradient(135deg,#E53E3E,#EF4444)" },
  { rank: 5, initials: "RF", name: "Rebecca Foster", credits: 240, pct: 57.1, bg: "linear-gradient(135deg,#3182CE,#3B82F6)" },
]

const FALLBACK_NETWORK: NetworkEntry[] = [
  { name: "Dr. Sarah Chen", region: "Northeast", alloc: 500, used: 420, util: 84, status: "Active" },
  { name: "Michael Torres", region: "Southeast", alloc: 450, used: 385, util: 86, status: "Active" },
  { name: "Jennifer Okafor", region: "Midwest", alloc: 400, used: 310, util: 78, status: "Active" },
  { name: "David Kim", region: "West Coast", alloc: 350, used: 275, util: 79, status: "Active" },
  { name: "Rebecca Foster", region: "Southwest", alloc: 300, used: 240, util: 80, status: "Active" },
  { name: "Alex Nguyen", region: "Pacific NW", alloc: 400, used: 320, util: 80, status: "Active" },
  { name: "Maria Santos", region: "Central", alloc: 350, used: 280, util: 80, status: "On Leave" },
  { name: "John Parker", region: "Northeast", alloc: 450, used: 370, util: 82, status: "Active" },
]

const FALLBACK_TRANSACTIONS: Transaction[] = [
  { date: "Mar 15", type: "Purchase", amount: "+500", amountClass: "text-[#10B981]", balance: "Balance: 1,800" },
  { date: "Mar 14", type: "Allocation to Dr. Chen", amount: "-200", amountClass: "text-[#EF4444]", balance: "Balance: 1,300" },
  { date: "Mar 12", type: "Allocation to M. Torres", amount: "-150", amountClass: "text-[#EF4444]", balance: "Balance: 1,450" },
  { date: "Mar 10", type: "Purchase", amount: "+1,000", amountClass: "text-[#10B981]", balance: "Balance: 1,600" },
  { date: "Mar 8", type: "Allocation to J. Okafor", amount: "-100", amountClass: "text-[#EF4444]", balance: "Balance: 600" },
  { date: "Mar 5", type: "Return from D. Kim", amount: "+50", amountClass: "text-[#10B981]", balance: "Balance: 700" },
  { date: "Mar 3", type: "Allocation to R. Foster", amount: "-100", amountClass: "text-[#EF4444]", balance: "Balance: 650" },
  { date: "Mar 1", type: "Purchase", amount: "+500", amountClass: "text-[#10B981]", balance: "Balance: 750" },
  { date: "Feb 28", type: "Allocation to A. Nguyen", amount: "-200", amountClass: "text-[#EF4444]", balance: "Balance: 250" },
]

function txTypeColor(type: string) {
  if (type.startsWith("Purchase")) return "text-[#10B981]"
  if (type.startsWith("Allocation")) return "text-[#3B82F6]"
  if (type.startsWith("Return")) return "text-[#8B5CF6]"
  return "text-[#374151]"
}

export default function DistributorDashboard() {
  const { t } = useTranslation(["admin", "common"]);

  const { data: practsData, isLoading: practsLoading, error: practsError, refetch: refetchPracts } = useDistributorPractitioners()
  const { data: creditsData } = useDistributorCredits()
  const { data: txData, isLoading: txLoading, error: txError, refetch: refetchTx } = useDistributorTransactions()

  const network = ((practsData as { practitioners?: NetworkEntry[] } | undefined)?.practitioners ?? FALLBACK_NETWORK) as NetworkEntry[]
  const transactions = ((txData as { transactions?: Transaction[] } | undefined)?.transactions ?? FALLBACK_TRANSACTIONS) as Transaction[]

  const cd = creditsData as { chartBars?: typeof FALLBACK_CHART_BARS; topPractitioners?: typeof FALLBACK_TOP_PRACTITIONERS } | undefined
  const CHART_BARS = cd?.chartBars ?? FALLBACK_CHART_BARS
  const TOP_PRACTITIONERS = cd?.topPractitioners ?? FALLBACK_TOP_PRACTITIONERS

  const CREDIT_STATS = [
    { label: t("admin:distributor.totalPurchased"), value: "10,000", iconClass: "bg-[rgba(59,91,255,0.1)] text-[#3B5BFF]" },
    { label: t("admin:distributor.totalAllocated"), value: "3,200", iconClass: "bg-[rgba(45,212,191,0.12)] text-[#0D9488]" },
    { label: t("admin:distributor.availablePool"), value: "1,800", iconClass: "bg-[rgba(16,185,129,0.1)] text-[#10B981]" },
    { label: t("admin:distributor.usedByPractitioners"), value: "5,000", iconClass: "bg-[rgba(59,130,246,0.1)] text-[#3B82F6]" },
  ]

  return (
    <DistributorLayout>
      <WelcomeBanner
        title={t("admin:distributor.distributor")}
        subtitle="Welcome back, PRISM Partners Inc. Manage your practitioner network and assessment credit portfolio."
      >
        <div className="flex gap-2.5">
          <button className="bg-white/20 text-white rounded-md px-3.5 py-[7px] text-xs font-semibold hover:bg-white/30 transition-colors">{t("admin:distributor.purchaseCredits")}</button>
          <button className="bg-transparent text-white border border-white/30 rounded-md px-3.5 py-[7px] text-xs font-semibold hover:bg-white/10 transition-colors">{t("admin:distributor.viewReports")}</button>
        </div>
      </WelcomeBanner>

      {/* Credit Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {CREDIT_STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${s.iconClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
            </div>
            <div>
              <div className="text-[11px] text-[#6b7280]">{s.label}</div>
              <div className="text-xl font-extrabold text-[#111827]">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Credit Usage Trend */}
      <DataCard title={t("admin:distributor.creditUsageTrend")}>
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

      {/* Top Practitioners — compact summary linking to Network */}
      <DataCard title={t("admin:distributor.topPractitioners")}>
        <Link
          to="/distributor/network?tab=practitioners"
          className="flex items-center justify-between gap-4 rounded-lg border border-[#e5e7eb] bg-white px-4 py-3 hover:border-[#3B5BFF] hover:bg-[#f8faff] transition-colors group"
          data-testid="top-practitioners-summary-link"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex -space-x-2 shrink-0">
              {TOP_PRACTITIONERS.slice(0, 3).map((p) => (
                <div key={p.name} className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px] ring-2 ring-white" style={{ background: p.bg }}>{p.initials}</div>
              ))}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#1f2937] truncate">
                {TOP_PRACTITIONERS[0]?.name} leads with {TOP_PRACTITIONERS[0]?.credits} {t("admin:distributor.creditsUsed")}
              </div>
              <div className="text-[11px] text-[#6b7280]">View full roster, allocation, and territory coverage</div>
            </div>
          </div>
          <span className="text-[12px] font-semibold text-[#3B5BFF] flex items-center gap-1 shrink-0 group-hover:gap-1.5 transition-all">
            View Network
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </DataCard>

      {/* Practitioner Network */}
      <DataCard title={t("admin:distributor.practitionerNetwork")}>
        {practsError && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetchPracts()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Name", "Region", "Allocated", "Used", "Utilization", "Status"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {practsLoading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-3 py-3">
                      <Skeleton className="h-8 w-full" />
                    </td></tr>
                  ))
                : network.map((n) => (
                    <tr key={n.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{n.name}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{n.region}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{n.alloc}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{n.used}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-[60px] h-[5px] rounded-full bg-[#f3f4f6]">
                            <div className="h-full rounded-full bg-[#3B5BFF]" style={{ width: `${n.util}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-[#374151]">{n.util}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={n.status === "On Leave" ? "leave" : "active"} label={n.status} />
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Recent Transactions */}
      <DataCard title={t("admin:distributor.recentTransactions")}>
        {txError && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetchTx()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        {txLoading
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
          : transactions.map((t, i) => (
              <div key={i} className="flex items-center gap-3.5 py-2.5 border-b border-[#f3f4f6] last:border-b-0 text-[13px]">
                <span className="w-[70px] text-[#6b7280] text-xs shrink-0">{t.date}</span>
                <span className={`flex-1 font-medium ${txTypeColor(t.type)}`}>{t.type}</span>
                <span className={`w-[70px] text-right font-bold ${t.amountClass}`}>{t.amount}</span>
                <span className="w-[110px] text-right text-[#6b7280] text-xs">{t.balance}</span>
              </div>
            ))
        }
      </DataCard>
    </DistributorLayout>
  )
}
