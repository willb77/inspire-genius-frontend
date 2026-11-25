/**
 * "Upload a report" (TDS A1). Confirm-before-save over the existing routes:
 *
 *   choose a framework and a file → POST …/import/preview (parses, writes
 *   nothing) → an editable review → POST …/import/confirm with the rows as
 *   reviewed.
 *
 * The one-step `…/import` is never called from here: nothing a report says
 * is saved until the person has seen it. A PDF or XLSX is read by the
 * server's LLM extractor, which can misread a layout; the review is the
 * control for that.
 *
 * Kept separate from the dashboard's `AddAssessmentModal` (used by Direction
 * Setting), whose review is read-only, so that surface does not change.
 */
import { useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import axios from "axios";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";

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
import {
  useConfirmImportAssessment,
  usePreviewImportAssessment,
} from "@/hooks/profile/useProfile";
import type { ImportTypingRow } from "@/types/profile/profile-types";
import {
  moveRow,
  reviewProblem,
  toConfirmRows,
  toReviewRows,
  type ReviewRow,
} from "./assessmentReview";

/** The frameworks offered, with the key the server's adapters and LLM path expect. */
const UPLOAD_FRAMEWORKS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "DISC", label: "DISC" },
  { key: "BIG_FIVE", label: "Big Five" },
  { key: "MBTI", label: "MBTI" },
  { key: "CLIFTON", label: "CliftonStrengths" },
];

const ACCEPT = ".csv,.pdf,.xlsx,.xls,.docx";

type Review = {
  framework: string;
  source: string;
  rows: ReviewRow[];
  typing: ImportTypingRow | null;
};

