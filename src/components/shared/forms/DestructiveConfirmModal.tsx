"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ModalDialog from "@/components/shared/ModalDialog";

export type DestructiveConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Body shown above the typed-confirmation box. ReactNode so callers can bold,
   * code-format, and interpolate counts/emails. */
  description: React.ReactNode;
  /** String the user must type verbatim (after trim) to enable the confirm button. */
  confirmPhrase: string;
  /** Hint label shown above the input, e.g. "user's email" or "the phrase". */
  confirmHint?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export default function DestructiveConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmPhrase,
  confirmHint,
  confirmLabel = "Permanently delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
}: DestructiveConfirmModalProps) {
  const [typed, setTyped] = useState("");

  const match = typed.trim() === confirmPhrase.trim();

  // Reset typed input when the modal closes so reopening doesn't show stale text.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      // Title carries the warning icon — ModalDialog renders title plain, so we
      // include the icon inline via a child div below for explicit emphasis.
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-start gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden />
          <div className="text-foreground">{description}</div>
        </div>

        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <label className="block text-xs font-medium mb-2 text-foreground">
            To confirm, type
            {confirmHint ? ` the ${confirmHint}` : ""}:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {confirmPhrase}
            </code>
          </label>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmPhrase}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            data-testid="destructive-confirm-input"
            aria-label="Type to confirm destructive action"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            className="bg-gray-100 hover:bg-gray-100 text-foreground"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            type="button"
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            disabled={!match || loading}
            onClick={onConfirm}
            data-testid="destructive-confirm-button"
            type="button"
          >
            {loading ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
