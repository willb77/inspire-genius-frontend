import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  Sparkles,
  Star,
} from "lucide-react";
import { format as formatMonth, format, parse, isValid } from "date-fns";
import { toast } from "sonner";
import DocumentIframeModal from "@/components/user/chat/DocumentIframeModal";
import UploadDocumentsModal from "@/components/user/documents/UploadDocumentsModal";
import type { DocKind, UploadedFile } from "@/types/documents";
import {
  useDocuments,
  useDownloadDocumentV2,
  useDeleteDocumentV2,
  useBulkDeleteDocumentsV2,
  useMarkDocumentAsPrism,
  useSearchDocumentsV2,
} from "@/hooks/documents/useDocuments";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Pagination from "@/components/shared/Pagination";
import { DatePicker } from "@/components/ui/date-picker";

// ─── Types ─────────────────────────────────────────────────────────────────

type UIDocItem = {
  id: string;
  name: string;
  kind: DocKind;
  rawDocKind: string;
  url: string;
  createdAt: Date;
  categoryName?: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const KIND_STYLES: Record<DocKind, { bg: string; text: string; label: string }> = {
  pdf: { bg: "bg-red-50", text: "text-red-600", label: "PDF" },
  csv: { bg: "bg-green-50", text: "text-green-600", label: "CSV" },
  ppt: { bg: "bg-orange-50", text: "text-orange-600", label: "PPT" },
  doc: { bg: "bg-blue-50", text: "text-blue-600", label: "DOC" },
};

function kindFromDocKind(docKind: string): DocKind {
  const k = docKind.toLowerCase();
  if (k === "pdf") return "pdf";
  if (k === "csv") return "csv";
  if (k === "ppt" || k === "pptx") return "ppt";
  return "doc";
}

function kindFromFilename(filename: string): DocKind {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return kindFromDocKind(ext);
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function Documents() {
  const { t } = useTranslation(["common", "dashboard"]);

  // UI state
  const [query, setQuery] = useState("");
  const [semanticSearch, setSemanticSearch] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; name: string }>({ url: "", name: "" });
  const [filterDate, setFilterDate] = useState<string>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [page, setPage] = useState<number>(1);
  const limit = 10;
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

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

  // Data hooks
  const { data: docListData, isLoading, isFetching } = useDocuments(
    semanticSearch
      ? {}
      : {
          limit,
          offset: (page - 1) * limit,
          search: query.trim() || undefined,
          ...(yyyyMmDd ? { status: yyyyMmDd } : {}),
        },
  );

  const queryClient = useQueryClient();
  const downloadMutation = useDownloadDocumentV2();
  const deleteMutation = useDeleteDocumentV2();
  const bulkDeleteMutation = useBulkDeleteDocumentsV2();
  const searchMutation = useSearchDocumentsV2();
  const markPrismMutation = useMarkDocumentAsPrism();
  const [markingPrismId, setMarkingPrismId] = useState<string | null>(null);

  // Trigger semantic search when query changes and toggle is on
  useEffect(() => {
    if (semanticSearch && query.trim()) {
      searchMutation.mutate({ query: query.trim(), use_semantic: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, semanticSearch]);

  // Section grouping
  const sections = useMemo(() => {
    // Semantic search results — flat list under one heading
    if (semanticSearch && searchMutation.data) {
      const hits = searchMutation.data.hits;
      if (!hits.length) return [];
      return [
        {
          title: `Search Results (${hits.length})`,
          items: hits.map(
            (h): UIDocItem => ({
              id: h.document_id,
              name: h.filename,
              kind: kindFromFilename(h.filename),
              rawDocKind: "general",
              url: "",
              createdAt: new Date(),
            }),
          ),
        },
      ];
    }

    // Normal mode: group documents by date
    const docs = docListData?.documents ?? [];
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const getDateGroupKey = (date: Date) => {
      const dateStr = date.toDateString();
      if (dateStr === todayStr) return "Today";
      if (dateStr === yesterdayStr) return "Yesterday";
      return formatDMY(date);
    };

    const groups: Record<string, UIDocItem[]> = {};
    for (const doc of docs) {
      const d = new Date(doc.created_at);
      const key = getDateGroupKey(d);
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        id: doc.id,
        name: doc.filename,
        kind: kindFromDocKind(doc.doc_kind),
        rawDocKind: doc.doc_kind ?? "general",
        url: "",
        createdAt: d,
      });
    }

    for (const k of Object.keys(groups))
      groups[k].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const otherKeys = Object.keys(groups)
      .filter((k) => k !== "Today" && k !== "Yesterday")
      .sort((a, b) => parseDMY(b).getTime() - parseDMY(a).getTime());

    const keys = ["Today", "Yesterday", ...otherKeys].filter((k) => groups[k]?.length);
    return keys.map((k) => ({ title: k, items: groups[k]! }));
  }, [semanticSearch, searchMutation.data, docListData]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const selectedCount = selected.size;
  const listLoading = isLoading || isFetching;

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
      toast.success(t("common:success"), {
        description: "Selected documents were removed successfully.",
      });
    } catch (e) {
      toast.error(t("common:error"), {
        description: e instanceof Error ? e.message : "Unable to delete one or more documents",
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
      toast.success(t("common:success"));
    } catch (e) {
      toast.error(t("common:error"), {
        description: e instanceof Error ? e.message : "Unable to delete document",
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
      toast.error(t("common:error"), {
        description: e instanceof Error ? e.message : "Unable to get download link",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (doc: UIDocItem) => {
    try {
      setViewingId(doc.id);
      const url = await downloadMutation.mutateAsync(doc.id);
      setViewer({ url, name: doc.name });
      setViewerOpen(true);
    } catch (e) {
      toast.error(t("common:error"), {
        description: e instanceof Error ? e.message : "Unable to open document",
      });
    } finally {
      setViewingId(null);
    }
  };

  const handleMarkAsPrism = async (doc: UIDocItem) => {
    try {
      setMarkingPrismId(doc.id);
      await markPrismMutation.mutateAsync(doc.id);
      toast.success(t("common:success"), {
        description: `${doc.name} is now your PRISM report. Meridian will auto-attach it.`,
      });
    } catch (e) {
      toast.error(t("common:error"), {
        description: e instanceof Error ? e.message : "Unable to mark as PRISM",
      });
    } finally {
      setMarkingPrismId(null);
    }
  };

  const handleUploaded = (files: UploadedFile[]) => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    setUploadOpen(false);
    toast.success(t("common:success"), {
      description: `${files.length} document(s) uploaded successfully.`,
    });
  };

  const totalPages = Math.ceil((docListData?.total ?? 0) / limit);

  return (
    <UserLayout>
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="text-left flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Documents Uploaded</h1>
            <p className="text-xs text-muted-foreground">
              Upload documents to access them in the chat.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2" data-tour="docs-toolbar">
            <Button
              className="h-9 px-4 bg-blue-primary hover:bg-blue-primary/90"
              onClick={() => setUploadOpen(true)}
            >
              {t("common:uploadDocument")}
              <Upload className="size-4 ml-2" />
            </Button>
            <div className="flex items-center gap-3 justify-end">
              {/* Search bar */}
              <IconInput
                placeholder={t("dashboard:search")}
                leftIcon={<Search className="size-4" />}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl bg-gray-100 w-[300px] md:w-[320px]"
              />
              {/* Semantic search toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={semanticSearch ? "default" : "outline"}
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => setSemanticSearch((v) => !v)}
                    aria-label={semanticSearch ? "Disable semantic search" : "Enable semantic search"}
                  >
                    <Sparkles className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>
                  {semanticSearch ? "Semantic search ON" : "Enable semantic search"}
                </TooltipContent>
              </Tooltip>
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
        <div className="bg-white rounded-2xl border shadow-sm p-4" data-tour="docs-sections">
          {listLoading && (
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
          )}
          {!listLoading && sections.length === 0 && (
            <div className="py-16 grid place-items-center text-center">
              <div className="text-lg font-semibold mb-1">No files found</div>
              <div className="text-sm text-muted-foreground mb-4">
                {query ? "No documents match your search." : "Click Upload to add files"}
              </div>
              {!query && (
                <Button
                  className="h-9 px-4 bg-blue-primary hover:bg-blue-primary/90"
                  onClick={() => setUploadOpen(true)}
                >
                  {t("common:uploadDocument")}
                  <Upload className="size-4 ml-2" />
                </Button>
              )}
            </div>
          )}
          {!listLoading && sections.length > 0 &&
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
                            checked={selected.has(d.id)}
                            onCheckedChange={(v) => toggleSelect(d.id, v)}
                          />
                          <span
                            className={`inline-flex items-center justify-center size-6 rounded-md text-[10px] font-semibold ${KIND_STYLES[d.kind].bg} ${KIND_STYLES[d.kind].text}`}
                          >
                            {KIND_STYLES[d.kind].label}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm font-medium">
                                {d.name.length > 40 ? `${d.name.slice(0, 40)}…` : d.name}
                              </span>
                            </TooltipTrigger>
                            {d.name.length > 40 ? (
                              <TooltipContent sideOffset={6}>{d.name}</TooltipContent>
                            ) : null}
                          </Tooltip>
                        </div>
                        {d.categoryName ? (
                          <p className="flex-1 text-center text-xs text-muted-foreground">
                            {d.categoryName}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-3">
                          {d.rawDocKind === "prism" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  aria-label="Marked as my PRISM report"
                                  className="cursor-default text-amber-500"
                                >
                                  <Star className="size-4 fill-current" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent sideOffset={6}>
                                Your PRISM report — Meridian auto-attaches this
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  aria-label="Mark as my PRISM report"
                                  className="cursor-pointer text-muted-foreground hover:text-amber-500"
                                  onClick={() => void handleMarkAsPrism(d)}
                                  disabled={markingPrismId === d.id}
                                >
                                  {markingPrismId === d.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Star className="size-4" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent sideOffset={6}>
                                Mark as my PRISM Rpt
                              </TooltipContent>
                            </Tooltip>
                          )}
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
                            onClick={() => void handleView(d)}
                            disabled={viewingId === d.id}
                          >
                            {viewingId === d.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !semanticSearch ? (
          <div className="mt-4 flex justify-end">
            <Pagination pageCount={totalPages} page={page} onPageChange={setPage} />
          </div>
        ) : null}
      </div>

      {/* Iframe-based viewer */}
      <DocumentIframeModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        fileUrl={viewer.url}
        fileName={viewer.name}
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
