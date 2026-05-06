/**
 * /super-admin/research — Sage (DocumentAgent) document research (Combined Plan §A.E3.4).
 */
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

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

const schema = z.object({
  question: z.string().min(1).max(4000),
  document_filter_tags: z.string().optional(),
  summarize_only: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function DocumentResearchPage() {
  const [result, setResult] = useState<TaskAgentResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<Record<string, unknown>>({})

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

  if (result) {
    return (
      <SuperAdminLayout>
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
        </div>
      </SuperAdminLayout>
    )
  }

  return (
    <SuperAdminLayout>
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
    </SuperAdminLayout>
  )
}
