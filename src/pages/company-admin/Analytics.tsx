import { useCallback, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import { CompanyAdminHub } from "./house/CompanyAdminHub"
import { ANALYTICS_HUB } from "./house/hubs"
import {
  EngagementChart,
  GoalsBreakdownChart,
  CostTrendChart,
  UtilizationAreaChart,
  type GoalsBreakdownDatum,
} from "@/components/analytics/charts"
import { Button } from "@/components/ui/button"
import { FileJson, FileSpreadsheet, Info } from "lucide-react"
import { toast } from "sonner"
import { useCompanyAnalytics as useCompanyAnalyticsHook } from "@/hooks/analytics/useAnalytics"

const FALLBACK_DEPT = [
  { dept: "Engineering", engagement: 88, training: 82, prism: 84 }, { dept: "Marketing", engagement: 76, training: 76, prism: 79 },
  { dept: "Sales", engagement: 92, training: 91, prism: 86 }, { dept: "HR", engagement: 85, training: 88, prism: 81 },
  { dept: "Product", engagement: 80, training: 73, prism: 83 }, { dept: "Design", engagement: 78, training: 85, prism: 88 },
]
const FALLBACK_ENGAGEMENT = Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, pct: 70 + Math.floor(Math.random() * 20) }))
const FALLBACK_LICENSE: GoalsBreakdownDatum[] = [{ name: "Active", value: 192 }, { name: "Unused", value: 55 }, { name: "Pending", value: 12 }]
const FALLBACK_COST_TREND = [{ month: "Oct", cost: 410 }, { month: "Nov", cost: 395 }, { month: "Dec", cost: 420 }, { month: "Jan", cost: 445 }, { month: "Feb", cost: 430 }, { month: "Mar", cost: 433 }]
const LICENSE_COLORS = ["#10B981", "#e5e7eb", "#3B5BFF"]

function download(content: string, name: string, type: string) {
  const b = new Blob([content], { type }); const u = URL.createObjectURL(b)
  const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u)
}

/** RM-5: with the company-admin house switch on, this page is the Analytics tab of the Analytics hub. */
function AnalyticsHubFrame({ children }: { children: ReactNode }) {
  return (
    <CompanyAdminHub hub={ANALYTICS_HUB} active="analytics">
      {children}
    </CompanyAdminHub>
  )
}

export default function CompanyAdminAnalytics() {
  const { t } = useTranslation("companyAdminPages")
  // House style (area `company-admin`): display only. Off, the page renders unchanged.
  const house = isHouseStyleOn("company-admin")
  const Frame = house ? AnalyticsHubFrame : CompanyAdminLayout
  const { data: analyticsData, isLoading, error, refetch } = useCompanyAnalyticsHook()

  const ad = analyticsData as {
    dept?: typeof FALLBACK_DEPT;
    engagement?: typeof FALLBACK_ENGAGEMENT;
    license?: typeof FALLBACK_LICENSE;
    costTrend?: typeof FALLBACK_COST_TREND;
  } | undefined

  const DEPT = ad?.dept ?? FALLBACK_DEPT
  const ENGAGEMENT = ad?.engagement ?? FALLBACK_ENGAGEMENT
  const LICENSE = ad?.license ?? FALLBACK_LICENSE
  const COST_TREND = ad?.costTrend ?? FALLBACK_COST_TREND

  const exportCSV = useCallback(() => { download("dept,engagement,training,prism\n" + DEPT.map((d) => `${d.dept},${d.engagement},${d.training},${d.prism}`).join("\n"), "company-analytics.csv", "text/csv"); toast.success(t("analyticsExportedCsv", { defaultValue: "Exported CSV" })) }, [DEPT, t])
  const exportJSON = useCallback(() => { download(JSON.stringify(DEPT, null, 2), "company-analytics.json", "application/json"); toast.success(t("analyticsExportedJson", { defaultValue: "Exported JSON" })) }, [DEPT, t])

  const errorString = error ? t("analyticsLoadFailed", { defaultValue: "Failed to load analytics data." }) : undefined

  return (
    <Frame>
      {/* Placeholder Data Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[13px] text-amber-800">
          {t("analyticsPlaceholderNotice", { defaultValue: "Analytics data is currently placeholder. Live metrics and reporting are in progress." })}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 mb-4 text-[13px] text-[#EF4444]">
          {t("analyticsLoadFailed", { defaultValue: "Failed to load analytics data." })}
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">{t("retry", { defaultValue: "Retry" })}</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        {house ? (
          // RM-5: inside the Analytics hub, the hub header names the page.
          <span />
        ) : (
        <div>
          <h1 className="text-xl font-bold text-[#111827]">{t("analyticsTitle", { defaultValue: "Company Analytics" })}</h1>
          <p className="text-[13px] text-[#6b7280]">{t("analyticsSubtitle", { defaultValue: "Organization-level engagement, training, and cost metrics." })}</p>
        </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={exportJSON}><FileJson className="w-4 h-4" />JSON</Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}><FileSpreadsheet className="w-4 h-4" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EngagementChart
          title={t("analyticsDeptComparison", { defaultValue: "Department Comparison" })}
          data={DEPT}
          xKey="dept"
          valueKey="engagement"
          loading={isLoading}
          error={errorString}
          height={220}
        />

        <UtilizationAreaChart
          title={t("analyticsEngagementTrend", { defaultValue: "Company Engagement Trend" })}
          data={ENGAGEMENT}
          xKey="month"
          series={[{ key: "pct", label: t("analyticsEngagementPct", { defaultValue: "Engagement %" }), color: "#3B5BFF" }]}
          loading={isLoading}
          error={errorString}
          height={220}
        />

        <GoalsBreakdownChart
          title={t("analyticsLicenseUtilization", { defaultValue: "License Utilization" })}
          data={LICENSE}
          colors={LICENSE_COLORS}
          loading={isLoading}
          error={errorString}
          height={200}
        />

        <CostTrendChart
          title={t("analyticsCostPerUserTrend", { defaultValue: "Cost per User Trend" })}
          data={COST_TREND}
          xKey="month"
          primary={{ key: "cost", label: t("analyticsPerUser", { defaultValue: "$/user" }), color: "#EF4444" }}
          loading={isLoading}
          error={errorString}
          height={200}
        />
      </div>
    </Frame>
  )
}
