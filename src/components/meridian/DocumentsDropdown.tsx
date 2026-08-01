import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FileText, ChevronDown, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useListDocuments } from "@/hooks/documents/useListDocuments";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

type DocumentsDropdownProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  autoAttachedId?: string | null;
  className?: string;
  /**
   * Open the upload modal. When supplied, an "Upload a document" action is
   * rendered at the top of the panel and the empty state points at it instead
   * of linking away to /documents.
   *
   * Added 2026-07-31: attaching and uploading were two adjacent header buttons,
   * which read as unrelated features when they are two halves of one job.
   * Optional so the component still stands alone where no modal is mounted.
   */
  onUpload?: () => void;
};

type ApiFile = {
  id: string;
  filename: string;
  file_key?: string;
  file_type?: string;
  created_at?: string;
};

type ApiGroup = {
  date_label?: string;
  date?: string;
  files?: ApiFile[];
};

type DocumentListResponse = {
  date_groups?: ApiGroup[];
};

/**
 * T4 — Documents dropdown for MeridianChat.
 *
 * Trigger displays a "Documents (n selected)" label. The body is a
 * scrollable list of the user's documents grouped by upload date; each
 * row exposes a checkbox so the user can toggle a document into the
 * chat payload. The PRISM auto-attached document (if any) is flagged
 * with an "Auto-attached" badge.
 */
export default function DocumentsDropdown({
  selectedIds,
  onChange,
  autoAttachedId,
  className,
  onUpload,
}: DocumentsDropdownProps) {
  const { t } = useTranslation("chat");
  const { data, isLoading, isError } = useListDocuments(1, 100);

  const groups = useMemo<ApiGroup[]>(() => {
    const resp = data as DocumentListResponse | undefined;
    return Array.isArray(resp?.date_groups) ? resp!.date_groups : [];
  }, [data]);

  const flatCount = useMemo(
    () => groups.reduce((sum, g) => sum + (g.files?.length ?? 0), 0),
    [groups],
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCount = selectedIds.length;
  const triggerLabel =
    selectedCount > 0
      ? t("documents.triggerSelected", {
          defaultValue: "Documents ({{count}} selected)",
          count: selectedCount,
        })
      : t("documents.triggerLabel", { defaultValue: "Documents" });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 px-3 rounded-lg text-sm font-normal flex items-center gap-2",
            className,
          )}
          aria-label={t("documents.triggerAria", { defaultValue: "Select documents" })}
        >
          <FileText className="size-4" />
          <span>{triggerLabel}</span>
          <ChevronDown className="size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        // Wider panel so most filenames (incl. long PRISM report names) fit
        // without ellipsis. Clamps to viewport on narrow screens via max-w.
        className="w-[28rem] max-w-[calc(100vw-2rem)] p-0"
        // Prevent radix from auto-closing on every checkbox click.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          {t("documents.header", { defaultValue: "Attach documents to this chat" })}
        </div>
        {onUpload && (
          <div className="border-b p-2">
            <button
              type="button"
              onClick={onUpload}
              data-testid="documents-dropdown-upload"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal text-foreground hover:bg-muted"
            >
              <Upload className="size-4" aria-hidden />
              <span>{t("documents.upload", { defaultValue: "Upload a document" })}</span>
            </button>
          </div>
        )}
        <div className="max-h-72 overflow-y-auto p-2" data-testid="documents-dropdown-list">
          {isLoading ? (
            <div className="space-y-2 p-1" data-testid="documents-dropdown-loading">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-3 text-sm text-destructive">
              {t("documents.loadError", { defaultValue: "Couldn't load documents." })}
            </div>
          ) : flatCount === 0 ? (
            <div className="p-3 text-sm text-muted-foreground space-y-2">
              <div>{t("common.noDocuments", { defaultValue: "No documents uploaded yet." })}</div>
              {/* With the upload action available above, a second "Upload
                  documents" link here is redundant AND worse — it navigates
                  away to /documents, abandoning the conversation the person is
                  in. Keep the link only as the fallback for callers that pass
                  no `onUpload`. */}
              {!onUpload && (
                <Link
                  to={ROUTES.DOCUMENTS}
                  className="text-primary underline hover:no-underline"
                >
                  {t("documents.uploadLink", { defaultValue: "Upload documents" })}
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {groups.map((group) => {
                const files = group.files ?? [];
                if (files.length === 0) return null;
                const groupKey = group.date_label || group.date || "Documents";
                return (
                  <li key={groupKey}>
                    <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {group.date_label || group.date}
                    </div>
                    <ul className="space-y-0.5">
                      {files.map((f) => {
                        const checked = selectedIds.includes(f.id);
                        const isAuto =
                          !!autoAttachedId && f.id === autoAttachedId;
                        return (
                          <li key={f.id}>
                            <label
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
                              data-testid={`documents-dropdown-row-${f.id}`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggle(f.id)}
                                aria-label={t("documents.selectFileAria", {
                                  defaultValue: "Select {{filename}}",
                                  filename: f.filename,
                                })}
                              />
                              <span
                                className="flex-1 truncate text-sm"
                                title={f.filename}
                              >
                                {f.filename}
                              </span>
                              {isAuto && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                                  data-testid={`documents-dropdown-badge-${f.id}`}
                                >
                                  <Sparkles className="size-3" />
                                  {t("documents.autoAttached", { defaultValue: "Auto-attached" })}
                                </span>
                              )}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {!isLoading && !isError && flatCount > 0 && (
          <div className="border-t px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>
              {t("documents.selectedCount", {
                defaultValue: "{{selected}} of {{total}} selected",
                selected: selectedCount,
                total: flatCount,
              })}
            </span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-primary hover:underline"
              >
                {t("common.clear", { defaultValue: "Clear" })}
              </button>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
