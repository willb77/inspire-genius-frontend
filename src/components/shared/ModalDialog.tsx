"use client";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ModalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showClose?: boolean;
  className?: string;
};

export default function ModalDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  showClose = true,
  className,
}: ModalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={(className ?? "") + " p-0 overflow-hidden"}
        showCloseButton={false}
        aria-describedby={description ? "modal-desc" : undefined}
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            {description && (
              <DialogDescription id="modal-desc" className="text-sm text-muted-foreground mt-1">
                {description}
              </DialogDescription>
            )}
            {!description && <DialogDescription className="sr-only">{title}</DialogDescription>}
          </div>
          {showClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>
        <div className="p-6 pt-4 overflow-y-auto max-h-[calc(100vh-12rem)]">{children}</div>
        {footer && <div className="px-6 pb-6 flex justify-end gap-2">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
