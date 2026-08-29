import { AlertCircle, Globe, Loader2, LogIn, MapPin } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUserActivity } from "@/hooks/audit/useUserActivity"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; name?: string; email?: string } | null
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

/**
 * Per-user activity for User Management → Action → Activity.
 *
 * Three states are kept distinct on purpose, because collapsing them is how
 * this surface would end up lying:
 *
 *   - LOADING            — nothing is claimed yet.
 *   - ERROR              — we could not read the record. NOT rendered as "no
 *                          activity", which would assert this account has never
 *                          been used.
 *   - "Never signed in"  — a real, loaded answer with zero logins.
 *
 * Location is shown as "Not recorded" rather than derived from the IP. There is
 * no geo column in `audit_logs` on either tier, and inferring a city from an
 * address would mean adding a geo-IP dependency and presenting a guess as a fact.
 */
export function UserActivityDialog({ open, onOpenChange, user }: Props) {
  const { data, isLoading, isError, error } = useUserActivity(open ? user?.id ?? null : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activity</DialogTitle>
          <DialogDescription>
            {user?.name || user?.email || "User"} — sign-in history and recent audited events.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading activity…
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <div className="font-medium text-destructive">Could not load activity</div>
              <div className="text-muted-foreground">
                {(error as Error)?.message ?? "The audit record could not be read."} This is not
                a statement that the user has no activity.
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-5">
            <section className="rounded-md border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <LogIn className="h-4 w-4 text-sky-600" /> Last sign-in
              </div>
              {data.lastLogin ? (
                <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Date / time</dt>
                  <dd>{formatWhen(data.lastLogin.at)}</dd>

                  <dt className="text-muted-foreground">IP address</dt>
                  <dd className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    {data.lastLogin.ipAddress ?? (
                      <span className="text-muted-foreground">Not captured for this sign-in</span>
                    )}
                  </dd>

                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Not recorded
                  </dd>

                  <dt className="text-muted-foreground">Device</dt>
                  <dd className="truncate" title={data.lastLogin.userAgent ?? undefined}>
                    {data.lastLogin.userAgent ?? (
                      <span className="text-muted-foreground">Not captured</span>
                    )}
                  </dd>

                  <dt className="text-muted-foreground">Total sign-ins</dt>
                  <dd>{data.loginCount}</dd>
                </dl>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Never signed in.
                </div>
              )}
              {!data.locationRecorded && (
                <p className="mt-2.5 border-t pt-2 text-xs text-muted-foreground">
                  Location is not stored. The audit log records an IP address only — no
                  geographic lookup is performed, so no city or country is inferred.
                </p>
              )}
            </section>

            <section>
              <div className="mb-2 text-sm font-medium">Recent activity</div>
              {data.activity.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No audited events recorded for this user.
                </div>
              ) : (
                <ul className="divide-y rounded-md border">
                  {data.activity.map((e) => (
                    <li key={e.id} className="flex items-baseline justify-between gap-3 p-2.5 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium">{e.action}</div>
                        {e.description && (
                          <div className="truncate text-xs text-muted-foreground">{e.description}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <div>{formatWhen(e.at)}</div>
                        {e.ipAddress && <div>{e.ipAddress}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default UserActivityDialog
