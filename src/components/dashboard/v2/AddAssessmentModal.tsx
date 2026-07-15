import { useEffect, useRef, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  usePreviewImportAssessment,
  useConfirmImportAssessment,
} from "@/hooks/profile/useProfile";
import type { AssessmentImportPreview } from "@/types/profile/profile-types";

export interface AddAssessmentTarget {
  /** Display label, e.g. "Myers-Briggs (MBTI)". */
  name: string;
  /** Canonical framework the backend adapter expects, e.g. "MBTI". */
  framework: string;
}

interface AddAssessmentModalProps {
  target: AddAssessmentTarget | null;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

function fmtScore(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * "Add → ingest" modal with **confirm-before-save**. The user uploads a report
 * (PDF, XLSX, or CSV); we call /import/preview to PARSE it (no write), show the
 * extracted scores for review, and only write when the user confirms — via
 * /import/confirm. This protects the LLM (PDF/XLSX) path from silently saving a
 * misread report. On confirm the loaded-frameworks query is invalidated so the
 * tile checkmark fills.
 */
export function AddAssessmentModal({
  target,
  onOpenChange,
  onImported,
}: AddAssessmentModalProps): JSX.Element {
  const { t } = useTranslation("dashboard");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AssessmentImportPreview | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewMut = usePreviewImportAssessment();
  const confirmMut = useConfirmImportAssessment();
  const open = target !== null;
  const busy = previewMut.isPending || confirmMut.isPending;

  const errorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
      if (detail) return detail;
      if (err.response?.status === 409)
        return t("homeV2.errAlreadyImported", {
          defaultValue: "That file has already been imported.",
        });
      if (err.response?.status === 413)
        return t("homeV2.errTooLarge", { defaultValue: "That file is too large." });
    }
    return t("homeV2.errCouldNotRead", {
      defaultValue: "Could not read that report. Check the file and try again.",
    });
  };

  // Reset when the modal opens for a new framework.
  useEffect(() => {
    if (open) {
      setFile(null);
      setPreview(null);
      previewMut.reset();
      confirmMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.framework]);

  const handleReview = (): void => {
    if (!target || !file) return;
    previewMut.mutate(
      { framework: target.framework, file },
      {
        onSuccess: (data) => setPreview(data),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  const handleConfirm = (): void => {
    if (!target || !preview) return;
    confirmMut.mutate(
      {
        framework: preview.framework,
        source: preview.source,
        scores: preview.scores,
        typing: preview.typing ?? null,
      },
      {
        onSuccess: (data) => {
          toast.success(
            t("homeV2.assessmentAddedToast", {
              count: data.score_count,
              name: target.name,
              defaultValue: "{{name}} added — {{count}} scores saved.",
            }),
          );
          onImported?.();
          onOpenChange(false);
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : onOpenChange(false))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("homeV2.addItem", {
              defaultValue: "Add {{name}}",
              name: target?.name ?? "",
            })}
          </DialogTitle>
          <DialogDescription>
            {preview
              ? t("homeV2.reviewBeforeSave", {
                  defaultValue:
                    "Review what we read from your report, then confirm to save it.",
                })
              : t("homeV2.uploadReportPrompt", {
                  defaultValue:
                    "Upload your report (PDF, XLSX, or CSV). We'll read the scores for you to review before saving.",
                })}
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          /* ── Review step ─────────────────────────────────────────── */
          <div className="max-h-72 overflow-y-auto py-1 text-sm">
            <div className="mb-2 flex items-center gap-2 text-[#3E6B55]">
              <CheckCircle2 className="size-4" />
              <span className="font-medium">
                {t("homeV2.parsedScores", {
                  count: preview.score_count,
                  defaultValue: "Parsed {{count}} scores",
                })}
                {preview.typing
                  ? t("homeV2.plusOneType", { defaultValue: " + 1 type" })
                  : ""}
              </span>
            </div>
            <ul className="divide-y divide-[rgba(11,27,51,0.08)] rounded-lg border border-[rgba(11,27,51,0.10)]">
              {preview.typing ? (
                <li className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[#4b5f80]">
                    {t("homeV2.typeLabel", { defaultValue: "Type" })}
                  </span>
                  <span className="font-medium text-[#0B1B33]">
                    {preview.typing.type_code}
                  </span>
                </li>
              ) : null}
              {preview.scores.map((s, i) => (
                <li
                  key={`${s.dimension}-${i}`}
                  className="flex items-center justify-between px-3 py-1.5"
                >
                  <span className="truncate text-[#4b5f80]">{s.dimension}</span>
                  <span className="ml-2 shrink-0 font-medium text-[#0B1B33]">
                    {s.score_numeric !== null && s.score_numeric !== undefined
                      ? fmtScore(s.score_numeric)
                      : s.score_text ??
                        (s.rank ? `#${s.rank}` : "")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-[#7C93B5]">
              {t("homeV2.nothingSavedUntilConfirm", {
                defaultValue: "Nothing is saved until you confirm.",
              })}
            </p>
          </div>
        ) : (
          /* ── Upload step ─────────────────────────────────────────── */
          <div className="py-2">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(11,27,51,0.25)] bg-[#FBF7F0] px-4 py-6 text-sm font-medium text-[#0B1B33] transition-colors hover:bg-[#5B8A72]/[0.06]"
            >
              {file ? (
                <>
                  <FileText className="size-4 text-[#3E6B55]" />
                  <span className="truncate">{file.name}</span>
                </>
              ) : (
                <>
                  <Upload className="size-4 text-[#C9711A]" />
                  {t("homeV2.chooseFilePdfXlsxCsv", {
                    defaultValue: "Choose a file (PDF, XLSX, or CSV)",
                  })}
                </>
              )}
            </button>
          </div>
        )}

        <DialogFooter>
          {preview ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreview(null)}
                disabled={busy}
              >
                {t("homeV2.back", { defaultValue: "Back" })}
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="bg-[#0B1B33] text-white hover:bg-[#0B1B33]/90"
              >
                {confirmMut.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("homeV2.saving", { defaultValue: "Saving…" })}
                  </>
                ) : (
                  t("homeV2.confirmAndAdd", { defaultValue: "Confirm & add" })
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                {t("homeV2.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button
                type="button"
                onClick={handleReview}
                disabled={!file || busy}
                className="bg-[#0B1B33] text-white hover:bg-[#0B1B33]/90"
              >
                {previewMut.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("homeV2.reading", { defaultValue: "Reading…" })}
                  </>
                ) : (
                  t("homeV2.review", { defaultValue: "Review" })
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
