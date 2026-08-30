
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

import DocumentsPanel from "@/components/user/chat/DocumentsPanel";
import type { DocumentsPanelProps, DocumentRef, SimpleDoc } from "@/types/chat";

interface DocumentsSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections?: DocumentsPanelProps["sections"];
  selectedIds?: DocumentsPanelProps["selectedIds"];
  onToggleSelect?: DocumentsPanelProps["onToggleSelect"];
  isLoading?: DocumentsPanelProps["isLoading"];
  onDelete?: DocumentsPanelProps["onDelete"];
  onDownload?: DocumentsPanelProps["onDownload"];
  onImportToChat: (items: SimpleDoc[]) => void;
  onPreview?: (item: DocumentRef) => void;
  onUploadClick?: () => void;
}

export default function DocumentsSidePanel({
  open,
  onOpenChange,
  sections,
  selectedIds,
  onToggleSelect,
  isLoading,
  onDelete,
  onDownload,
  onImportToChat,
  onPreview,
  onUploadClick,
}: DocumentsSidePanelProps) {
  const { t } = useTranslation("chat");
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition pointer-events-none",
        open ? "opacity-100" : "opacity-0"
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/30 transition-opacity",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
        role="button"
        tabIndex={0}
        aria-label={t("documents.sidePanel.closeOverlay", { defaultValue: "Close documents panel" })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpenChange(false);
        }}
      />
      <div
        className={cn(
          "absolute top-0 left-0 h-full w-full max-w-[420px] bg-white shadow-xl border-r transition-transform pointer-events-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold">{t("documents.sidePanel.title", { defaultValue: "Documents" })}</div>
          </div>
          <button
            type="button"
            aria-label={t("documents.sidePanel.close", { defaultValue: "Close documents" })}
            className="cursor-pointer p-1 rounded-md hover:bg-gray-100"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="p-3 overflow-auto h-[calc(100%-3rem)]">
          <DocumentsPanel
            onImportToChat={onImportToChat}
            onPreview={onPreview}
            sections={sections}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            isLoading={isLoading}
            onDelete={onDelete}
            onDownload={onDownload}
            setupUploadOpen={onUploadClick}
          />
        </div>
      </div>
    </div>
  );
}

