/**
 * "Remove" on an "On file" line (TDS F-W7-1 Part B).
 *
 * Calls DELETE /v1/profile/me/assessments/{id}, which is soft on the server:
 * the entry stays in the history but stops counting, and the earlier result
 * for that framework, if there is one, becomes current again. The person
 * confirms first, and a refusal is shown with the server's reason — never a
 * silent no-op.
 */
import { useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Trash2 } from "lucide-react";
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
import { useRemoveAssessment } from "@/hooks/profile/useProfile";
import { removeErrorInfo } from "./onFileHelpers";

export default function RemoveAssessmentButton({
  assessmentId,
  frameworkLabel,
}: {
  assessmentId: string;
  frameworkLabel: string;
}): JSX.Element {
  const { t } = useTranslation("shellUi");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = useRemoveAssessment();

  const onConfirm = async () => {
    setError(null);
    try {
      await remove.mutateAsync(assessmentId);
      toast.success(
        t("assessments.removeDone", {
          defaultValue: "{{framework}} result removed.",
          framework: frameworkLabel,
        }),
      );
      setOpen(false);
    } catch (err) {
      const { status, detail } = removeErrorInfo(err);
      if (status === 409) {
        // Already removed (another tab, say). The hook has refreshed the list.
        toast.info(
          t("assessments.removeAlready", {
            defaultValue: "That result had already been removed.",
          }),
        );
        setOpen(false);
        return;
      }
      setError(
        detail ??
          t("assessments.removeFailed", {
            defaultValue: "We could not remove this result. Try again.",
          }),
      );
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-label={t("assessments.removeAria", {
          defaultValue: "Remove your {{framework}} result",
          framework: frameworkLabel,
        })}
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        {t("assessments.remove", { defaultValue: "Remove" })}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !remove.isPending && setOpen(v)}>
        <DialogContent data-testid="remove-assessment-dialog">
          <DialogHeader>
            <DialogTitle>
              {t("assessments.removeTitle", {
                defaultValue: "Remove this {{framework}} result?",
                framework: frameworkLabel,
              })}
            </DialogTitle>
            <DialogDescription>
              {t("assessments.removeBody", {
                defaultValue:
                  "It will stop being used, by Meridian and everywhere else. If you have an earlier {{framework}} result, that one becomes your current result again.",
                framework: frameworkLabel,
              })}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={remove.isPending}
            >
              {t("assessments.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={remove.isPending}
            >
              {remove.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("assessments.removeConfirm", { defaultValue: "Remove" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
