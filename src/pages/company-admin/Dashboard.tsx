import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next";
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import DashboardFrame from "@/components/dashboard/DashboardFrame"
import DataCard from "@/components/dashboard/DataCard"
import { useAuth } from "@/context/useAuth"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompanyDepartments, useCompanyAnalytics as useCompanyAdminAnalytics } from "@/hooks/company-admin/useCompanyAdmin"

type Dept = { name: string; count: number; color: string }

export default function CompanyAdminDashboard() {
  const { t } = useTranslation(["admin", "common"]);
  const navigate = useNavigate()
  const { user } = useAuth()
  const orgName = (user as Record<string, unknown> | null)?.organizationName as string ?? "Your Organization"

  const { data: deptsData, isLoading: deptsLoading, error: deptsError, refetch: refetchDepts } = useCompanyDepartments()
  const { data: analyticsData, isLoading: analyticsLoading } = useCompanyAdminAnalytics()

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

  return (
    <CompanyAdminLayout>
      <DashboardFrame
        title={`${orgName} ${t("admin:companyAdmin.dashboard")}`}
        subtitle="Manage your organization's teams, training, and PRISM assessments across all departments."
        kpis={statsKpi}
        primary={departmentsCard}
      />
    </CompanyAdminLayout>
  )
}
