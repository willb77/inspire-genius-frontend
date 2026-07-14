import { useEffect, useRef, useState, type JSX } from "react";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDocumentUpload } from "@/hooks/documents/useDocumentUpload";
import { profileKeys } from "@/hooks/profile/useProfile";

export interface AddPersonalDocTarget {
  /** Display label, e.g. "Resume". */
  name: string;
  /** Backend doc_kind to tag the upload with, e.g. "resume". */
  docKind: string;
}

interface AddPersonalDocModalProps {
  target: AddPersonalDocTarget | null;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
    if (detail) return detail;
    if (err.response?.status === 413) return "That file is too large.";
    if (err.response?.status === 415) return "That file type isn't supported.";
  }
  return "Could not upload that file. Check it and try again.";
}

/**
 * "Add → upload" modal for the HomeV2 personal-info column. Uploads a file via
 * the document-service presigned flow, **tagged with the right `doc_kind`**
 * (resume / bio / personal). The agent-engine profile loader then folds a
 * resume/bio into `<RESUME>`/`<BIO>` in `<USER_PROFILE>`. On success the
 * profile query is invalidated so the completeness checkmark fills.
 */
export function AddPersonalDocModal({
  target,
  onOpenChange,
  onUploaded,
}: AddPersonalDocModalProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useDocumentUpload();
  const qc = useQueryClient();
  const open = target !== null;

  useEffect(() => {
    if (open) {
      setFile(null);
      upload.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.docKind]);

  const handleSubmit = (): void => {
    if (!target || !file) return;
    upload.mutate(
      { file, docKind: target.docKind },
      {
        onSuccess: () => {
          toast.success(`${target.name} added.`);
          qc.invalidateQueries({ queryKey: profileKeys.me() });
          onUploaded?.();
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
            Upload your {target?.name?.toLowerCase()} (PDF, Word, or text).
            We&apos;ll add it to your profile so Meridian can use it across chats.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,application/pdf,text/plain"
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
                Choose a file
              </>
            )}
          </button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={upload.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!file || upload.isPending}
            className="bg-[#0B1B33] text-white hover:bg-[#0B1B33]/90"
          >
            {upload.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading…
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
