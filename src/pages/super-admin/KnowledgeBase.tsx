import { useState } from "react"
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
import {
  BookOpen,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Database,
} from "lucide-react"

type DocRow = KnowledgeDocument & Record<string, unknown>

const DOMAINS = [
  { value: "all", label: "All Domains" },
  { value: "coaching", label: "Coaching" },
  { value: "business", label: "Business" },
  { value: "system", label: "System" },
  { value: "career", label: "Career & Talent" },
  { value: "general", label: "General" },
  { value: "prism_report", label: "PRISM Reports" },
  { value: "cultural", label: "Cultural Context" },
]

const PAGE_SIZE = 20

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
  const [page, setPage] = useState(1)
  const [domainFilter, setDomainFilter] = useState("all")
  const [uploadOpen, setUploadOpen] = useState(false)

  const params = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    ...(domainFilter !== "all" ? { domain: domainFilter } : {}),
  }

  const { data, isLoading } = useKnowledgeDocuments(params)
  const deleteMutation = useDeleteKnowledge()
  const revectorizeMutation = useRevectorize()

  const documents = data?.documents ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

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
      key: "file_type",
      header: "Domain",
      render: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.file_type ?? "general"}
        </Badge>
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Select
                value={domainFilter}
                onValueChange={(v) => { setDomainFilter(v); setPage(1) }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
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
                <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No documents found</p>
                <p className="text-sm">Upload a knowledge document to get started.</p>
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
