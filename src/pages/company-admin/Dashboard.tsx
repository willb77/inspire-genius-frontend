import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next";
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import DashboardFrame from "@/components/dashboard/DashboardFrame"
import DataCard from "@/components/dashboard/DataCard"
import { useAuth } from "@/context/useAuth"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompanyDepartments, useCompanyAnalytics as useCompanyAdminAnalytics } from "@/hooks/company-admin/useCompanyAdmin"
import { useObservabilityRollup } from "@/hooks/company-admin/useObservabilityRollup"
import { ROUTES } from "@/constants/routes"

type Dept = { name: string; count: number; color: string }

// Surface 4 (wiring plan §4) — 8 admin-surface quick-links. Routes
// come from ROUTES.COMPANY_ADMIN so any path rename stays in one place.
const ADMIN_SURFACES: { label: string; path: string }[] = [
  { label: "Users",         path: ROUTES.COMPANY_ADMIN.USERS },
  { label: "Organization",  path: ROUTES.COMPANY_ADMIN.ORGANIZATION },
  { label: "Costs",         path: `${ROUTES.COMPANY_ADMIN.ANALYTICS}?tab=costs` },
  { label: "Culture Docs",  path: ROUTES.COMPANY_ADMIN.CULTURE },
  { label: "Observability", path: ROUTES.COMPANY_ADMIN.OBSERVABILITY },
  { label: "Analytics",     path: ROUTES.COMPANY_ADMIN.ANALYTICS },
  { label: "Bulk Import",   path: ROUTES.COMPANY_ADMIN.BULK_IMPORT },
  { label: "Settings",      path: ROUTES.COMPANY_ADMIN.SETTINGS },
]

