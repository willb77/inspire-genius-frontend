import { useMemo, useState } from "react";
import UserLayout from "@/layouts/UserLayout";
import IconInput from "@/components/ui/icon-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Search,
  Trash2,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  Upload,
  Loader2,
  Settings,
} from "lucide-react";
import { format as formatMonth, format, parse, isValid } from "date-fns";
import { toast } from "sonner";
import DocumentIframeModal from "@/components/user/chat/DocumentIframeModal";
import UploadDocumentsModal from "@/components/user/documents/UploadDocumentsModal";
import type { DocKind, DocItem, UploadedFile } from "@/types/documents";
import { useListDocuments } from "@/hooks/documents/useListDocuments";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";
import { useDownloadDocument } from "@/hooks/documents/useDownloadDocument";
import { useDeleteDocument } from "@/hooks/documents/useDeleteDocument";
import { useBulkDeleteDocuments } from "@/hooks/documents/useBulkDeleteDocuments";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Pagination from "@/components/shared/Pagination";
import { DatePicker } from "@/components/ui/date-picker";

const KIND_STYLES: Record<
  DocKind,
  { bg: string; text: string; label: string }
> = {
  pdf: { bg: "bg-red-50", text: "text-red-600", label: "PDF" },
  csv: { bg: "bg-green-50", text: "text-green-600", label: "CSV" },
  ppt: { bg: "bg-orange-50", text: "text-orange-600", label: "PPT" },
  doc: { bg: "bg-blue-50", text: "text-blue-600", label: "DOC" },
};

