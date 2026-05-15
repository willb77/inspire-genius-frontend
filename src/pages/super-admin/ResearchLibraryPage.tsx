/**
 * /super-admin/research-library — saved task-result browser.
 *
 * Lists the caller's own saved task-agent runs (defaults to the
 * `document-research` slug so the workspace shows research questions
 * + responses by default). Click a card to expand the full Q + A;
 * the detail body is loaded on demand from
 * `GET /v1/tasks/results/{result_id}`.
 *
 * Backed by:
 *   GET    /v1/tasks/results
 *   GET    /v1/tasks/results/{id}
 *   DELETE /v1/tasks/results/{id}
 *
 * All endpoints are agent-engine routes (extracted from the monolith
 * 2026-05-15). The legacy monolith handlers stay in place as a
 * rollback path; the tasksService accepts either response shape.
 */
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BookHeart, Loader2, Trash2, ArrowLeft, Search } from "lucide-react"
import { toast } from "sonner"

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  useDeleteTaskResult,
  useListTaskResults,
  useTaskResultDetail,
} from "@/hooks/tasks/useTaskResults"
import { ROUTES } from "@/constants/routes"

const TASK_SLUG_OPTIONS = [
  { value: "document-research", label: "Document Research" },
  { value: "job-blueprint",     label: "Job Blueprint" },
  { value: "interview-prep",    label: "Interview Prep" },
  { value: "team-composition",  label: "Team Composition" },
  { value: "onboarding",        label: "Onboarding Flow" },
  { value: "__all__",           label: "All saved results" },
] as const


function formatCreatedAt(value: string): string {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}


function ResultDetailPanel({
  resultId,
  onClose,
  onDeleted,
}: {
  resultId: string
  onClose: () => void
  onDeleted: () => void
}) {
  const { data, isLoading, isError, error } = useTaskResultDetail(resultId)
  const deleteMut = useDeleteTaskResult()

  const handleDelete = () => {
    if (!window.confirm("Delete this saved research entry? This cannot be undone.")) return
    deleteMut.mutate(resultId, {
      onSuccess: () => {
        toast.success("Deleted.")
        onDeleted()
      },
      onError: (err) => {
        toast.error(`Delete failed: ${err.message}`)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Could not load this saved result{error ? `: ${error.message}` : "."}
      </div>
    )
  }

  const question = (() => {
    const q = data.request_payload?.question
    return typeof q === "string" ? q : null
  })()
  const answer = (() => {
    const a = data.result_payload?.content
    return typeof a === "string" ? a : null
  })()
  const agentName = (() => {
    const n = data.result_payload?.agent_name
    return typeof n === "string" ? n : data.agent_id
  })()

  return (
    <Card className="border-emerald-200 bg-emerald-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-emerald-700">{data.title || agentName}</span>
            <Badge variant="outline" className="text-xs font-normal">{data.task_slug}</Badge>
            {typeof data.confidence === "number" && (
              <Badge variant="outline" className="text-xs font-normal">
                confidence {Math.round(data.confidence * 100)}%
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="text-red-700 hover:bg-red-100 hover:text-red-800"
            >
              {deleteMut.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500">Saved {formatCreatedAt(data.created_at)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {question && (
          <section className="rounded-md bg-white/70 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Question</h3>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">{question}</p>
          </section>
        )}
        {answer && (
          <section className="rounded-md bg-white/70 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">{agentName}'s response</h3>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">{answer}</p>
          </section>
        )}
        {data.note && (
          <section className="rounded-md bg-amber-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-amber-900">Note</h3>
            <p className="mt-1 whitespace-pre-wrap text-amber-900">{data.note}</p>
          </section>
        )}
      </CardContent>
    </Card>
  )
}


function ResultRowCard({
  row,
  onOpen,
}: {
  row: { id: string; title: string | null; agent_id: string; task_slug: string; created_at: string; confidence: number | null }
  onOpen: () => void
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className="cursor-pointer transition hover:border-emerald-300 hover:shadow-sm"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="truncate">{row.title || row.agent_id}</span>
          <Badge variant="outline" className="text-xs font-normal">{row.task_slug}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-slate-500 flex items-center justify-between">
        <span>{formatCreatedAt(row.created_at)}</span>
        {typeof row.confidence === "number" && (
          <span>confidence {Math.round(row.confidence * 100)}%</span>
        )}
      </CardContent>
    </Card>
  )
}


export default function ResearchLibraryPage() {
  const [taskSlug, setTaskSlug] = useState<string>("document-research")
  const [searchQuery, setSearchQuery] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  const queryParams = useMemo(
    () => ({
      task_slug: taskSlug === "__all__" ? undefined : taskSlug,
      limit: 100,
    }),
    [taskSlug],
  )

  const { data, isLoading, isError, refetch } = useListTaskResults(queryParams)

  const filteredRows = useMemo(() => {
    const rows = data?.data ?? []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = `${r.title ?? ""} ${r.agent_id} ${r.task_slug}`.toLowerCase()
      return hay.includes(q)
    })
  }, [data, searchQuery])

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-5xl py-8 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BookHeart className="h-6 w-6 text-emerald-700" /> Research Library
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Every research question you've saved, with the agent's response.
              Filter by task type or search by title.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to={ROUTES.SUPER_ADMIN.RESEARCH}>Ask a new research question</Link>
          </Button>
        </header>

        {openId ? (
          <ResultDetailPanel
            resultId={openId}
            onClose={() => setOpenId(null)}
            onDeleted={() => {
              setOpenId(null)
              refetch()
            }}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-8"
                  placeholder="Search by title or agent…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search saved results"
                />
              </div>
              <Select value={taskSlug} onValueChange={setTaskSlug}>
                <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filter by task type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_SLUG_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}

            {isError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Could not load saved research.{" "}
                <button className="underline" onClick={() => refetch()}>Retry</button>
              </div>
            )}

            {!isLoading && !isError && filteredRows.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                No saved results yet.{" "}
                <Link to={ROUTES.SUPER_ADMIN.RESEARCH} className="text-emerald-700 underline">
                  Run a research question
                </Link>{" "}
                and click "Save to my workspace" — it'll appear here.
              </div>
            )}

            {!isLoading && !isError && filteredRows.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRows.map((row) => (
                  <ResultRowCard key={row.id} row={row} onOpen={() => setOpenId(row.id)} />
                ))}
              </div>
            )}

            {data && data.total > filteredRows.length && (
              <p className="text-xs text-slate-500 text-center">
                Showing {filteredRows.length} of {data.total} saved results.
                Refine the filter to see more.
              </p>
            )}
          </>
        )}
      </div>
    </SuperAdminLayout>
  )
}
