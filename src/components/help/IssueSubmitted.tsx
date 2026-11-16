import { Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IssueSubmittedDialogProps } from "@/types/help";
import { useTranslation } from "react-i18next";

export default function IssueSubmittedDialog({ open, onOpenChange }: IssueSubmittedDialogProps) {
  const { t } = useTranslation("accountUi")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Headset className="h-5 w-5" />
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="text-center">{t("issueSubmittedDialog.issueSubmitted", { defaultValue: "Issue Submitted" })}</DialogTitle>
          <DialogDescription className="text-center">
            {t("issueSubmittedDialog.thanksForReachingOutWeLl", { defaultValue: "Thanks for reaching out! We'll review your issue soon." })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {t("issueSubmittedDialog.back", { defaultValue: "Back" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
