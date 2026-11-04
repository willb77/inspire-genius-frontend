/**
 * The "checking the file…" notice for an upload the server is still
 * virus-scanning (DOC-AV-1). Pass `onChecking` to `triggerProcessing`; call
 * `done` when the upload settles either way. Nothing shows unless the server
 * said it was waiting on the scan.
 */
import { toast } from "sonner";
import { DocumentRejectedError, DocumentStillCheckingError } from "@/lib/documents/scan";

let seq = 0;

export function checkingNotice(filename: string): { onChecking: () => void; done: () => void } {
  const id = `doc-checking-${++seq}`;
  let shown = false;
  return {
    onChecking: () => {
      shown = true;
      toast.loading(`Checking ${filename} for viruses…`, { id });
    },
    done: () => {
      if (shown) toast.dismiss(id);
    },
  };
}

/** The message to show for a scan outcome, or null if `err` isn't one. */
export function scanErrorMessage(err: unknown): string | null {
  return err instanceof DocumentRejectedError || err instanceof DocumentStillCheckingError
    ? err.message
    : null;
}
