import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, Download, Eye, ChevronDown, Sparkles, Loader2, Upload } from "lucide-react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import type { DocKind, SimpleDoc, DocumentsPanelProps } from "@/types/chat";

type UIDocItem = { id: string; name: string; kind: DocKind; url: string; createdAt: Date; tempUrl?: string; categoryName?: string };

export default function DocumentsPanel({ onImportToChat, onPreview, onSelectionChange, sections: sectionsProp, selectedIds, onToggleSelect, isLoading: isLoadingProp, onDelete, onDownload, setupUploadOpen }: DocumentsPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds ?? []));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const useControlled = Array.isArray(sectionsProp);

  const kindBadge = (k: DocKind) => {
    const base = "px-2 py-0.5 rounded-md text-xs font-medium";
    switch (k) {
      case "pdf":
        return <span className={cn(base, "bg-red-50 text-red-600")}>PDF</span>;
      case "csv":
        return <span className={cn(base, "bg-green-50 text-green-600")}>CSV</span>;
      case "ppt":
        return <span className={cn(base, "bg-orange-50 text-orange-600")}>PPT</span>;
      default:
        return <span className={cn(base, "bg-blue-50 text-blue-600")}>DOC</span>;
    }
  };

  const sections = useMemo<Array<{ title: string; items: UIDocItem[] }>>(() => {
    if (useControlled && sectionsProp) return sectionsProp.map((s) => ({ title: s.title, items: s.items.map((it) => ({ id: it.id, name: it.name, kind: it.kind, url: it.url || "", createdAt: new Date(), tempUrl: it.tempUrl })) }));
    return [];
  }, [useControlled, sectionsProp]);

  const currentSelected = useControlled && selectedIds ? new Set(selectedIds) : selected;
  const toggleSelect = (id: string) => {
    if (onToggleSelect) {
      onToggleSelect(id);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };

  const toggleGroup = (label: string) => setOpenGroups((p) => ({ ...p, [label]: !(p[label] ?? true) }));

  const deleteOne = async (id: string) => {
    if (onDelete) return onDelete(id);
    // Fallback: just remove from local selection
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };

  const importSelected = () => {
    if ((useControlled ? (selectedIds?.length ?? 0) : selected.size) === 0) return;
    const sel = new Set(currentSelected);
    const flat: UIDocItem[] = sections.flatMap((s) => s.items);
    const items = flat.filter((d) => sel.has(d.id)).map<SimpleDoc>((d) => ({ name: d.name, kind: d.kind }));
    onImportToChat(items);
    setSelected(new Set());
  };

  const handleDownload = async (doc: UIDocItem) => {
    if (onDownload) return onDownload(doc.id);
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-xs font-medium text-blue-primary">Selected ({String((useControlled ? (selectedIds?.length ?? 0) : selected.size)).padStart(2, "0")})</span>
        {(useControlled ? (selectedIds?.length ?? 0) : selected.size) > 0 ? (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                className="invisible h-8 px-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-100"
                variant="secondary"
              >
                Delete
                <Trash2 className="size-4 ml-2" />
              </Button>
            }
            title="Confirm delete"
            description={`Are you sure you want to delete ${String((useControlled ? (selectedIds?.length ?? 0) : selected.size))} selected document(s)? This action cannot be undone.`}
            confirmText="Delete"
            onConfirm={async () => {
              const ids = Array.from(currentSelected);
              for (const id of ids) await deleteOne(id);
            }}
          />
        ) : null}
             <div className="flex-1 flex justify-end mb-2">
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-3 rounded-lg bg-blue-primary/5 text-blue-primary hover:bg-blue-primary/10"
                onClick={() => setupUploadOpen?.(true)}
              >
                <Upload className="size-4 mr-2" />
                Upload
              </Button>
            </div>
        <Button
          type="button"
          onClick={importSelected}
          className="hidden h-8 px-3 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-100"
          variant="secondary"
        >
          Import to Chat
          <Sparkles className="size-4 ml-2" />
        </Button>
      </div>

      {/* Grouped list */}
      <div className="space-y-3">
        {(isLoadingProp) ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
            <Loader2 className="size-4 animate-spin" /> Loading documents...
          </div>
        ) : sections.length === 0 ? (
          <div className="text-sm text-muted-foreground px-1">No files found</div>
        ) : (
          sections.map((sec) => {
            const isOpen = openGroups[sec.title] ?? true;
            const items = sec.items;
            return (
              <div key={sec.title} className="rounded-xl">
                <button
                  type="button"
                  onClick={() => toggleGroup(sec.title)}
                  className="w-full flex items-center justify-between text-left px-1 py-1 text-sm"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-foreground/90">{sec.title}</span>
                  <ChevronDown className={cn("size-4 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
                </button>
                {isOpen && (
                  <ul className="mt-1 space-y-2">
                    {items.map((doc) => (
                      <li key={doc.id}>
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm",
                            selected.has(doc.id) ? "ring-2 ring-blue-primary/40" : ""
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-4"
                            checked={currentSelected.has(doc.id)}
                            onChange={() => toggleSelect(doc.id)}
                            aria-label={`Select ${doc.name}`}
                          />
                          {kindBadge(doc.kind)}
                          <span className="flex-1 truncate">{doc.name}</span>
                          <div className="flex items-center gap-3">
                            <ConfirmDialog
                              trigger={
                                <button
                                  type="button"
                                  className="text-red-600 hover:text-red-700"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              }
                              title="Confirm delete"
                              description="Are you sure you want to delete this document? This action cannot be undone."
                              confirmText="Delete"
                              onConfirm={() => deleteOne(doc.id)}
                            />
                            <button
                              title="Download"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="size-4" />
                            </button>
                            <button
                              type="button"
                              className={cn("text-foreground/70 hover:text-foreground", doc.kind !== "pdf" && "opacity-50 cursor-not-allowed hover:text-foreground/70")}
                              aria-label="Preview"
                              onClick={() => doc.kind === "pdf" && onPreview?.({ name: doc.name, kind: doc.kind, url: doc.tempUrl || doc.url })}
                              disabled={doc.kind !== "pdf"}
                            >
                              <Eye className="size-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
