import { useState } from "react";
import type { JSX } from "react";
import { AlertTriangle, Loader2, Plus, ShieldOff } from "lucide-react";

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
  entitlementsErrorMessage,
  useGrantVertical,
  useRevokeVertical,
  useUserEntitlements,
} from "@/hooks/super-admin/vertical-entitlements/useVerticalEntitlementsAdmin";
import { getVertical, type VerticalKey } from "@/verticals/core";
import type { UserEntitlements } from "@/types/super-admin/vertical-entitlements";

export type EntitlementsTarget = { id: string; email: string; name?: string };

interface VerticalEntitlementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: EntitlementsTarget | null;
}

/** The vertical's own title from the registry, or its key. */
function verticalTitle(key: string): string {
  return getVertical(key as VerticalKey)?.title ?? key;
}

type KeyState = { on: boolean; onEveryRow: boolean; onAnyRow: boolean };

function keyState(view: UserEntitlements, key: string): KeyState {
  const withKey = view.rows.filter((r) => r.verticals.includes(key)).length;
  return {
    on: view.effective.includes(key),
    onEveryRow: view.rows.length > 0 && withKey === view.rows.length,
    onAnyRow: withKey > 0,
  };
}

/**
 * Per-user vertical entitlements. Lists every vertical this screen manages
 * (the backend's list), shows what the platform answers the person today, and
 * lets an approver grant or revoke one vertical at a time. A revoke asks for a
 * confirm naming the person and the vertical. Every change is applied to all of
 * the person's entitlement records and recorded in the history.
 */
export default function VerticalEntitlementsDialog({
  open,
  onOpenChange,
  target,
}: VerticalEntitlementsDialogProps): JSX.Element {
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const query = useUserEntitlements(target?.id, open);
  const grant = useGrantVertical();
  const revoke = useRevokeVertical();
  const busy = grant.isPending || revoke.isPending;
  const view = query.data;
  const who = target?.name || target?.email || "this user";

  const close = (next: boolean): void => {
    onOpenChange(next);
    if (!next) setConfirmKey(null);
  };

  const doGrant = (key: string): void => {
    if (target) grant.mutate({ userId: target.id, vertical: key, title: verticalTitle(key) });
  };
  const doRevoke = (key: string): void => {
    if (!target) return;
    revoke.mutate(
      { userId: target.id, vertical: key, title: verticalTitle(key) },
      { onSettled: () => setConfirmKey(null) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vertical entitlements — {who}</DialogTitle>
          <DialogDescription>
            Which verticals they can open. Changes apply on their next page load.
          </DialogDescription>
        </DialogHeader>

        {query.isLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading entitlements…
          </div>
        )}

        {query.isError && (
          <div role="alert" className="space-y-2 py-2 text-sm text-red-600">
            <p>{entitlementsErrorMessage(query.error, "Could not load their entitlements.")}</p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {view && (
          <div className="space-y-4 py-2">
            {view.conflict && (
              <p
                role="status"
                className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"
                data-testid="entitlements-conflict"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                They have {view.row_count} entitlement records that disagree, and the platform
                reads only one. Granting or revoking a vertical brings every record into line for
                that vertical.
              </p>
            )}

            <ul className="divide-y rounded-md border" data-testid="entitlements-list">
              {view.catalogue.map((key) => {
                const s = keyState(view, key);
                const title = verticalTitle(key);
                return (
                  <li key={key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm">
                      {title}
                      <Badge
                        variant="secondary"
                        className={
                          s.on
                            ? "bg-green-100 text-green-700 border-transparent"
                            : "bg-gray-100 text-gray-600 border-transparent"
                        }
                      >
                        {s.on ? "On" : "Off"}
                      </Badge>
                    </span>
                    {confirmKey === key ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Revoke {title} from {who}?
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => doRevoke(key)}
                          disabled={busy}
                          data-testid={`entitlement-revoke-confirm-${key}`}
                        >
                          {revoke.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                          Confirm revoke
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmKey(null)}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {!s.onEveryRow && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => doGrant(key)}
                            disabled={busy}
                            data-testid={`entitlement-grant-${key}`}
                          >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Grant
                          </Button>
                        )}
                        {s.onAnyRow && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => setConfirmKey(key)}
                            disabled={busy}
                            data-testid={`entitlement-revoke-${key}`}
                          >
                            <ShieldOff className="mr-1.5 h-4 w-4" />
                            Revoke
                          </Button>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {view.unmanaged_count > 0 && (
              <p className="text-xs text-muted-foreground" data-testid="entitlements-unmanaged">
                They also hold {view.unmanaged_count} entitlement
                {view.unmanaged_count === 1 ? "" : "s"} managed elsewhere. This screen never
                changes {view.unmanaged_count === 1 ? "it" : "them"}.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Some vertical tools add their own vertical when they onboard someone, so a revoked
              vertical can come back that way.
            </p>

            {view.history.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">History</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {view.history.map((h) => {
                    const key = typeof h.detail?.vertical === "string" ? h.detail.vertical : "";
                    return (
                      <li key={h.id}>
                        {h.at ?? ""} — {verticalTitle(key)} {h.action === "grant" ? "granted" : "revoked"} by{" "}
                        {h.actor_email}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
