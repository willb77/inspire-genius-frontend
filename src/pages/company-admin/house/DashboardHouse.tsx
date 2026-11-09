import { Link } from "react-router-dom"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompanyDepartments, useCompanyAnalytics } from "@/hooks/company-admin/useCompanyAdmin"
import { useObservabilityRollup } from "@/hooks/company-admin/useObservabilityRollup"
import { ROUTES } from "@/constants/routes"
import { ValidationReviewQueue } from "@/components/job-blueprint/validation/ValidationReviewQueue"

const DASH = "—"

/**
 * Shortcuts on the house-style dashboard: the classic "Admin Surfaces" tiles
 * without Costs and Settings (neither shows anything real yet), and with
 * Users called People to match its page.
 */
const COMPANY_ADMIN_SHORTCUTS: { label: string; path: string }[] = [
  { label: "People", path: ROUTES.COMPANY_ADMIN.USERS },
  { label: "Organization", path: ROUTES.COMPANY_ADMIN.ORGANIZATION },
  { label: "Culture Docs", path: ROUTES.COMPANY_ADMIN.CULTURE },
  { label: "Observability", path: ROUTES.COMPANY_ADMIN.OBSERVABILITY },
  { label: "Analytics", path: ROUTES.COMPANY_ADMIN.ANALYTICS },
  { label: "Bulk Import", path: ROUTES.COMPANY_ADMIN.BULK_IMPORT },
  { label: "Help & Support", path: ROUTES.HELP },
]

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

/** A number or "—"; never a 0 standing in for "no data". */
function show(v: number | null, fmt: (n: number) => string = String): string {
  return v == null ? DASH : fmt(v)
}

type Analytics = Record<string, unknown> | undefined

/** The server sends snake_case; older mocks used camelCase. Read either. */
function pick(a: Analytics, snake: string, camel: string): number | null {
  return num(a?.[snake]) ?? num(a?.[camel])
}

type Dept = { id?: string; name?: string | null; headcount?: number | null; count?: number | null }

/**
 * House-style company-admin dashboard (area `company-admin`). The same three
 * reads as the classic dashboard. Missing figures show "—", not 0.
 */
export default function DashboardHouse() {
  const depts = useCompanyDepartments()
  const analytics = useCompanyAnalytics()
  const rollups = useObservabilityRollup()

  const a = analytics.data as Analytics
  const deptRows = (depts.data as { departments?: unknown } | undefined)?.departments
  const departments = Array.isArray(deptRows) ? (deptRows as Dept[]) : null

  const stats = [
    { label: "People", value: show(pick(a, "total_users", "totalUsers")), to: ROUTES.COMPANY_ADMIN.USERS },
    { label: "Departments", value: show(departments ? departments.length : null), to: ROUTES.COMPANY_ADMIN.ORGANIZATION },
    {
      label: "Training completed",
      value: show(pick(a, "training_completion", "trainingCompletion"), (n) => `${n}%`),
      to: ROUTES.COMPANY_ADMIN.ANALYTICS,
    },
    {
      label: "PRISM assessed",
      value: show(pick(a, "avg_prism_score", "avgPrismScore"), (n) => `${n}%`),
      to: ROUTES.COMPANY_ADMIN.ANALYTICS,
    },
  ]

  const r = rollups.data ?? null
  const rollupTiles = [
    { label: "Coverage", value: show(num(r?.coverage_percent), (n) => `${n}%`) },
    { label: "Active today", value: show(num(r?.active_today)) },
    { label: "Average sessions per person", value: show(num(r?.avg_sessions_per_user), (n) => n.toFixed(2)) },
    { label: "AI usage cost this month", value: show(num(r?.monthly_llm_cost_usd), (n) => `$${n.toFixed(2)}`) },
  ]

  let deptBody: React.ReactNode
  if (depts.isLoading) deptBody = <PageState kind="loading" rows={2} />
  else if (depts.error || !departments)
    deptBody = <PageState kind="error" message="We couldn't load your departments." onRetry={() => void depts.refetch()} />
  else if (departments.length === 0)
    deptBody = (
      <PageState kind="empty" title="No departments yet" message="Departments appear here once they are set up for your organization." />
    )
  else
    deptBody = (
      <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {departments.map((d, i) => {
          const n = num(d.headcount) ?? num(d.count)
          return (
            <li key={d.id ?? `${d.name}-${i}`} className="rounded-lg border border-border bg-card p-3">
              <div className="text-sm font-medium text-foreground">{d.name || DASH}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{n == null ? DASH : `${n} ${n === 1 ? "person" : "people"}`}</div>
            </li>
          )
        })}
      </ul>
    )

  const card = "rounded-lg border border-border bg-card p-4 text-card-foreground"

  return (
    <CompanyAdminLayout>
      <PageHeader title="Dashboard" description="Your organization's people, departments and usage at a glance." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="rounded-lg border border-border bg-card p-3.5 hover:border-ring">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            {analytics.isLoading && s.label !== "Departments" ? (
              <Skeleton className="my-1 h-8 w-16" />
            ) : (
              <div className="my-1 text-2xl font-semibold text-foreground">{s.value}</div>
            )}
          </Link>
        ))}
      </div>

      {/* N-4: the reviewer's queue; renders nothing unless switched on and a request names this admin. */}
      <ValidationReviewQueue />

      <section className={`${card} mb-5`} aria-labelledby="ca-departments">
        <h2 id="ca-departments" className="mb-3 text-base font-semibold text-foreground">Departments</h2>
        {deptBody}
      </section>

      <section className={`${card} mb-5`} aria-labelledby="ca-shortcuts">
        <h2 id="ca-shortcuts" className="mb-3 text-base font-semibold text-foreground">Shortcuts</h2>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {COMPANY_ADMIN_SHORTCUTS.map((s) => (
            <Link key={s.label} to={s.path} className="rounded-lg border border-border bg-card p-3 text-sm font-medium text-foreground hover:border-ring">
              {s.label}
            </Link>
          ))}
        </div>
      </section>

      <section className={card} aria-labelledby="ca-usage">
        <h2 id="ca-usage" className="mb-3 text-base font-semibold text-foreground">Usage</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {rollupTiles.map((t) => (
            <div key={t.label} className="rounded-lg border border-border bg-muted p-3.5">
              <div className="text-xs text-muted-foreground">{t.label}</div>
              {rollups.isLoading ? (
                <Skeleton className="my-1 h-8 w-20" />
              ) : (
                <div className="my-1 text-2xl font-semibold text-foreground">{t.value}</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </CompanyAdminLayout>
  )
}
