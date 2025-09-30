import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, Download, Eye, ChevronDown, Sparkles } from "lucide-react";

export type DocKind = "pdf" | "csv" | "ppt" | "doc";
export type SimpleDoc = { name: string; kind: DocKind };
export type DocumentRef = { name: string; kind: DocKind; url?: string };

type DocItem = SimpleDoc & { id: string; group: string; url?: string };

export type DocumentsPanelProps = {
  onImportToChat: (items: SimpleDoc[]) => void;
  onPreview?: (item: DocumentRef) => void;
};

export default function DocumentsPanel({ onImportToChat, onPreview }: DocumentsPanelProps) {
  const pdfDemoUrl = "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";
  const [docs, setDocs] = useState<DocItem[]>([
    { id: "t1", name: "Document.pdf", kind: "pdf", group: "Today", url: pdfDemoUrl },
    { id: "t2", name: "Document.csv", kind: "csv", group: "Today" },
    { id: "t3", name: "Presentation.ppt", kind: "ppt", group: "Today" },
    { id: "t4", name: "Notes.docx", kind: "doc", group: "Today" },
    { id: "y1", name: "Report.docx", kind: "doc", group: "Yesterday" },
    { id: "y2", name: "Slides.ppt", kind: "ppt", group: "Yesterday" },
    { id: "d1", name: "Spec.pdf", kind: "pdf", group: "21-08-2025", url: pdfDemoUrl },
    { id: "d2", name: "Appendix.pdf", kind: "pdf", group: "21-08-2025", url: pdfDemoUrl },
  ]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (label: string) => setOpenGroups((p) => ({ ...p, [label]: !(p[label] ?? true) }));

  const deleteSelected = () => {
    if (selected.size === 0) return;
    setDocs((list) => list.filter((d) => !selected.has(d.id)));
    setSelected(new Set());
  };

  const deleteOne = (id: string) => {
    setDocs((list) => list.filter((d) => d.id !== id));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  };

  const importSelected = () => {
    if (selected.size === 0) return;
    const items = docs
      .filter((d) => selected.has(d.id))
      .map<SimpleDoc>((d) => ({ name: d.name, kind: d.kind }));
    onImportToChat(items);
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-sm font-medium text-blue-primary">Selected ({String(selected.size).padStart(2, "0")})</span>
        <Button
          type="button"
          onClick={deleteSelected}
          disabled={selected.size === 0}
          className="h-8 px-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-100 disabled:opacity-50"
          variant="secondary"
        >
          Delete
          <Trash2 className="size-4 ml-2" />
        </Button>
        <Button
          type="button"
          onClick={importSelected}
          className="h-8 px-3 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-100"
          variant="secondary"
        >
          Import to Chat
          <Sparkles className="size-4 ml-2" />
        </Button>
      </div>

      {/* Grouped list */}
      <div className="space-y-3">
        {[...new Set(docs.map((d) => d.group))].map((group) => {
          const isOpen = openGroups[group] ?? true;
          const items = docs.filter((d) => d.group === group);
          return (
            <div key={group} className="rounded-xl">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between text-left px-1 py-1 text-sm"
                aria-expanded={isOpen}
              >
                <span className="font-medium text-foreground/90">{group}</span>
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
                          checked={selected.has(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          aria-label={`Select ${doc.name}`}
                        />
                        {kindBadge(doc.kind)}
                        <span className="flex-1 truncate">{doc.name}</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => deleteOne(doc.id)}
                            className="text-red-600 hover:text-red-700"
                            aria-label="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                          <button type="button" className="text-foreground/70 hover:text-foreground" aria-label="Download">
                            <Download className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={cn("text-foreground/70 hover:text-foreground", doc.kind !== "pdf" && "opacity-50 cursor-not-allowed hover:text-foreground/70")}
                            aria-label="Preview"
                            onClick={() => doc.kind === "pdf" && onPreview?.({ name: doc.name, kind: doc.kind, url: doc.url })}
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
        })}
      </div>
    </div>
  );
}
