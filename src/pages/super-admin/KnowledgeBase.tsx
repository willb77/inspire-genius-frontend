import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DataTable,
  type Column,
} from "@/components/super-admin/organization/DataTable"
import Pagination from "@/components/shared/Pagination"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import UploadKnowledgeModal from "@/components/super-admin/UploadKnowledgeModal"
import {
  useKnowledgeDocuments,
  useDeleteKnowledge,
  useRevectorize,
} from "@/hooks/super-admin/knowledge/useKnowledge"
import type { KnowledgeDocument } from "@/services/super-admin/knowledge/knowledge.service"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Database,
  Search,
  X,
} from "lucide-react"
import { Input } from "@/components/ui/input"

type DocRow = KnowledgeDocument & Record<string, unknown>

/**
 * Domain vocabulary. Mirrors `KNOWN_DOMAINS` in the agent-engine's
 * `routes/ingestion.py`, plus the `uncategorised` sentinel the API returns for
 * rows that carry no domain signal at all.
 *
 * `uncategorised` is not a stored value — server-side it is an IS NULL test.
 * It is offered here because on staging-b it is where 121 of 147 rows live:
 * without a way to select it, those rows were reachable only through "All",
 * and every named domain looked broken rather than genuinely empty.
 *
 * One list drives the chips, the dropdown and the URL-param allowlist, so
 * they cannot drift apart.
 */
const DOMAINS = [
  { value: "all", label: "All Domains", chip: "All" },
  { value: "coaching", label: "Coaching", chip: "Coaching" },
  { value: "business", label: "Business", chip: "Business" },
  { value: "system", label: "System", chip: "System" },
  { value: "career", label: "Career & Talent", chip: "Career" },
  { value: "general", label: "General", chip: "General" },
  { value: "prism_report", label: "PRISM Reports", chip: "PRISM" },
  { value: "cultural", label: "Cultural Context", chip: "Cultural" },
  { value: "uncategorised", label: "Uncategorised", chip: "Uncategorised" },
] as const

// Set<string>, not the literal union `as const` would infer — this is
// membership-tested against an arbitrary URL query param.
const VALID_DOMAINS = new Set<string>(DOMAINS.map((d) => d.value))

const DOMAIN_LABELS: Record<string, string> = Object.fromEntries(
  DOMAINS.filter((d) => d.value !== "all").map((d) => [d.value, d.label]),
)

/**
 * Document TYPE vocabulary. `value` is the exact `documents.content_type`
 * (a MIME type) the API filters on; the label is what a human reads.
 *
 * A curated list rather than one derived from the current page: deriving it
 * from `documents` would only ever offer the types present in the 20 rows
 * on screen, so filtering to a type would be impossible precisely when it is
 * most useful — a corpus too large to eyeball.
 */
