/**
 * "Waiting for you" — results a practitioner sent, in Settings → Other
 * Assessments (TDS A4).
 *
 * A practitioner's import lands held: it counts for nothing, for Meridian or
 * anyone's view, until the person accepts it here. Accept
 * (`POST /v1/profile/me/assessments/{id}/accept`) makes it the current result
 * for that framework. Decline is the owner remove
 * (`DELETE /v1/profile/me/assessments/{id}`), confirmed first, because a
 * declined result cannot be accepted later.
 *
 * Nothing waiting shows nothing: most people never get one. A failed read
 * says so, except a 404, which means this engine has no such route yet
 * (`pendingRouteMissing`).
 */
import { useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAcceptPendingImport,
  useDeclinePendingImport,
  usePendingImports,
} from "@/hooks/profile/useProfile";
import type { PendingImport } from "@/types/profile/profile-types";
import {
  formatAssessedDate,
  frameworkLabel,
  pendingResultText,
  pendingRouteMissing,
  removeErrorInfo,
} from "./onFileHelpers";

function PendingRow({ item }: { item: PendingImport }): JSX.Element {
  const { t, i18n } = useTranslation("shellUi");
  const accept = useAcceptPendingImport();
  const decline = useDeclinePendingImport();
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = accept.isPending || decline.isPending;
  const label = frameworkLabel(item.framework);
  const who =
    item.imported_by_name?.trim() ||
    t("assessments.pendingSomeone", { defaultValue: "Your practitioner" });
  const result = pendingResultText(item);

  const onAccept = async (): Promise<void> => {
    setError(null);
    try {
      await accept.mutateAsync(item.id);
      toast.success(
        t("assessments.pendingAccepted", {
          defaultValue: "Accepted. This is now your current {{framework}} result.",
          framework: label,
        }),
      );
    } catch (err) {
      const { status, detail } = removeErrorInfo(err);
      if (status === 409) {
        // Answered already (another tab, say). The hook has refreshed the list.
        toast.info(detail ?? t("assessments.pendingAlready", { defaultValue: "That result has already been answered." }));
        return;
      }
      setError(
        detail ?? t("assessments.pendingAcceptFailed", { defaultValue: "We could not accept this result. Try again." }),
      );
    }
  };

  const onDecline = async (): Promise<void> => {
    setError(null);
    try {
      await decline.mutateAsync(item.id);
      toast.success(
        t("assessments.pendingDeclined", { defaultValue: "Declined. The {{framework}} result was not added.", framework: label }),
      );
      setConfirmDecline(false);
    } catch (err) {
      const { status, detail } = removeErrorInfo(err);
      if (status === 409) {
        toast.info(detail ?? t("assessments.pendingAlready", { defaultValue: "That result has already been answered." }));
        setConfirmDecline(false);
        return;
      }
      setError(
        detail ?? t("assessments.pendingDeclineFailed", { defaultValue: "We could not decline this result. Try again." }),
      );
      setConfirmDecline(false);
    }
  };

  return (
    <li className="rounded-md border border-border/60 p-3" data-testid={`pending-${item.id}`}>
      <p className="text-sm">
        {t("assessments.pendingLine", {
          defaultValue: "{{name}} sent you a {{framework}} result on {{date}}.",
          name: who,
          framework: label,
          date: formatAssessedDate(item.imported_at, i18n.language),
        })}
      </p>
      {result && <p className="mt-1 text-sm font-medium">{result}</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        {t("assessments.pendingHelp", {
          defaultValue: "It is not used until you accept it. Accepting makes it your current {{framework}} result.",
          framework: label,
        })}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDecline(true)} disabled={busy}>
          <X className="mr-1 h-3.5 w-3.5" />
          {t("assessments.pendingDecline", { defaultValue: "Decline" })}
        </Button>
        <Button type="button" size="sm" onClick={() => void onAccept()} disabled={busy}>
          {accept.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
          {t("assessments.pendingAccept", { defaultValue: "Accept" })}
        </Button>
      </div>

      <Dialog open={confirmDecline} onOpenChange={(v) => !decline.isPending && setConfirmDecline(v)}>
        <DialogContent data-testid="decline-pending-dialog">
          <DialogHeader>
            <DialogTitle>
              {t("assessments.pendingDeclineTitle", { defaultValue: "Decline this {{framework}} result?", framework: label })}
            </DialogTitle>
            <DialogDescription>
              {t("assessments.pendingDeclineBody", {
                defaultValue: "It will not be added to your profile, and you cannot accept it later. {{name}} is not notified.",
                name: who,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDecline(false)} disabled={decline.isPending}>
              {t("assessments.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void onDecline()} disabled={decline.isPending}>
              {decline.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("assessments.pendingDecline", { defaultValue: "Decline" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

export default function PendingImports(): JSX.Element | null {
  const { t } = useTranslation("shellUi");
  const pending = usePendingImports();

  if (pending.isPending) return null;
  if (pending.isError) {
    if (pendingRouteMissing(pending.error)) return null;
    return (
      <p role="alert" className="text-sm text-destructive" data-testid="pending-error">
        {t("assessments.pendingError", {
          defaultValue: "We could not check for results sent to you. Reload the page to try again.",
        })}
      </p>
    );
  }
  const items = pending.data ?? [];
  if (items.length === 0) return null;

  return (
    <section
      className="space-y-2"
      data-testid="assessments-pending"
      aria-label={t("assessments.pendingTitle", { defaultValue: "Waiting for you" })}
    >
      <p className="text-sm font-medium">{t("assessments.pendingTitle", { defaultValue: "Waiting for you" })}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <PendingRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
