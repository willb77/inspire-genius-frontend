import { useState } from "react"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { formatDate } from "@/lib/house/formatDate"
import { useCompanyUsers } from "@/hooks/company-admin/useCompanyAdmin"
import { LinkRequestsAdminSection } from "@/components/company-admin/LinkRequestsAdminSection"
import { AddPeople } from "@/components/company-admin/house/AddPeople"

/** One row of `GET /api/company/users`, read defensively (any field may be absent). */
export type CompanyPerson = {
  id: string
  name?: string | null
  email?: string | null
  role?: string | null
  department?: string | null
  is_active?: boolean | null
  prism_completed?: boolean | null
  last_active?: string | null
}

const DASH = "—"

function readPeople(data: unknown): { people: CompanyPerson[]; total: number } | null {
  const users = (data as { users?: unknown } | undefined)?.users
  if (!Array.isArray(users)) return null
  const total = (data as { total?: unknown }).total
  return { people: users as CompanyPerson[], total: typeof total === "number" ? total : users.length }
}

function roleLabel(role: string | null | undefined): string {
  if (!role) return DASH
  return role
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * House-style People page for the company admin (area `company-admin`).
 *
 * Shows only the organization's real people, from the same users call as the
 * classic page. Loading, a failed load and an empty organization each look
 * different: a failed load never reads as "No people yet". "Add people" opens
 * in place. The link-request section stays with the list.
 */
export default function PeopleHouse() {
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)
  const { data, isLoading, error, refetch } = useCompanyUsers()
  const read = readPeople(data)

  const q = search.trim().toLowerCase()
  const filtered = (read?.people ?? []).filter((p) =>
    !q || [p.name, p.email, p.department].some((v) => (v ?? "").toLowerCase().includes(q)),
  )

  let body: React.ReactNode
  if (isLoading) {
    body = <PageState kind="loading" rows={5} />
  } else if (error || !read) {
    body = <PageState kind="error" message="We couldn't load your people." onRetry={() => void refetch()} />
  } else if (read.people.length === 0) {
    body = (
      <PageState
        kind="empty"
        title="No people yet"
        message="Use Add people to add your team from a spreadsheet."
      />
    )
  } else {
    const active = read.people.filter((p) => p.is_active === true).length
    const managers = read.people.filter((p) => p.role === "manager").length
    const prismDone = read.people.filter((p) => p.prism_completed === true).length
    body = (
      <>
        <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "People", value: read.total },
            { label: "Active", value: active },
            { label: "Managers", value: managers },
            { label: "PRISM done", value: prismDone },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-3.5">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="text-2xl font-semibold text-foreground">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mb-4">
          <label className="sr-only" htmlFor="people-search">Search people</label>
          <input
            id="people-search"
            type="search"
            placeholder="Search by name, email or department"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
          />
        </div>
        {filtered.length === 0 ? (
          <PageState kind="empty" title="No matches" message="No one matches that search." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                  {["Name", "Email", "Role", "Department", "PRISM", "Status", "Last active"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2.5 font-medium text-foreground">{p.name || DASH}</td>
                    <td className="px-3 py-2.5 text-foreground">{p.email || DASH}</td>
                    <td className="px-3 py-2.5 text-foreground">{roleLabel(p.role)}</td>
                    <td className="px-3 py-2.5 text-foreground">{p.department || DASH}</td>
                    <td className="px-3 py-2.5 text-foreground">
                      {p.prism_completed == null ? DASH : p.prism_completed ? "Done" : "Not started"}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">
                      {p.is_active == null ? DASH : p.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(p.last_active)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )
  }

  return (
    <CompanyAdminLayout>
      <PageHeader
        title="People"
        description="Everyone in your organization who uses Inspire Genius."
        action={
          !adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              Add people
            </Button>
          )
        }
      />
      {adding && <AddPeople onClose={() => setAdding(false)} />}
      {/* MMLR-6: shown only while a request in this organisation is pending. */}
      <LinkRequestsAdminSection />
      {body}
    </CompanyAdminLayout>
  )
}
