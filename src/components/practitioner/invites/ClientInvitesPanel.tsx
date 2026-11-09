import { useState } from "react"
import { AlertCircle, Loader2, RefreshCw, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useRevokeClientInvite, useRotateClientInvite } from "@/hooks/practitioner/useClientInvites"
import { inviteErrorMessage } from "@/services/practitioner-invites/clientInvites.service"
import type { ClientInvite, ClientInviteStatus } from "@/types/practitioner-invites"
import { InviteLinkDialog } from "./InviteLinkDialog"
import { STATUS_LABEL, canRevoke, canRotate } from "./invitePresentation"

const STATUS_CLASS: Record<ClientInviteStatus, string> = {
  pending: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-100",
  claimed: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  claimed_by_other: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  expired: "bg-muted text-muted-foreground",
  revoked: "bg-muted text-muted-foreground",
}

function day(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

interface ClientInvitesPanelProps {
  invites: ClientInvite[]
  /** clientId → display name, from the roster. */
  clientNames: Record<string, string>
}

/** S5 — the practitioner's invitations, as list rows (they wrap on a phone). */
export function ClientInvitesPanel({ invites, clientNames }: ClientInvitesPanelProps) {
  const revoke = useRevokeClientInvite()
  const rotate = useRotateClientInvite()
  const [issued, setIssued] = useState<{ path: string; label: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function labelFor(inv: ClientInvite): string {
    return clientNames[inv.clientId] || inv.email || "your client"
  }

  function handleRotate(inv: ClientInvite) {
    setBusyId(inv.id)
    rotate.mutate(inv.id, {
      onSuccess: (res) => setIssued({ path: res.invitePath, label: labelFor(inv) }),
      onError: (err) =>
        toast.error(inviteErrorMessage(err) ?? "Could not issue a new link. Please try again."),
      onSettled: () => setBusyId(null),
    })
  }

  function handleRevoke(inv: ClientInvite) {
    setBusyId(inv.id)
    revoke.mutate(inv.id, {
      onSuccess: () => toast.success("Invite link revoked — it no longer works."),
      onError: (err) =>
        toast.error(inviteErrorMessage(err) ?? "Could not revoke the link. Please try again."),
      onSettled: () => setBusyId(null),
    })
  }

  if (invites.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No invitations yet. Use “Invite” on a client in your roster to create a link.
      </p>
    )
  }

  return (
    <>
      <ul className="divide-y rounded-lg border bg-card" aria-label="Invitations">
        {invites.map((inv) => {
          const busy = busyId === inv.id
          const claimedDiffers =
            inv.status === "claimed" &&
            inv.claimedEmail &&
            inv.claimedEmail.toLowerCase() !== (inv.email ?? "").toLowerCase()
          return (
            <li
              key={inv.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              data-testid={`invite-row-${inv.id}`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{labelFor(inv)}</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[inv.status]}`}
                  >
                    {STATUS_LABEL[inv.status]}
                  </span>
                </div>
                {inv.email && <div className="break-all text-xs text-muted-foreground">{inv.email}</div>}
                {claimedDiffers && (
                  <div className="break-all text-xs">
                    Claimed with a different email: <span className="font-medium">{inv.claimedEmail}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Sent {day(inv.createdAt)} ·{" "}
                  {inv.status === "claimed" || inv.status === "claimed_by_other"
                    ? `Claimed ${day(inv.claimedAt)}`
                    : inv.status === "revoked"
                      ? `Revoked ${day(inv.revokedAt)}`
                      : `${inv.status === "expired" ? "Expired" : "Expires"} ${day(inv.expiresAt)}`}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canRotate(inv.status) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => handleRotate(inv)}
                  >
                    {busy && rotate.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Copy new link
                  </Button>
                )}
                {canRevoke(inv.status) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => handleRevoke(inv)}
                  >
                    <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Revoke
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <InviteLinkDialog
        invitePath={issued?.path ?? null}
        clientLabel={issued?.label ?? ""}
        onClose={() => setIssued(null)}
      />
    </>
  )
}

/** The panel's load failure — honest, with a retry. */
export function ClientInvitesLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Your invitations could not be loaded.</p>
      <Button variant="outline" className="min-h-11" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
