"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ModalDialog from "@/components/shared/ModalDialog";

export type ConfirmField = { label: string; value: string };

export type ConfirmActionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields?: ReadonlyArray<ConfirmField>;
  confirmLabel: string;
  confirmVariant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  onConfirm: () => void;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
};

export default function ConfirmActionModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
  confirmDisabled,
  confirmLoading,
}: ConfirmActionModalProps) {
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
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={!!confirmDisabled}
          >
            {confirmLoading ? "Processing..." : confirmLabel}
          </Button>
        </>
      }
    >
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
    </ModalDialog>
  );
}
