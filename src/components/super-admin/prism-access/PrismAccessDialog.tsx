import { useState } from "react";
import type { JSX } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  prismAccessErrorMessage,
  useGrantUserPrismAccess,
  useRevokeUserPrismAccess,
  useUserPrismAccess,
} from "@/hooks/super-admin/prism-access/usePrismAccessAdmin";
import type { PrismAccessScope, UserPrismAccess } from "@/types/super-admin/prism-access";

export type PrismAccessTarget = { id: string; email: string; name?: string };

interface PrismAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PrismAccessTarget | null;
}

const SCOPE_TEXT: Record<PrismAccessScope, string> = {
  tier: "Everyone on this environment may request PRISM surveys.",
  org: "Their organisation is allowed to request PRISM surveys.",
  person: "They hold an individual approval.",
  practitioner: "They are covered through their practitioner.",
};

function CoverageLine({ label, on }: { label: string; on: boolean }): JSX.Element {
  return (
    <li className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <Badge
        variant="secondary"
        className={
          on
            ? "bg-green-100 text-green-700 border-transparent"
            : "bg-gray-100 text-gray-600 border-transparent"
        }
      >
        {on ? "Yes" : "No"}
      </Badge>
    </li>
  );
}

function Summary({ view }: { view: UserPrismAccess }): JSX.Element {
  const scope = view.coverage.effective_scope;
  return (
    <div className="space-y-3">
      <p
        className={
          "rounded-md border p-3 text-sm " +
          (scope ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50")
        }
        data-testid="prism-access-summary"
      >
        {scope
          ? `May request PRISM surveys. ${SCOPE_TEXT[scope]}`
          : "Blocked: they cannot request a PRISM survey until they are approved."}
      </p>
      <ul className="space-y-1.5">
        <CoverageLine label="Whole environment" on={view.coverage.tier} />
        <CoverageLine label="Their organisation" on={view.coverage.org} />
        <CoverageLine label="Individual approval" on={view.coverage.person} />
      </ul>
      {view.open_request && (
        <p className="text-sm text-muted-foreground">
          Open request
          {view.open_request.practitioner_name
            ? `, naming practitioner ${view.open_request.practitioner_name}`
            : ""}
          . Granting approves it.
        </p>
      )}
    </div>
  );
}

/**
 * Per-user PRISM survey access. Shows how the person is covered (whole
 * environment, their organisation, or an individual approval) and lets an
 * approver grant or revoke the individual approval. Revoking sets them to
 * "denied" and keeps the history; it cannot override environment or
 * organisation coverage, and says so.
 */
export default function PrismAccessDialog({
  open,
  onOpenChange,
  target,
}: PrismAccessDialogProps): JSX.Element {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const query = useUserPrismAccess(target?.id, open);
  const grant = useGrantUserPrismAccess();
  const revoke = useRevokeUserPrismAccess();
  const busy = grant.isPending || revoke.isPending;
  const view = query.data;
  const who = view?.user.name || target?.name || target?.email || "this user";
  const coveredElsewhere = !!view && (view.coverage.tier || view.coverage.org);

  const close = (next: boolean): void => {
    onOpenChange(next);
    if (!next) setConfirmRevoke(false);
  };

  const doGrant = (): void => {
    if (target) grant.mutate({ userId: target.id });
  };
  const doRevoke = (): void => {
    if (!target) return;
    revoke.mutate({ userId: target.id }, { onSettled: () => setConfirmRevoke(false) });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PRISM survey access — {who}</DialogTitle>
          <DialogDescription>
            Who may request a PRISM survey. Changes take effect on their next request.
          </DialogDescription>
        </DialogHeader>

        {query.isLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading access…
          </div>
        )}

        {query.isError && (
          <div role="alert" className="space-y-2 py-2 text-sm text-red-600">
            <p>{prismAccessErrorMessage(query.error, "Could not load their PRISM access.")}</p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {view && (
          <div className="space-y-4 py-2">
            <Summary view={view} />

            {coveredElsewhere && (
              <p className="text-sm text-muted-foreground" data-testid="prism-access-covered">
                {view.coverage.tier
                  ? "The whole environment is switched on, so an individual change makes no difference today."
                  : "Their organisation already covers them, so an individual approval is not needed, and revoking one will not block them."}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              {!view.coverage.person && (
                <Button
                  type="button"
                  size="sm"
                  onClick={doGrant}
                  disabled={busy}
                  data-testid="prism-access-grant"
                >
                  {grant.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-1.5 h-4 w-4" />
                  )}
                  Grant individual approval
                </Button>
              )}

              {view.coverage.person || view.open_request ? (
                confirmRevoke ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      Set {who} to denied? Their history is kept.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={doRevoke}
                      disabled={busy}
                      data-testid="prism-access-revoke-confirm"
                    >
                      {revoke.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                      Confirm revoke
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmRevoke(false)}
                      disabled={busy}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setConfirmRevoke(true)}
                    disabled={busy}
                    data-testid="prism-access-revoke"
                  >
                    <ShieldOff className="mr-1.5 h-4 w-4" />
                    {view.coverage.person ? "Revoke approval" : "Deny open request"}
                  </Button>
                )
              ) : null}
            </div>

            {view.history.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">History</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {view.history.map((h) => (
                    <li key={h.id}>
                      {h.at ?? ""} — {h.action === "user_grant" ? "granted" : "revoked"} by{" "}
                      {h.actor_email}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
