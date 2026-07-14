import { useEffect, useRef, useState, type JSX } from "react";
import { Upload, Loader2, FileText } from "lucide-react";
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
import { useImportAssessment } from "@/hooks/profile/useProfile";

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

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
    if (detail) return detail;
    if (err.response?.status === 409) return "That file has already been imported.";
    if (err.response?.status === 413) return "That file is too large.";
  }
  return "Could not import that report. Check the file and try again.";
}

/**
 * "Add → ingest" modal for the HomeV2 completeness tile. The user uploads a
 * report export (CSV) for a specific assessment framework; the file is sent to
 * POST /v1/profile/me/assessments/import where the server-side adapter parses
 * it and stores the scores. On success the loaded-frameworks query is
 * invalidated (by the hook) so the tile's checkmark fills automatically.
 */
export function AddAssessmentModal({
  target,
  onOpenChange,
  onImported,
}: AddAssessmentModalProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importMut = useImportAssessment();
  const open = target !== null;

  // Reset the picked file whenever the modal opens for a new framework.
  useEffect(() => {
    if (open) {
      setFile(null);
      importMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.framework]);

  const handleSubmit = (): void => {
    if (!target || !file) return;
    importMut.mutate(
      { framework: target.framework, file },
      {
        onSuccess: (data) => {
          toast.success(
            `${target.name} added — ${data.score_count} score${
              data.score_count === 1 ? "" : "s"
            } imported.`,
          );
          onImported?.();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(errorMessage(err));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : onOpenChange(false))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {target?.name}</DialogTitle>
          <DialogDescription>
            Upload your {target?.name} report (CSV export). We&apos;ll read the
            scores and add them to your profile so Meridian can use them.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
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
                Choose a CSV file
              </>
            )}
          </button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importMut.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!file || importMut.isPending}
            className="bg-[#0B1B33] text-white hover:bg-[#0B1B33]/90"
          >
            {importMut.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing…
              </>
            ) : (
              "Upload & add"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
