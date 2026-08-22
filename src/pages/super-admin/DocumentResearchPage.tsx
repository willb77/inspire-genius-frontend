/**
 * /super-admin/research — Sage (DocumentAgent) document research (Combined Plan §A.E3.4).
 */
import { Fragment, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2, FileText, FileDown, FileSpreadsheet, FileType2, Mail } from "lucide-react"

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { tasksService, type TaskAgentResponse } from "@/services/tasks/tasks.service"
import TaskAgentResultCard from "@/components/tasks/TaskAgentResultCard"
import CostEstimateBanner from "@/components/tasks/CostEstimateBanner"
import { toast } from "sonner"
import {
  exportResearchMarkdown,
  exportResearchPdf,
  exportResearchWord,
  exportResearchExcel,
  emailResearch,
  type ResearchExportPayload,
} from "@/lib/exportResearch"

const schema = z.object({
  question: z.string().min(1).max(4000),
  document_filter_tags: z.string().optional(),
  summarize_only: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function DocumentResearchPage({ embedded = false }: { embedded?: boolean } = {}) {
  // When `embedded` (rendered inside the consolidated Research page's tabs), skip
  // SuperAdminLayout so we don't double-wrap the chrome.
  const Wrapper = embedded ? Fragment : SuperAdminLayout
  const [result, setResult] = useState<TaskAgentResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<Record<string, unknown>>({})
  // Stamped when the answer lands, not when it is exported — an export run
  // ten minutes later must not claim the research is ten minutes newer.
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      question: "",
      document_filter_tags: "",
      summarize_only: false,
    },
  })

  const mutation = useMutation({
    mutationFn: tasksService.documentResearch,
    onSuccess: (data) => {
      setResult(data)
      setGeneratedAt(new Date())
      toast.success("Research complete.")
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Research failed"
      toast.error(`Sage (DocumentAgent) failed: ${message}`)
    },
  })

  const onSubmit = (values: FormValues) => {
    const tags = values.document_filter_tags
      ? values.document_filter_tags.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined
    const payload = {
      question: values.question,
      document_filter_tags: tags,
      summarize_only: values.summarize_only,
    }
    setLastRequest(payload as Record<string, unknown>)
    mutation.mutate(payload)
  }

  const exportPayload = (): ResearchExportPayload => ({
    question: String(lastRequest.question ?? ""),
    answer: result?.content ?? "",
    agentName: result?.agent_name ?? "Sage (DocumentAgent)",
    confidence: result?.confidence ?? 0,
    suggestedNext: result?.suggested_next ?? null,
    metadata: result?.metadata ?? {},
    filterTags: (lastRequest.document_filter_tags as string[] | undefined) ?? [],
    summarizeOnly: Boolean(lastRequest.summarize_only),
    generatedAt: generatedAt ?? new Date(),
  })

  /** Run one export, surfacing real failures instead of a blanket success. */
  async function runExport(key: string, label: string, fn: () => void | Promise<void>) {
    setExporting(key)
    try {
      await fn()
      toast.success(`Exported as ${label}.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(`${label} export failed: ${message}`)
    } finally {
      setExporting(null)
    }
  }

  const EXPORTS = [
    { key: "word", label: "Word", icon: FileType2, run: () => exportResearchWord(exportPayload()) },
    { key: "pdf", label: "PDF", icon: FileDown, run: () => exportResearchPdf(exportPayload()) },
    { key: "md", label: "Markdown", icon: FileText, run: () => exportResearchMarkdown(exportPayload()) },
    { key: "xlsx", label: "Excel", icon: FileSpreadsheet, run: () => exportResearchExcel(exportPayload()) },
  ] as const

  if (result) {
    return (
      <Wrapper>
        <div className="mx-auto max-w-3xl py-8 space-y-4">
          <h1 className="text-2xl font-semibold">Document Research</h1>
          <TaskAgentResultCard
            result={result}
            onRerun={() => setResult(null)}
            taskSlug="document-research"
            agentId="sage"
            requestPayload={lastRequest}
            title="Document research"
          />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Export this result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {EXPORTS.map((item) => (
                  <Button
                    key={item.key}
                    variant="outline"
                    size="sm"
                    disabled={exporting !== null}
                    onClick={() => void runExport(item.key, item.label, item.run)}
                  >
                    {exporting === item.key ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <item.icon className="mr-2 h-4 w-4" />
                    )}
                    {item.label}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() =>
                    void runExport("email", "Email", () => {
                      const { truncated } = emailResearch(exportPayload())
                      if (truncated) {
                        toast.info(
                          "Answer too long for an email body — the full Markdown was downloaded to attach.",
                        )
                      }
                    })
                  }
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Every export carries the question, agent, confidence, document filter and
                timestamp, so a forwarded copy can still be traced back to the query that
                produced it. Email opens a draft in your mail client — there is no
                server-side send on this surface.
              </p>
            </CardContent>
          </Card>
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <div className="mx-auto max-w-3xl py-8 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Document Research</h1>
          <p className="text-sm text-slate-600">
            Ask a research question grounded in the org's document corpus via Sage (DocumentAgent).
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="question">Research question</Label>
                <Textarea id="question" rows={4} {...form.register("question")} />
                {form.formState.errors.question && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.question.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="document_filter_tags">
                  Filter to document tags (comma-separated, optional)
                </Label>
                <Input
                  id="document_filter_tags"
                  placeholder="hr, leadership-models, q3-2025"
                  {...form.register("document_filter_tags")}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="summarize_only"
                  checked={!!form.watch("summarize_only")}
                  onCheckedChange={(checked) => form.setValue("summarize_only", !!checked)}
                />
                <Label htmlFor="summarize_only" className="text-sm">
                  Summarise relevant passages only (no extended analysis)
                </Label>
              </div>

              <CostEstimateBanner promptText={JSON.stringify(form.watch())} />

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Sage
                </Button>
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Wrapper>
  )
}