export default function UploadReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation("shellUi");
  const previewMut = usePreviewImportAssessment();
  const confirmMut = useConfirmImportAssessment();
  const [framework, setFramework] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = previewMut.isPending || confirmMut.isPending;

  const failText = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail;
      if (typeof detail === "string" && detail) return detail;
      if (err.response?.status === 413)
        return t("assessments.uploadTooLarge", { defaultValue: "That file is too large." });
    }
    return t("assessments.uploadFailed", {
      defaultValue: "We could not read that report. Check the file and the assessment type, then try again.",
    });
  };

  const close = (): void => {
    setFramework("");
    setFile(null);
    setReview(null);
    setError(null);
    previewMut.reset();
    confirmMut.reset();
    onOpenChange(false);
  };

  const onRead = (): void => {
    if (!framework || !file) return;
    setError(null);
    previewMut.mutate(
      { framework, file },
      {
        onSuccess: (data) =>
          setReview({
            framework: data.framework,
            source: data.source,
            rows: toReviewRows(data.framework, data.scores ?? []),
            typing: data.typing ?? null,
          }),
        onError: (err) => {
          const msg = failText(err);
          setError(msg);
          toast.error(msg);
        },
      },
    );
  };

  const onSave = (): void => {
    if (!review || reviewProblem(review.framework, review.rows, !!review.typing)) return;
    setError(null);
    confirmMut.mutate(
      {
        framework: review.framework,
        source: review.source,
        scores: toConfirmRows(review.framework, review.rows),
        typing: review.typing,
      },
      {
        onSuccess: () => {
          toast.success(t("assessments.uploadSaved", { defaultValue: "Report saved." }));
          close();
        },
        onError: (err) => {
          const msg = failText(err);
          setError(msg);
          toast.error(msg);
        },
      },
    );
  };

  const setRows = (rows: ReviewRow[]): void =>
    setReview((r) => (r ? { ...r, rows } : r));

  const problem = review ? reviewProblem(review.framework, review.rows, !!review.typing) : null;
  const isClifton = review?.framework === "CLIFTON";

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent data-testid="upload-report-dialog" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("assessments.uploadReport", { defaultValue: "Upload a report" })}</DialogTitle>
          <DialogDescription>
            {review
              ? t("assessments.uploadReviewHelp", {
                  defaultValue: "Check what we read from your report and correct anything wrong. Nothing is saved until you press Save.",
                })
              : t("assessments.uploadHelp", {
                  defaultValue: "Choose the assessment and your report (PDF, Excel, Word or CSV). You will review the results before anything is saved.",
                })}
          </DialogDescription>
        </DialogHeader>

        {!review ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="upload-framework">{t("assessments.uploadFramework", { defaultValue: "Assessment" })}</Label>
              <select
                id="upload-framework"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
              >
                <option value="">{t("assessments.uploadChooseFramework", { defaultValue: "Choose an assessment" })}</option>
                {UPLOAD_FRAMEWORKS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="upload-file">{t("assessments.uploadFile", { defaultValue: "Report file" })}</Label>
              <Input
                id="upload-file"
                type="file"
                accept={ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        ) : (
          <div className="max-h-80 space-y-3 overflow-y-auto" data-testid="upload-review">
            {review.typing && (
              <div className="space-y-1">
                <Label htmlFor="review-type">{t("assessments.reviewType", { defaultValue: "Type" })}</Label>
                <Input
                  id="review-type"
                  value={review.typing.type_code}
                  onChange={(e) =>
                    setReview((r) =>
                      r && r.typing ? { ...r, typing: { ...r.typing, type_code: e.target.value } } : r,
                    )
                  }
                />
              </div>
            )}
            {review.rows.length === 0 && !review.typing ? (
              <p className="text-sm text-muted-foreground">
                {t("assessments.reviewEmpty", { defaultValue: "No results are left to save." })}
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {review.rows.map((row, i) => (
                  <li key={`${row.dimension}-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    {isClifton ? (
                      <>
                        <span className="w-6 shrink-0 text-muted-foreground">{i + 1}.</span>
                        <span className="flex-1 truncate">{row.dimension}</span>
                        {!row.known && (
                          <span className="text-xs text-destructive">
                            {t("assessments.reviewUnknownTheme", { defaultValue: "Not a CliftonStrengths theme" })}
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("assessments.reviewMoveUp", { defaultValue: "Move {{name}} up", name: row.dimension })}
                          disabled={i === 0}
                          onClick={() => setRows(moveRow(review.rows, i, -1))}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("assessments.reviewMoveDown", { defaultValue: "Move {{name}} down", name: row.dimension })}
                          disabled={i === review.rows.length - 1}
                          onClick={() => setRows(moveRow(review.rows, i, 1))}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Label htmlFor={`review-${i}`} className="flex-1 truncate font-normal">
                          {row.dimension}
                        </Label>
                        {row.score_numeric !== null && row.score_numeric !== undefined ? (
                          <Input
                            id={`review-${i}`}
                            type="number"
                            className="h-8 w-24"
                            value={String(row.score_numeric)}
                            onChange={(e) => {
                              const n = e.target.value === "" ? null : Number(e.target.value);
                              setRows(
                                review.rows.map((r, j) =>
                                  j === i ? { ...r, score_numeric: Number.isFinite(n) ? n : null } : r,
                                ),
                              );
                            }}
                          />
                        ) : (
                          <span className="text-muted-foreground">{row.score_text ?? ""}</span>
                        )}
                      </>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("assessments.reviewRemove", { defaultValue: "Remove {{name}}", name: row.dimension })}
                      onClick={() => setRows(review.rows.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {problem === "unknown" && (
              <p className="text-xs text-destructive">
                {t("assessments.reviewRemoveUnknown", {
                  defaultValue: "Remove the themes marked above before saving.",
                })}
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          {review ? (
            <>
              <Button type="button" variant="outline" onClick={() => setReview(null)} disabled={busy}>
                {t("assessments.back", { defaultValue: "Back" })}
              </Button>
              <Button type="button" onClick={onSave} disabled={busy || problem !== null}>
                {confirmMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {t("assessments.save", { defaultValue: "Save" })}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                {t("assessments.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button type="button" onClick={onRead} disabled={busy || !framework || !file}>
                {previewMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {t("assessments.uploadRead", { defaultValue: "Read report" })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
