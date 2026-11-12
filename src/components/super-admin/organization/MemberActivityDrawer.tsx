import { AlertCircle, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUserActivity } from "@/hooks/audit/useUserActivity"
import { useMemberUsage } from "@/hooks/super-admin/useOrgUsage"
import { formatCount, formatUsd, formatWhen } from "@/lib/super-admin/orgUsageFormat"

export type DrawerMember = {
  userId: string
  name: string
  email: string
  role: string
  isActive: boolean | null
}

type Props = {
  orgId: string
  days: number
  member: DrawerMember
  onClose: () => void
}

function ErrorLine({ what }: { what: string }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" aria-hidden />
      Could not load {what}. This is a failed read, not an absence of activity.
    </p>
  )
}

function Loading() {
  return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" />
}

/**
 * One member: status, sign-in and activity history (audit-service), and AI
 * usage and estimated cost (observability-service), over the page's window.
 *
 * The two reads fail independently, and each failure is shown as a failure.
 * A failed read is never rendered as "no activity" or "$0.00".
 */
export function MemberActivityDrawer({ orgId, days, member, onClose }: Props) {
  const activity = useUserActivity(member.userId, 15)
  const usage = useMemberUsage(orgId, member.userId, days)
  const t = usage.data?.totals

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{member.name || member.email || "Member"}</SheetTitle>
          <SheetDescription>{member.email}</SheetDescription>
          <div className="flex flex-wrap gap-2">
            {member.role ? <Badge variant="outline">{member.role}</Badge> : null}
            {member.isActive === null ? null : (
              <Badge variant={member.isActive ? "default" : "secondary"}>
                {member.isActive ? "Active account" : "Inactive account"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6 text-sm">
          <section aria-label="Sign-in" className="space-y-2">
            <h3 className="font-medium">Sign-in</h3>
            {activity.isLoading ? <Loading /> : activity.isError ? <ErrorLine what="sign-in history" /> : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Last sign-in</dt>
                <dd>{activity.data?.lastLogin ? formatWhen(activity.data.lastLogin.at) : "Never signed in"}</dd>
                <dt className="text-muted-foreground">Sign-ins recorded</dt>
                <dd>{formatCount(activity.data?.loginCount)}</dd>
              </dl>
            )}
          </section>

          <section aria-label="AI usage" className="space-y-2">
            <h3 className="font-medium">AI usage, last {days} days</h3>
            {usage.isLoading ? <Loading /> : usage.isError ? <ErrorLine what="usage" /> : t ? (
              <>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt className="text-muted-foreground">Last AI use</dt>
                  <dd>{formatWhen(t.last_active_at, "No AI use in this window")}</dd>
                  <dt className="text-muted-foreground">Sessions</dt>
                  <dd>{formatCount(t.sessions)}</dd>
                  <dt className="text-muted-foreground">AI responses</dt>
                  <dd>{formatCount(t.responses)}</dd>
                  <dt className="text-muted-foreground">Tokens</dt>
                  <dd>{formatCount(t.total_tokens)}</dd>
                  <dt className="text-muted-foreground">Estimated AI cost</dt>
                  <dd className="font-medium">{formatUsd(t.estimated_cost_usd)}</dd>
                </dl>
                <p className="text-xs text-muted-foreground">{usage.data?.cost_basis}</p>

                {usage.data && usage.data.by_agent.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">Usage by coach</caption>
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
                ) : null}

                {usage.data && usage.data.recent_sessions.length > 0 ? (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-muted-foreground">Recent sessions</h4>
                    <ul className="space-y-1">
                      {usage.data.recent_sessions.map((s) => (
                        <li key={s.session_id} className="flex justify-between gap-2 border-t pt-1 text-xs">
                          <span>{formatWhen(s.last_at)}</span>
                          <span>{formatCount(s.responses)} responses · {formatUsd(s.estimated_cost_usd)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>

          <section aria-label="Recent activity" className="space-y-2">
            <h3 className="font-medium">Recent activity</h3>
            {activity.isLoading ? <Loading /> : activity.isError ? <ErrorLine what="activity" /> :
              (activity.data?.activity.length ?? 0) === 0 ? (
                <p className="text-muted-foreground">No recorded activity.</p>
              ) : (
                <ul className="space-y-1">
                  {activity.data?.activity.map((e) => (
                    <li key={e.id} className="border-t pt-1">
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="font-medium">{e.description || e.action}</span>
                        <span className="text-muted-foreground">{formatWhen(e.at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