const FILE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "application/pdf", label: "PDF" },
  { value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word (.docx)" },
  { value: "application/msword", label: "Word (.doc)" },
  { value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel (.xlsx)" },
  { value: "text/csv", label: "CSV" },
  { value: "text/plain", label: "Plain text" },
  { value: "text/markdown", label: "Markdown" },
  { value: "application/json", label: "JSON" },
] as const

const VALID_FILE_TYPES = new Set<string>(FILE_TYPES.map((t) => t.value))

/** Debounce a fast-changing value so typing does not fire a request per key. */
function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

const PAGE_SIZE = 20

/** MIME types are long and repetitive; the tail is the informative part. */
function formatContentType(contentType: string | null) {
  if (!contentType) return "—"
  const known: Record<string, string> = {
    "text/csv": "CSV",
    "text/plain": "TXT",
    "text/markdown": "MD",
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  }
  if (known[contentType]) return known[contentType]
  if (contentType.startsWith("image/")) return contentType.slice(6).toUpperCase()
  return contentType
}

function statusBadge(status: string | null) {
  switch (status) {
    case "completed":
      return <Badge variant="default" className="bg-green-600">Embedded</Badge>
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    case "deleted":
      return <Badge variant="outline">Deleted</Badge>
    default:
      return <Badge variant="outline">{status ?? "unknown"}</Badge>
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export default function KnowledgeBase() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialDomain = useMemo(() => {
    const raw = searchParams.get("domain")
    return raw && VALID_DOMAINS.has(raw) ? raw : "all"
  }, [searchParams])

  const initialFileType = useMemo(() => {
    const raw = searchParams.get("type")
    return raw && VALID_FILE_TYPES.has(raw) ? raw : "all"
  }, [searchParams])

  const [page, setPage] = useState(1)
  const [domainFilter, setDomainFilter] = useState(initialDomain)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "")
  const [fileTypeFilter, setFileTypeFilter] = useState(initialFileType)
  const [startDate, setStartDate] = useState(() => searchParams.get("from") ?? "")
  const [endDate, setEndDate] = useState(() => searchParams.get("to") ?? "")

  const search = useDebounced(searchInput)

  // Any narrowing change invalidates the current page number: staying on
  // page 4 of a result set that is now one page long renders an empty table
  // that looks exactly like "no matches".
  useEffect(() => {
    setPage(1)
  }, [search, fileTypeFilter, startDate, endDate])

  // Keep state synced when the URL changes externally (e.g., from a redirect or chip click).
  useEffect(() => {
    setDomainFilter((current) =>
      current === initialDomain ? current : initialDomain,
    )
    setPage(1)
  }, [initialDomain])

  // Mirror the non-domain filters into the URL so a filtered view can be
  // shared or reloaded. `replace` so filtering does not stack history entries.
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    const setOrDelete = (key: string, value: string) => {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setOrDelete("q", search.trim())
    setOrDelete("type", fileTypeFilter === "all" ? "" : fileTypeFilter)
    setOrDelete("from", startDate)
    setOrDelete("to", endDate)
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
    // searchParams intentionally omitted: including it re-runs this effect
    // with the value it just wrote and loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fileTypeFilter, startDate, endDate])

  function applyDomainFilter(next: string) {
    setDomainFilter(next)
    setPage(1)
    const nextParams = new URLSearchParams(searchParams)
    if (next === "all") {
      nextParams.delete("domain")
    } else {
      nextParams.set("domain", next)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const params = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    ...(domainFilter !== "all" ? { domain: domainFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(fileTypeFilter !== "all" ? { file_type: fileTypeFilter } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
  }

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (domainFilter !== "all" ? 1 : 0) +
    (fileTypeFilter !== "all" ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0)

  function clearAllFilters() {
    setSearchInput("")
    setFileTypeFilter("all")
    setStartDate("")
    setEndDate("")
    applyDomainFilter("all")
  }

  const { data, isLoading } = useKnowledgeDocuments(params)
  const deleteMutation = useDeleteKnowledge()
  const revectorizeMutation = useRevectorize()

  const documents = data?.documents ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Per-domain row counts from the server, computed over the same expression
  // the filter uses and NOT narrowed by the active domain. Shown on the chips
  // so an empty table reads as "this domain holds nothing, and here is where
  // the rows actually are" rather than as a filter that does not work — which
  // is exactly how the old, genuinely-broken filter presented.
  //
  // Absent on an agent-engine older than this change. Distinguish "no counts
  // available" from "counts are all zero" — rendering 0 on every chip would
  // be a confident lie, and worse than rendering nothing.
  const domainCounts = data?.domain_counts
  const countFor = (value: string): number | null => {
    if (!domainCounts) return null
    if (value === "all") {
      return Object.values(domainCounts).reduce((sum, n) => sum + n, 0)
    }
    return domainCounts[value] ?? 0
  }

  const columns: Column<DocRow>[] = [
    {
      key: "filename",
      header: "Document",
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate max-w-[280px]">{row.filename}</p>
            {row.agent_id && (
              <p className="text-xs text-muted-foreground">Agent: {row.agent_id}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      // Was `row.file_type` — which the API populates from `content_type`, so
      // this column rendered MIME types under a "Domain" header. `row.domain`
      // is the real thing, derived server-side by the same expression the
      // filter matches on.
      key: "domain",
      header: "Domain",
      render: (row) =>
        row.domain ? (
          <Badge variant="outline">
            {DOMAIN_LABELS[row.domain] ?? row.domain}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Uncategorised
          </Badge>
        ),
    },
    {
      // The MIME type kept its place in the table, under an honest header.
      key: "file_type",
      header: "Type",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatContentType(row.file_type)}
        </span>
      ),
    },
    {
      key: "chunk_count",
      header: "Chunks",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="tabular-nums">{row.chunk_count}</span>
        </div>
      ),
    },
    {
      key: "text_length",
      header: "Size",
      render: (row) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {row.text_length > 0
            ? `${(row.text_length / 1000).toFixed(1)}k chars`
            : "—"}
        </span>
      ),
    },
    {
      key: "embedding_status",
      header: "Status",
      render: (row) => statusBadge(row.embedding_status),
    },
    {
      key: "created_at",
      header: "Created",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Re-vectorize"
            disabled={revectorizeMutation.isPending}
            onClick={() => revectorizeMutation.mutate(row.id)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Delete "${row.filename}"? This removes all chunks.`)) {
                deleteMutation.mutate(row.id)
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground">
                Manage agent knowledge documents and RAG embeddings
              </p>
            </div>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>

        {/* Saved-filter chips */}
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Domain filter presets"
        >
          {DOMAINS.map((domain) => {
            const active = domainFilter === domain.value
            const count = countFor(domain.value)
            return (
              <button
                key={domain.value}
                type="button"
                aria-pressed={active}
                onClick={() => applyDomainFilter(domain.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : count === 0
                      ? "border-border bg-background text-muted-foreground/60 hover:bg-muted"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {domain.chip}
                {count !== null && (
                  <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Embedded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {documents.filter((d) => d.embedding_status === "completed").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Chunks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {documents.reduce((sum, d) => sum + d.chunk_count, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters + Table */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Documents</CardTitle>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
                </Button>
              )}
            </div>

            {/*
              Search across the four axes the corpus is actually navigated by:
              NAME (free text), TOPIC (domain), DATE (upload range) and TYPE
              (MIME). All four are sent to the API and applied server-side —
              filtering client-side would only ever search the 20 rows of the
              current page, so a hit on page 2 would render as "no documents",
              which is the same thing the page shows when a document genuinely
              is not there.
            */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Search documents by name"
                  placeholder="Search by document name…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={domainFilter} onValueChange={applyDomainFilter}>
                <SelectTrigger aria-label="Filter by topic">
                  <SelectValue placeholder="All Domains" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger aria-label="Filter by document type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 lg:col-span-2">
                <label className="text-xs text-muted-foreground shrink-0" htmlFor="kb-from">
                  Uploaded
                </label>
                <Input
                  id="kb-from"
                  type="date"
                  aria-label="Uploaded on or after"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  aria-label="Uploaded on or before"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton rows={8} />
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No documents found</p>
                {/* Say where the rows ARE. A bare "no documents" on a table
                    holding 147 of them is how the broken domain filter stayed
                    unnoticed — it looked like an empty knowledge base. */}
                {/* With search/type/date filters live, an empty table is far
                    more often "your filters match nothing" than "the corpus is
                    empty". Say which, and offer the way out — otherwise a
                    mistyped filename reads as a missing knowledge base. */}
                {activeFilterCount > 0 ? (
                  <p className="text-sm text-center max-w-md">
                    No documents match the {activeFilterCount} active filter
                    {activeFilterCount === 1 ? "" : "s"}
                    {search.trim() ? <> (name contains &ldquo;{search.trim()}&rdquo;)</> : null}.{" "}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={clearAllFilters}
                    >
                      Clear all filters
                    </button>
                  </p>
                ) : domainFilter !== "all" && (countFor("all") ?? 0) > 0 ? (
                  <p className="text-sm">
                    Nothing in {DOMAIN_LABELS[domainFilter] ?? domainFilter}.{" "}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={() => applyDomainFilter("all")}
                    >
                      Show all {countFor("all")} documents
                    </button>
                  </p>
                ) : (
                  <p className="text-sm">Upload a knowledge document to get started.</p>
                )}
              </div>
            ) : (
              <>
                <DataTable columns={columns} data={documents as DocRow[]} />
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      page={page}
                      pageCount={totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <UploadKnowledgeModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </SuperAdminLayout>
  )
}
