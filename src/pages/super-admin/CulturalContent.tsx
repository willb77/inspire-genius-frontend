import { useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DataTable,
  type Column,
} from "@/components/super-admin/organization/DataTable"
import Pagination from "@/components/shared/Pagination"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import {
  useKnowledgeDocuments,
  useUploadKnowledge,
  useDeleteKnowledge,
  useRevectorize,
} from "@/hooks/super-admin/knowledge/useKnowledge"
import type { KnowledgeDocument } from "@/services/super-admin/knowledge/knowledge.service"
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Database,
  Loader2,
  Users,
  Building2,
  MapPin,
} from "lucide-react"

type DocRow = KnowledgeDocument & Record<string, unknown>

const CULTURAL_TYPES = [
  { value: "all", label: "All Types" },
  { value: "demographic_context", label: "Demographic", icon: Users },
  { value: "institutional", label: "Institutional", icon: Building2 },
  { value: "regional", label: "Regional", icon: MapPin },
  { value: "corporate_culture", label: "Corporate Culture", icon: Globe },
]

const UPLOAD_TYPES = [
  { value: "demographic_context", label: "Demographic Context" },
  { value: "institutional", label: "Institutional" },
  { value: "regional", label: "Regional" },
]

const PAGE_SIZE = 20

function typeBadge(fileType: string | null) {
  switch (fileType) {
    case "demographic_context":
      return <Badge variant="outline" className="text-blue-600 border-blue-300">Demographic</Badge>
    case "institutional":
      return <Badge variant="outline" className="text-amber-600 border-amber-300">Institutional</Badge>
    case "regional":
      return <Badge variant="outline" className="text-green-600 border-green-300">Regional</Badge>
    case "corporate_culture":
      return <Badge variant="outline" className="text-purple-600 border-purple-300">Corporate</Badge>
    default:
      return <Badge variant="outline">{fileType ?? "unknown"}</Badge>
  }
}

function statusBadge(status: string | null) {
  switch (status) {
    case "completed":
      return <Badge variant="default" className="bg-green-600">Embedded</Badge>
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
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

export default function CulturalContent() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState("all")
  const [uploadOpen, setUploadOpen] = useState(false)

  // Filter by domain=cultural and optionally by file_type
  const params = {
    domain: "cultural",
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    ...(typeFilter !== "all" ? { file_type: typeFilter } : {}),
  }

  const { data, isLoading } = useKnowledgeDocuments(params)
  const deleteMutation = useDeleteKnowledge()
  const revectorizeMutation = useRevectorize()

  const documents = data?.documents ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Stats
  const demographicCount = documents.filter((d) => d.file_type === "demographic_context").length
  const institutionalCount = documents.filter((d) => d.file_type === "institutional").length
  const regionalCount = documents.filter((d) => d.file_type === "regional").length
  const corporateCount = documents.filter((d) => d.file_type === "corporate_culture").length

  const columns: Column<DocRow>[] = [
    {
      key: "filename",
      header: "Document",
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="font-medium truncate max-w-[300px]">{row.filename}</p>
        </div>
      ),
    },
    {
      key: "file_type",
      header: "Type",
      render: (row) => typeBadge(row.file_type),
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
            <Globe className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Cultural Content</h1>
              <p className="text-sm text-muted-foreground">
                Manage platform-curated cultural context for agent coaching
              </p>
            </div>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Cultural Document
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Demographic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{demographicCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Institutional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{institutionalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Regional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{regionalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                Corporate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{corporateCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How Cultural Context Works</CardTitle>
            <CardDescription>
              Cultural context documents are automatically injected into agent conversations
              when relevant. The retrieval system matches user queries against embedded cultural
              knowledge and provides agents with context to ensure culturally appropriate responses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-1">Demographic</p>
                <p className="text-muted-foreground">
                  Communication norms, religious awareness, generational differences
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-1">Institutional</p>
                <p className="text-muted-foreground">
                  Prison reentry, military transition, academic environments
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-1">Regional</p>
                <p className="text-muted-foreground">
                  US regional, UK professional, global remote team dynamics
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters + Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Select
                value={typeFilter}
                onValueChange={(v) => { setTypeFilter(v); setPage(1) }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CULTURAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton rows={8} />
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No cultural content found</p>
                <p className="text-sm">
                  Run the ingestion script or upload documents to get started.
                </p>
                <code className="mt-3 rounded bg-muted px-3 py-1.5 text-xs">
                  python scripts/ingest_cultural_context.py --dry-run
                </code>
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

      <UploadCulturalModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </SuperAdminLayout>
  )
}

// ── Upload Modal ────────────────────────────────────────────────────

function UploadCulturalModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [title, setTitle] = useState("")
  const [fileType, setFileType] = useState("")
  const [content, setContent] = useState("")

  const upload = useUploadKnowledge()

  function handleSubmit() {
    if (!title.trim() || !content.trim() || !fileType) return

    upload.mutate(
      {
        documents: [
          {
            document_id: crypto.randomUUID(),
            title: title.trim(),
            text: content.trim(),
            source: "admin-upload",
            category: fileType,
          },
        ],
      },
      {
        onSuccess: () => {
          setTitle("")
          setFileType("")
          setContent("")
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Cultural Context Document</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cc-title">Title</Label>
            <Input
              id="cc-title"
              placeholder="e.g. Communication Across Cultures"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Cultural Context Type</Label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {UPLOAD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cc-content">Content</Label>
            <Textarea
              id="cc-content"
              placeholder="Paste cultural context content here (Markdown supported)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="font-mono text-sm"
            />
            {content.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {content.length.toLocaleString()} characters ~{Math.ceil(content.length / 4).toLocaleString()} tokens
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || !fileType || upload.isPending}
          >
            {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload & Vectorize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
