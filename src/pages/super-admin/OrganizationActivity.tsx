import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AlertCircle, ArrowLeft, Download, Loader2 } from "lucide-react"

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  MemberActivityDrawer,
  type DrawerMember,
} from "@/components/super-admin/organization/MemberActivityDrawer"
import { ROUTES } from "@/constants/routes"
import { useOrg } from "@/hooks/super-admin/organization-management/useOrganizationManagement"
import { useOrgUsage } from "@/hooks/super-admin/useOrgUsage"
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement"
import {
  formatCount,
  formatUsd,
  formatWhen,
  membersCsv,
  type MemberIdentity,
} from "@/lib/super-admin/orgUsageFormat"
import { USAGE_WINDOWS, type UsageWindow } from "@/types/super-admin/orgUsage"

/** The member list route's page maximum (OrganizationView uses the same). */
const NAMES_LIMIT = 100

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4"><CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent className="px-4 text-xl font-semibold">{value}</CardContent>
    </Card>
  )
}

/**
 * Super-admin Organizations → Action → Activity.
 *
 * The org's usage report (totals, cost by coach, every member) and a drilldown
 * per member. Usage and estimated cost come from observability-service; names,
 * emails and roles come from the same member list OrganizationView reads
 * (auth-service, `user_profiles.org_id`), joined here by user id.
 *
 * Every member is listed, including those with no AI use in the window, so
 * an idle person and a missing person look different.
 */
export default function OrganizationActivity() {
  const { id: orgId } = useParams<{ id: string }>()
  const [days, setDays] = useState<UsageWindow>(30)
  const [selected, setSelected] = useState<DrawerMember | null>(null)

  const { data: org } = useOrg(orgId)
  const usage = useOrgUsage(orgId, days)
  const names = useUserManagement(
    { organization_id: orgId, page: 1, limit: NAMES_LIMIT, include_super_admins: true },
    { enabled: !!orgId },
  )

  const people = useMemo(() => {
    const m = new Map<string, MemberIdentity>()
    for (const u of names.data?.data?.users ?? []) {
      m.set(u.user_id, {
        name: u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" "),
        email: u.email ?? "",
        role: u.role ?? "",
      })
    }
    return m
  }, [names.data?.data?.users])
  const namesTruncated = (names.data?.data?.pagination?.total ?? 0) > NAMES_LIMIT

  const downloadCsv = () => {
    if (!usage.data) return
    const csv = membersCsv(usage.data.members, (uid) => people.get(uid), usage.data.window_days)
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `${(org?.name ?? "organization").replace(/[^\w-]+/g, "_")}_usage_${usage.data.window_days}d.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const t = usage.data?.totals

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <Link to={ROUTES.SUPER_ADMIN.ORGANIZATIONS} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Organizations
            </Link>
            <h1 className="text-2xl font-semibold">{org?.name ?? "Organization"}: Activity</h1>
          </div>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Time window" className="flex rounded-md border">
              {USAGE_WINDOWS.map((w) => (
                <Button
                  key={w}
                  size="sm"
                  variant={w === days ? "default" : "ghost"}
                  aria-pressed={w === days}
                  onClick={() => setDays(w)}
                >
                  {w} days
                </Button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={downloadCsv} disabled={!usage.data}>
              <Download className="mr-1 h-4 w-4" aria-hidden /> CSV
            </Button>
          </div>
        </div>

        {usage.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
        ) : usage.isError ? (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden />
            Could not load this organization&apos;s usage
            {usage.error?.response?.status ? ` (HTTP ${usage.error.response.status})` : ""}. This is a
            failed read, not zero usage.
          </p>
        ) : t && usage.data ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Members" value={formatCount(t.members)} />
              <Stat label={`Used AI (last ${days} days)`} value={formatCount(t.active_members)} />
              <Stat label="Sessions" value={formatCount(t.sessions)} />
              <Stat label="AI responses" value={formatCount(t.responses)} />
              <Stat label="Estimated AI cost" value={formatUsd(t.estimated_cost_usd)} />
            </div>
            <p className="text-xs text-muted-foreground">{usage.data.cost_basis}</p>

            {usage.data.by_agent.length > 0 ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Cost by coach</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-left text-sm">
                    <thead><tr className="text-muted-foreground"><th className="py-1">Coach</th><th>Responses</th><th>Est. cost</th></tr></thead>
                    <tbody>
                      {usage.data.by_agent.map((a) => (
                        <tr key={a.agent_name} className="border-t">
                          <td className="py-1">{a.agent_name}</td>
                          <td>{formatCount(a.responses)}</td>
                          <td>{formatUsd(a.estimated_cost_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {names.isError ? (
                  <p role="alert" className="text-sm text-destructive">
                    Could not load member names; usage is shown by member id.
                  </p>
                ) : null}
                {namesTruncated ? (
                  <p className="text-xs text-muted-foreground">
                    Names are shown for the first {NAMES_LIMIT} members; usage is listed for everyone.
                  </p>
                ) : null}
                {usage.data.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">This organization has no members.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="py-2">Name</th><th>Role</th><th>Status</th><th>Last AI use</th>
                          <th>Sessions</th><th>Responses</th><th>Est. cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.data.members.map((m) => {
                          const p = people.get(m.user_id)
                          const label = p?.name || p?.email || `Member ${m.user_id.slice(0, 8)}`
                          return (
                            <tr key={m.user_id} className="border-t hover:bg-muted/50">
                              <td className="py-2">
                                <button
                                  type="button"
                                  className="text-left font-medium text-primary hover:underline"
                                  onClick={() => setSelected({
                                    userId: m.user_id, name: p?.name ?? "", email: p?.email ?? "",
                                    role: p?.role ?? "", isActive: m.is_active,
                                  })}
                                >
                                  {label}
                                </button>
                                {p?.email && p.name ? <div className="text-xs text-muted-foreground">{p.email}</div> : null}
                              </td>
                              <td>{p?.role ?? ""}</td>
                              <td>
                                {m.is_active === null ? "—" : (
                                  <Badge variant={m.is_active ? "secondary" : "outline"}>
                                    {m.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                )}
                              </td>
                              <td>{formatWhen(m.last_active_at, "No AI use")}</td>
                              <td>{formatCount(m.sessions)}</td>
                              <td>{formatCount(m.responses)}</td>
                              <td>{formatUsd(m.estimated_cost_usd)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {selected && orgId ? (
        <MemberActivityDrawer orgId={orgId} days={days} member={selected} onClose={() => setSelected(null)} />
      ) : null}
    </SuperAdminLayout>
  )
}
