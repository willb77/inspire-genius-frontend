import { useMemo, useState } from "react";
import UserLayout from "@/layouts/UserLayout";
import IconInput from "@/components/ui/icon-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Search, Settings, Trash2, Download, Eye, ChevronDown, ChevronRight, Upload } from "lucide-react";
import { format as formatMonth } from "date-fns";
import { toast } from "sonner";
import DocumentViewerModal from "@/components/user/chat/DocumentViewerModal";
import UploadDocumentsModal from "@/components/user/documents/UploadDocumentsModal";

type DocKind = "pdf" | "csv" | "ppt" | "doc";
type DocItem = {
  id: string;
  name: string;
  kind: DocKind;
  createdAt: Date;
  url: string;
};

const KIND_STYLES: Record<DocKind, { bg: string; text: string; label: string }> = {
  pdf: { bg: "bg-red-50", text: "text-red-600", label: "PDF" },
  csv: { bg: "bg-green-50", text: "text-green-600", label: "CSV" },
  ppt: { bg: "bg-orange-50", text: "text-orange-600", label: "PPT" },
  doc: { bg: "bg-blue-50", text: "text-blue-600", label: "DOC" },
};

export default function Documents() {
  // Sample docs
  const [docs, setDocs] = useState<DocItem[]>(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const earlier = new Date("2025-08-21T09:25:00");
    const sampleUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    return [
      { id: "d1", name: "Document.pdf", kind: "pdf", createdAt: today, url: sampleUrl },
      { id: "d2", name: "Document.csv", kind: "csv", createdAt: today, url: sampleUrl },
      { id: "d3", name: "Document.ppt", kind: "ppt", createdAt: today, url: sampleUrl },
      { id: "d4", name: "Document.pdf", kind: "doc", createdAt: today, url: sampleUrl },
      { id: "d5", name: "Document.pdf", kind: "doc", createdAt: yesterday, url: sampleUrl },
      { id: "d6", name: "Document.ppt", kind: "ppt", createdAt: yesterday, url: sampleUrl },
      { id: "d7", name: "Document.pdf", kind: "doc", createdAt: earlier, url: sampleUrl },
      { id: "d8", name: "Document.pdf", kind: "pdf", createdAt: earlier, url: sampleUrl },
    ];
  });

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; name: string }>({ url: "", name: "" });
  const [month, setMonth] = useState<Date>(new Date());
  const [uploadOpen, setUploadOpen] = useState(false);

  // Filter by selected month then by search query
  const monthFiltered = useMemo(() => {
    return docs.filter(
      (d) => d.createdAt.getMonth() === month.getMonth() && d.createdAt.getFullYear() === month.getFullYear()
    );
  }, [docs, month]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monthFiltered;
    return monthFiltered.filter((d) => d.name.toLowerCase().includes(q));
  }, [monthFiltered, query]);

  const sections = useMemo(() => {
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const groups: Record<string, DocItem[]> = {};
    for (const d of filtered) {
      const key = d.createdAt.toDateString() === todayStr
        ? "Today"
        : d.createdAt.toDateString() === yesterdayStr
        ? "Yesterday"
        : formatDMY(d.createdAt);
      (groups[key] ||= []).push(d);
    }
    // sort each group by time desc
    for (const k of Object.keys(groups)) groups[k].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    // return as array with stable order: Today, Yesterday, others (desc by date)
    const otherKeys = Object.keys(groups).filter((k) => k !== "Today" && k !== "Yesterday").sort((a, b) => parseDMY(b).getTime() - parseDMY(a).getTime());
    const keys = ["Today", "Yesterday", ...otherKeys].filter((k) => groups[k]?.length);
    return keys.map((k) => ({ title: k, items: groups[k]! }));
  }, [filtered]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const selectedCount = selected.size;

  function toggleSection(title: string) {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  function toggleSelect(id: string, checked: boolean | string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    setDocs((prev) => prev.filter((d) => !selected.has(d.id)));
    setSelected(new Set());
    toast.success("Documents deleted", { description: "Selected documents were removed successfully." });
  }

  function handleDownload(doc: DocItem) {
    const a = document.createElement("a");
    a.href = doc.url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleView(doc: DocItem) {
    setViewer({ url: doc.url, name: doc.name });
    setViewerOpen(true);
  }

  return (
    <UserLayout>
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Documents Uploaded</h1>
          <div className="flex flex-col items-end gap-2">
            <Button className="h-9 px-4 bg-blue-primary hover:bg-blue-primary/90" onClick={() => setUploadOpen(true)}>
              Upload Document
              <Upload className="size-4 ml-2" />
            </Button>
            <div className="flex items-center gap-3 justify-end">
              <IconInput
                placeholder="Search.."
                leftIcon={<Search className="size-4" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-xl bg-gray-100 w-[300px] md:w-[320px]"
              />
              {selectedCount > 0 ? (
                <Button
                  variant="secondary"
                  className="h-9 px-4 rounded-lg bg-red-100 text-red-700 hover:bg-red-100"
                  onClick={handleDeleteSelected}
                >
                  Delete
                  <Trash2 className="size-4 ml-2" />
                </Button>
              ) : null}
              {selectedCount === 0 ? (
                <button aria-label="Settings" className="p-2 rounded-md hover:bg-gray-100"><Settings className="size-5" /></button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Month selector + selected pill */}
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-blue-primary hover:underline flex items-center gap-2" type="button">
                {formatMonth(month, "MMMM , yyyy")} <CalendarIcon className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="single"
                selected={month}
                onSelect={(d) => d && setMonth(d)}
                month={month}
                onMonthChange={(m) => setMonth(m)}
                captionLayout="dropdown"
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {selectedCount > 0 ? (
            <span className="text-blue-primary bg-blue-50 rounded-lg px-3 py-1 text-sm font-medium">Selected ({String(selectedCount).padStart(2, "0")})</span>
          ) : null}
        </div>

        {/* Sections */}
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          {sections.map((sec, idx) => (
            <div key={sec.title} className={idx > 0 ? "mt-6" : undefined}>
              <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={() => toggleSection(sec.title)}>
                {collapsed[sec.title] ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                {sec.title}
              </button>
              {!collapsed[sec.title] && (
                <div className="mt-2 space-y-2">
                  {sec.items.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selected.has(d.id)} onCheckedChange={(v) => toggleSelect(d.id, v)} />
                        <span className={`inline-flex items-center justify-center size-6 rounded-md text-[10px] font-semibold ${KIND_STYLES[d.kind].bg} ${KIND_STYLES[d.kind].text}`}>
                          {KIND_STYLES[d.kind].label}
                        </span>
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button title="Delete" className="text-red-600 hover:text-red-700" onClick={() => { setSelected(new Set([d.id])); handleDeleteSelected(); }}>
                          <Trash2 className="size-4" />
                        </button>
                        <button title="Download" className="text-muted-foreground hover:text-foreground" onClick={() => handleDownload(d)}>
                          <Download className="size-4" />
                        </button>
                        <button title="View" className="text-muted-foreground hover:text-foreground" onClick={() => handleView(d)}>
                          <Eye className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Viewer re-use */}
      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        fileUrl={viewer.url}
        fileName={viewer.name}
        onDelete={() => setViewerOpen(false)}
        onDownload={() => {
          const a = document.createElement("a");
          a.href = viewer.url;
          a.download = viewer.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }}
      />

      {/* Upload documents modal */}
      <UploadDocumentsModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(files) => {
          setDocs((prev) => [
            ...files.map((f, idx) => ({
              id: `u-${Date.now()}-${idx}`,
              name: f.name,
              kind: f.kind as DocKind,
              url: f.url,
              createdAt: new Date(),
            })),
            ...prev,
          ]);
          toast.success("Document Uploaded", { description: `${files.length} document(s) uploaded successfully.` });
        }}
      />
    </UserLayout>
  );
}

function formatDMY(d: Date) {
  return formatMonth(d, "dd-MM-yyyy");
}

function parseDMY(s: string) {
  if (s === "Today" || s === "Yesterday") return new Date();
  const [dd, mm, yyyy] = s.split("-").map(Number);
  return new Date(yyyy, (mm || 1) - 1, dd || 1);
}