export default function Documents() {
  // Local UI type to carry optional tempUrl provided by API for viewing
  type UIDocItem = DocItem & { tempUrl?: string; categoryName?: string };
  type FileServiceResponse = { total_pages?: number; total_count?: number; date_groups?: unknown };
  // UI state
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; name: string }>({
    url: "",
    name: "",
  });
  const [filterDate, setFilterDate] = useState<string>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [page, setPage] = useState<number>(1);
  const limit = 10;
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Data
  const yyyyMmDd = useMemo(() => {
    try {
      if (!filterDate) return "";
      let d = parse(filterDate, "d LLL yyyy", new Date());
      if (!isValid(d)) d = new Date(filterDate);
      return isValid(d) ? format(d, "yyyy-MM-dd") : "";
    } catch {
      return "";
    }
  }, [filterDate]);
  const { data: fileServiceList, isLoading: listLoading, isFetching: listFetching } = useListDocuments(page, limit, { date: yyyyMmDd, search: query.trim() });
  const queryClient = useQueryClient();
  const downloadMutation = useDownloadDocument();
  const deleteMutation = useDeleteDocument();
  const bulkDeleteMutation = useBulkDeleteDocuments();

  // Month filter currently applies only to fallback mode; API grouping uses server date labels
  const monthFiltered: DocItem[] = useMemo(() => [], []);
  const filtered: DocItem[] = useMemo(() => monthFiltered, [monthFiltered]);

  const sections = useMemo(() => {
    // Prefer server-provided grouping labels
    type ApiFile = {
      id: string;
      filename: string;
      file_key: string;
      file_type: string;
      created_at: string;
    };
    type ApiGroup = { date_label: string; date: string; files: ApiFile[] };
    const apiGroups = (
      fileServiceList as { date_groups?: ApiGroup[] } | undefined
    )?.date_groups;
    if (Array.isArray(apiGroups) && apiGroups.length) {
      const base = (api.defaults.baseURL as string) || "";
      const joinUrl = (fileKey: string) =>
        `${base.replace(/\/+$/, "")}/${String(fileKey || "").replace(
          /^\/+/,
          ""
        )}`;
      const kindFromApi = (t?: string): DocKind => {
        const k = String(t || "").toLowerCase();
        if (k === "pdf") return "pdf";
        if (k === "csv") return "csv";
        if (k === "ppt" || k === "pptx") return "ppt";
        return "doc";
      };
      const q = query.trim().toLowerCase();
      type ApiFile = {
        id: string;
        filename: string;
        file_key: string;
        file_type: string;
        created_at: string;
        temp_url?: string;
        category_name?: string;
      };
      return apiGroups
        .map((g) => {
          const items: UIDocItem[] = (g.files || [])
            .map((f: ApiFile) => ({
              id: f.id,
              name: f.filename,
              kind: kindFromApi(f.file_type),
              url: joinUrl(f.file_key),
              createdAt: new Date(f.created_at),
              tempUrl: f.temp_url,
              categoryName: f.category_name,
            }))
            .filter((d) => (q ? d.name.toLowerCase().includes(q) : true));
          return { title: g.date_label || g.date, items };
        })
        .filter((sec) => sec.items.length > 0);
    }

    // Fallback: local grouping when API groups are unavailable
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const groups: Record<string, DocItem[]> = {};
    for (const d of filtered) {
      const key =
        d.createdAt.toDateString() === todayStr
          ? "Today"
          : d.createdAt.toDateString() === yesterdayStr
          ? "Yesterday"
          : formatDMY(d.createdAt);
      (groups[key] ||= []).push(d);
    }
    for (const k of Object.keys(groups))
      groups[k].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const otherKeys = Object.keys(groups)
      .filter((k) => k !== "Today" && k !== "Yesterday")
      .sort((a, b) => parseDMY(b).getTime() - parseDMY(a).getTime());
    const keys = ["Today", "Yesterday", ...otherKeys].filter(
      (k) => groups[k]?.length
    );
    return keys.map((k) => ({ title: k, items: groups[k]! }));
  }, [fileServiceList, query, filtered]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const selectedCount = selected.size;

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleSelect = (id: string, checked: boolean | string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    try {
      if (selected.size === 1) {
        const [onlyId] = Array.from(selected);
        await deleteMutation.mutateAsync(onlyId);
      } else {
        await bulkDeleteMutation.mutateAsync(Array.from(selected));
      }
      setSelected(new Set());
      toast.success("Documents deleted", {
        description: "Selected documents were removed successfully.",
      });
    } catch (e) {
      toast.error("Delete failed", {
        description:
          e instanceof Error ? e.message : "Unable to delete one or more documents",
      });
    }
  };

  const handleDeleteOne = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setSelected((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Document deleted");
    } catch (e) {
      toast.error("Delete failed", {
        description:
          e instanceof Error ? e.message : "Unable to delete document",
      });
    }
  };

  const handleDownload = async (doc: UIDocItem) => {
    try {
      setDownloadingId(doc.id);
      const link = await downloadMutation.mutateAsync(doc.id);
      const a = document.createElement("a");
      a.href = link;
      a.rel = "noopener noreferrer";
      a.target = "_blank";
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error("Download failed", {
        description:
          e instanceof Error ? e.message : "Unable to get download link",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = (doc: UIDocItem) => {
    setViewer({ url: doc.tempUrl || doc.url, name: doc.name });
    setViewerOpen(true);
  };

  const handleUploaded = (files: UploadedFile[]) => {
    queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
    setUploadOpen(false);
    toast.success("Document Uploaded", {
      description: `${files.length} document(s) uploaded successfully.`,
    });
  };

  return (
    <UserLayout>
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="text-left flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Documents Uploaded
          </h1>
          <p className="text-xs text-muted-foreground">
            Upload documents to access them in the chat.
          </p>
          </div>
          <div
            className="flex flex-col items-end gap-2"
            data-tour="docs-toolbar"
          >
            <Button
              className="h-9 px-4 bg-blue-primary hover:bg-blue-primary/90"
              onClick={() => setUploadOpen(true)}
              disabled={false}
            >
              Upload Document
              <Upload className="size-4 ml-2" />
            </Button>
            <div className="hidden items-center gap-3 justify-end">
              <IconInput
                placeholder="Search.."
                disabled={false}
                leftIcon={<Search className="size-4" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-xl bg-gray-100 w-[300px] md:w-[320px]"
              />
              {selectedCount > 0 ? (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="secondary"
                      className="h-9 px-4 rounded-lg bg-red-100 text-red-700 hover:bg-red-100"
                      disabled={bulkDeleteMutation.isPending || deleteMutation.isPending}
                    >
                      Delete
                      <Trash2 className="size-4 ml-2" />
                    </Button>
                  }
                  title="Confirm delete"
                  description={`Are you sure you want to delete ${selectedCount} selected document(s)? This action cannot be undone.`}
                  confirmText="Delete"
                  onConfirm={handleDeleteSelected}
                />
              ) : null}
              {selectedCount === 0 ? (
                <button
                  aria-label="Settings"
                  className="invisible p-2 rounded-md hover:bg-gray-100"
                >
                  <Settings className="size-5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Date filter + selected pill */}
        <div className="flex items-center gap-3 mt-10">
          <div className="w-56">
            <DatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder="Filter by date"
              maxDate={new Date()}
            />
          </div>
          {selectedCount > 0 ? (
            <span className="text-blue-primary bg-blue-50 rounded-lg px-3 py-1 text-sm font-medium">
              Selected ({String(selectedCount).padStart(2, "0")})
            </span>
          ) : null}

            <div className="flex-1 flex items-center gap-3 justify-end">

              {selectedCount > 0 ? (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="secondary"
                      className="h-9 px-4 rounded-lg bg-red-100 text-red-700 hover:bg-red-100"
                      disabled={bulkDeleteMutation.isPending || deleteMutation.isPending}
                    >
                      Delete
                      <Trash2 className="size-4 ml-2" />
                    </Button>
                  }
                  title="Confirm delete"
                  description={`Are you sure you want to delete ${selectedCount} selected document(s)? This action cannot be undone.`}
                  confirmText="Delete"
                  onConfirm={handleDeleteSelected}
                />
              ) : null}
            </div>
        </div>

        {/* Sections */}
        <div
          className="bg-white rounded-2xl border shadow-sm p-4"
          data-tour="docs-sections"
        >
          {listLoading || listFetching ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2">
                    {[0, 1, 2].map((j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : sections.length === 0 ? (
            <div className="py-16 grid place-items-center text-center">
              <div className="text-lg font-semibold mb-1">No files found</div>
              <div className="text-sm text-muted-foreground mb-4">
                Click Upload to add files
              </div>
              <Button
                className="h-9 px-4 bg-blue-primary hover:bg-blue-primary/90"
                onClick={() => setUploadOpen(true)}
              >
                Upload Document
                <Upload className="size-4 ml-2" />
              </Button>
            </div>
          ) : (
            sections.map((sec, idx) => (
              <div key={sec.title} className={idx > 0 ? "mt-6" : undefined}>
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  onClick={() => toggleSection(sec.title)}
                >
                  {collapsed[sec.title] ? (
                    <ChevronRight className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                  {sec.title}
                </button>
                {!collapsed[sec.title] && (
                  <div className="mt-2 space-y-2">
                    {sec.items.map((d: UIDocItem) => (
                      <div
                        key={d.id}
                        className="w-full flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2"
                      >
                        <div className="w-full flex-1 flex items-center gap-3">
                          <Checkbox
                          disabled
                            checked={selected.has(d.id)}
                            onCheckedChange={(v) => toggleSelect(d.id, v)}
                          />
                          <span
                            className={`inline-flex items-center justify-center size-6 rounded-md text-[10px] font-semibold ${
                              KIND_STYLES[d.kind].bg
                            } ${KIND_STYLES[d.kind].text}`}
                          >
                            {KIND_STYLES[d.kind].label}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm font-medium">
                                {d.name.length > 40
                                  ? `${d.name.slice(0, 40)}…`
                                  : d.name}
                              </span>
                            </TooltipTrigger>
                            {d.name.length > 40 ? (
                              <TooltipContent sideOffset={6}>
                                {d.name}
                              </TooltipContent>
                            ) : null}
                          </Tooltip>
                        </div>
                        {d.categoryName ? (
                          <p className="flex-1 text-center text-xs text-muted-foreground">
                            {d.categoryName}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-3">
                          <ConfirmDialog
                            trigger={
                              <button
                                title="Delete"
                                className="cursor-pointer text-red-600 hover:text-red-700"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            }
                            title="Confirm delete"
                            description="Are you sure you want to delete this document? This action cannot be undone."
                            confirmText="Delete"
                            onConfirm={() => handleDeleteOne(d.id)}
                          />
                          <button
                            title="Download"
                            className="cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => void handleDownload(d)}
                            disabled={downloadingId === d.id}
                          >
                            {downloadingId === d.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Download className="size-4" />
                            )}
                          </button>
                          <button
                            title="View"
                            className="cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => handleView(d)}
                            disabled={false}
                          >
                            <Eye className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {(() => {
          const resp = (fileServiceList ?? {}) as FileServiceResponse;
          const totalPages = typeof resp.total_pages === "number" ? resp.total_pages : 1;
          return totalPages > 1 ? (
            <div className="mt-4 flex justify-end">
              <Pagination pageCount={totalPages} page={page} onPageChange={setPage} />
            </div>
          ) : null;
        })()}

        {/* Delete confirmation handled via shared ConfirmDialog */}
      </div>
      {/* Iframe-based viewer */}
      <DocumentIframeModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        fileUrl={viewer.url}
        fileName={viewer.name}
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
        onUploaded={handleUploaded}
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
