"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ModalDialog from "@/components/shared/ModalDialog";

export type DestructiveConfirmField = { label: string; value: string };

export type DestructiveConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /**
   * The literal phrase the user must type to enable the destructive button.
   * Defaults to "DELETE". Match is case-sensitive.
   */
  confirmPhrase?: string;
  fields?: ReadonlyArray<DestructiveConfirmField>;
  confirmLabel: string;
  onConfirm: () => void;
  confirmLoading?: boolean;
};

/**
 * P0-1 fix (2026-05-13): a stricter confirmation gate for irreversible
 * actions (Delete, Bulk Delete, Purge Inactive). The user must type a
 * literal phrase (default "DELETE") before the destructive button enables.
 *
 * Use ConfirmActionModal for reversible actions (deactivate, activate).
 * Use this modal for hard-delete and bulk destructive actions.
 */
export default function DestructiveConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmPhrase = "DELETE",
  fields,
  confirmLabel,
  onConfirm,
  confirmLoading,
}: DestructiveConfirmModalProps) {
  const [typed, setTyped] = useState("");

  // Reset the typed value whenever the modal opens / closes so the user
  // is forced to re-confirm each time.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matches = typed === confirmPhrase;

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button
            variant="secondary"
            className="bg-gray-100 hover:bg-gray-100 text-foreground"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!matches || !!confirmLoading}
            aria-disabled={!matches || !!confirmLoading}
          >
            {confirmLoading ? "Processing..." : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {fields && fields.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f, idx) => (
              <div key={idx}>
                <label className="block text-xs mb-1">{f.label}</label>
                <Input value={f.value} readOnly />
              </div>
            ))}
          </div>
        )}
        <div>
          <label
            className="block text-xs mb-1"
            htmlFor="destructive-confirm-input"
          >
            Type{" "}
            <span className="font-mono font-semibold">{confirmPhrase}</span> to
            confirm
          </label>
          <Input
            id="destructive-confirm-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmPhrase}
            autoComplete="off"
            spellCheck={false}
          />
          {typed.length > 0 && !matches && (
            <p className="text-xs text-destructive mt-1">
              Phrase does not match.
            </p>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
