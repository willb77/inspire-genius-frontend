import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { useCompanyDepartments } from "@/hooks/company-admin/useCompanyAdmin"

/** One row of `GET /api/company/departments`, read defensively. */
export type CompanyDepartment = {
  id?: string
  name?: string | null
  headcount?: number | null
  training_completion?: number | null
}

const DASH = "—"

function readDepartments(data: unknown): CompanyDepartment[] | null {
  const rows = (data as { departments?: unknown } | undefined)?.departments
  return Array.isArray(rows) ? (rows as CompanyDepartment[]) : null
}

/**
 * House-style Organization page for the company admin (area `company-admin`).
 *
 * Only the departments the server returns, with the fields it actually sends.
 * No sample departments, no invented chart, no "lead" or "teams" figures the
 * server does not hold. A failed load is an error, never an empty organization.
 */
export default function OrganizationHouse() {
  const { data, isLoading, error, refetch } = useCompanyDepartments()
  const depts = readDepartments(data)

  let body: React.ReactNode
  if (isLoading) {
    body = <PageState kind="loading" rows={4} />
  } else if (error || !depts) {
    body = <PageState kind="error" message="We couldn't load your organization." onRetry={() => void refetch()} />
  } else if (depts.length === 0) {
    body = (
      <PageState
        kind="empty"
        title="No departments yet"
        message="Departments appear here once they are set up for your organization."
      />
    )
  } else {
    const counted = depts.filter((d) => typeof d.headcount === "number")
    const people = counted.reduce((sum, d) => sum + (d.headcount as number), 0)
    body = (
      <>
        <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-3.5">
            <dt className="text-xs text-muted-foreground">Departments</dt>
            <dd className="text-2xl font-semibold text-foreground">{depts.length}</dd>
          </div>
          <div className="rounded-lg border border-border bg-card p-3.5">
            <dt className="text-xs text-muted-foreground">People in departments</dt>
            <dd className="text-2xl font-semibold text-foreground">{counted.length > 0 ? people : DASH}</dd>
          </div>
        </dl>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                {["Department", "People", "Training completed"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depts.map((d, i) => (
                <tr key={d.id ?? `${d.name}-${i}`} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2.5 font-medium text-foreground">{d.name || DASH}</td>
                  <td className="px-3 py-2.5 text-foreground">{typeof d.headcount === "number" ? d.headcount : DASH}</td>
                  <td className="px-3 py-2.5 text-foreground">
                    {typeof d.training_completion === "number" ? `${d.training_completion}%` : DASH}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <CompanyAdminLayout>
      <PageHeader title="Organization" description="Your organization's departments, as recorded in Inspire Genius." />
      {body}
    </CompanyAdminLayout>
  )
}
