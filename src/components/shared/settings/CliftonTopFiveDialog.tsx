/**
 * "Add CliftonStrengths top five" (TDS A1). Five ordered pickers over the 34
 * canonical themes; rank 1 is the strongest. Saves through the same
 * `useCreateAssessment` the DISC / Big Five / MBTI dialogs use.
 */
import { useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CLIFTON_THEMES, CLIFTON_TOP_N } from "@/constants/cliftonThemes";
import { useCreateAssessment } from "@/hooks/profile/useProfile";
import { cliftonScoreRows, topFiveProblem } from "./assessmentReview";
import SupersedeNotice from "./SupersedeNotice";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: string[] = Array.from({ length: CLIFTON_TOP_N }, () => "");

export default function CliftonTopFiveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation("shellUi");
  const create = useCreateAssessment();
  const [picks, setPicks] = useState<string[]>(EMPTY);
  const [assessedAt, setAssessedAt] = useState<string>(isoToday());
  const [tried, setTried] = useState(false);

  const problem = topFiveProblem(picks);
  const problemText =
    problem === "duplicate"
      ? t("assessments.cliftonDuplicate", { defaultValue: "Each theme can appear only once." })
      : problem === "incomplete"
        ? t("assessments.cliftonIncomplete", { defaultValue: "Choose all five themes." })
        : null;

  const close = (): void => {
    setPicks(EMPTY);
    setAssessedAt(isoToday());
    setTried(false);
    onOpenChange(false);
  };

  const onSave = async (): Promise<void> => {
    setTried(true);
    if (problem || !assessedAt) return;
    try {
      await create.mutateAsync({
        framework: "CLIFTON",
        assessed_at: new Date(assessedAt).toISOString(),
        source: "user_input",
        parsed_scores: cliftonScoreRows(picks),
      });
      toast.success(t("assessments.cliftonAdded", { defaultValue: "CliftonStrengths top five added." }));
      close();
    } catch {
      toast.error(t("assessments.cliftonFailed", { defaultValue: "Failed to add your CliftonStrengths top five." }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent data-testid="clifton-dialog">
        <DialogHeader>
          <DialogTitle>{t("assessments.addClifton", { defaultValue: "Add CliftonStrengths top five" })}</DialogTitle>
          <DialogDescription>
            {t("assessments.cliftonHelp", { defaultValue: "Pick your five themes in the order your report lists them, strongest first." })}
          </DialogDescription>
        </DialogHeader>
        <SupersedeNotice framework="CLIFTON" />
        <div className="space-y-3">
          {picks.map((value, i) => (
            <div key={i} className="space-y-1">
              <Label htmlFor={`clifton-${i + 1}`}>
                {t("assessments.cliftonRank", { defaultValue: "Theme {{rank}}", rank: i + 1 })}
              </Label>
              <select
                id={`clifton-${i + 1}`}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={value}
                onChange={(e) =>
                  setPicks((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                }
              >
                <option value="">{t("assessments.cliftonChoose", { defaultValue: "Choose a theme" })}</option>
                {CLIFTON_THEMES.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="clifton-date">{t("assessments.assessedOn", { defaultValue: "Assessed on" })}</Label>
            <Input
              id="clifton-date"
              type="date"
              value={assessedAt}
              onChange={(e) => setAssessedAt(e.target.value)}
            />
          </div>
          {tried && problemText && (
            <p role="alert" className="text-xs text-destructive">
              {problemText}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            {t("assessments.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button type="button" onClick={onSave} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("assessments.save", { defaultValue: "Save" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