export default function CompanyAdminDashboard() {
  const { t } = useTranslation(["admin", "common"]);
  const navigate = useNavigate()
  const { user } = useAuth()
  const orgName = (user as Record<string, unknown> | null)?.organizationName as string ?? "Your Organization"

  const { data: deptsData, isLoading: deptsLoading, error: deptsError, refetch: refetchDepts } = useCompanyDepartments()
  const { data: analyticsData, isLoading: analyticsLoading } = useCompanyAdminAnalytics()
  // Surface 4 — org-wide rollups (coverage, active today, avg sessions per
  // user, monthly LLM cost). Renders 0 until the observability writer is
  // populating the tables; the hook tolerates 404 / missing-table → null.
  const { data: rollupsData, isLoading: rollupsLoading } = useObservabilityRollup()

  const analytics = analyticsData as { totalUsers?: number; activeUsers?: number; avgPrismScore?: number; trainingCompletion?: number } | undefined

  const departments = ((deptsData as { departments?: Dept[] } | undefined)?.departments ?? []) as Dept[]

  const STATS = [
    { label: t("admin:companyAdmin.totalEmployees"), value: String(analytics?.totalUsers ?? 0), icon: "bg-[rgba(59,91,255,0.1)]" },
    { label: t("admin:companyAdmin.activeTeams"), value: String(departments.length), icon: "bg-[rgba(59,91,255,0.1)]" },
    { label: t("admin:companyAdmin.trainingCompletion"), value: analytics?.trainingCompletion != null ? `${analytics.trainingCompletion}%` : "0%", icon: "bg-[rgba(16,185,129,0.1)]" },
    { label: t("admin:companyAdmin.prismAssessed"), value: analytics?.avgPrismScore != null ? `${analytics.avgPrismScore}%` : "0%", icon: "bg-[rgba(16,185,129,0.1)]" },
  ]

  const statsKpi = (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STATS.map((s) => {
        const link =
          s.label === t("admin:companyAdmin.totalEmployees") ? "/company-admin/users"
          : s.label === t("admin:companyAdmin.activeTeams") ? "/company-admin/organization"
          : s.label === t("admin:companyAdmin.trainingCompletion") ? "/company-admin/analytics"
          : s.label === t("admin:companyAdmin.prismAssessed") ? "/company-admin/analytics"
          : undefined
        return (
          <button
            key={s.label}
            onClick={() => link && navigate(link)}
            className="bg-white border border-[#e5e7eb] rounded-lg p-3.5 hover:shadow-md hover:border-[#3B5BFF]/30 transition-all text-left cursor-pointer"
          >
            <div className="text-xs text-[#6b7280]">{s.label}</div>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-16 my-1" />
            ) : (
              <div className="text-2xl font-extrabold text-[#111827] my-1">{s.value}</div>
            )}
          </button>
        )
      })}
    </div>
  )

  const departmentsCard = (
    <DataCard title={t("admin:companyAdmin.departments")}>
      {deptsError && (
        <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
          Failed to load data.
          <button onClick={() => void refetchDepts()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
        </div>
      )}
      {!deptsLoading && departments.length === 0 && !deptsError ? (
        <p className="py-6 text-center text-[13px] text-[#6b7280]">
          No departments yet. Departments will appear here as they are created.
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {deptsLoading
            ? Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
            : departments.map((d) => (
                <div key={d.name} className="bg-white border border-[#e5e7eb] rounded-lg p-3 border-l-[3px] hover:shadow-sm transition-shadow" style={{ borderLeftColor: d.color }}>
                  <div className="text-[13px] font-semibold text-[#1f2937]">{d.name}</div>
                  <div className="text-xs text-[#6b7280] mt-0.5">{d.count} employees</div>
                </div>
              ))
          }
        </div>
      )}
    </DataCard>
  )

  // Surface 4 §4 — Admin Surfaces tile grid (8 quick-links).
  const adminSurfacesCard = (
    <DataCard title="Admin Surfaces">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {ADMIN_SURFACES.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.path)}
            className="bg-white border border-[#e5e7eb] rounded-lg p-3 text-left hover:shadow-md hover:border-[#3B5BFF]/30 transition-all cursor-pointer"
          >
            <div className="text-[13px] font-semibold text-[#1f2937]">{s.label}</div>
            <div className="text-xs text-[#6b7280] mt-0.5">Open →</div>
          </button>
        ))}
      </div>
    </DataCard>
  )

  // Surface 4 §4 — final KPI row: Coverage / Active Today /
  // Avg Sessions per User / Monthly LLM Cost. All 4 read from
  // useObservabilityRollup(); show skeletons while loading and zeros
  // when the writer hasn't populated the observability tables yet.
  const ROLLUP_TILES = [
    {
      label: "Coverage",
      value: rollupsData != null ? `${rollupsData.coverage_percent}%` : "0%",
    },
    {
      label: "Active Today",
      value: rollupsData != null ? String(rollupsData.active_today) : "0",
    },
    {
      label: "Avg Sessions per User",
      value:
        rollupsData != null
          ? rollupsData.avg_sessions_per_user.toFixed(2)
          : "0.00",
    },
    {
      label: "Monthly LLM Cost",
      value:
        rollupsData != null
          ? `$${rollupsData.monthly_llm_cost_usd.toFixed(2)}`
          : "$0.00",
    },
  ]

  const rollupsKpiRow = (
    <DataCard title="Org Rollups">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLLUP_TILES.map((tile) => (
          <div
            key={tile.label}
            className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-3.5"
          >
            <div className="text-xs text-[#6b7280]">{tile.label}</div>
            {rollupsLoading ? (
              <Skeleton className="h-8 w-20 my-1" />
            ) : (
              <div className="text-2xl font-extrabold text-[#111827] my-1">
                {tile.value}
              </div>
            )}
          </div>
        ))}
      </div>
    </DataCard>
  )

  const primary = (
    <>
      {departmentsCard}
      {adminSurfacesCard}
      {rollupsKpiRow}
    </>
  )

  return (
    <CompanyAdminLayout>
      <DashboardFrame
        title={`${orgName} ${t("admin:companyAdmin.dashboard")}`}
        subtitle="Manage your organization's teams, training, and PRISM assessments across all departments."
        kpis={statsKpi}
        primary={primary}
      />
    </CompanyAdminLayout>
  )
}
