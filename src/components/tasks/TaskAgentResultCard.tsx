/**
 * Shared result card for task-agent pages.
 *
 * Renders the agent's content + metadata + suggested next-step. Includes
 * "Re-run with different inputs" and "Save to my workspace" affordances.
 * Save POSTs to /v1/tasks/results (Combined Plan A.E3.4 follow-up).
 */
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { tasksService, type TaskAgentResponse } from "@/services/tasks/tasks.service"

interface Props {
  result: TaskAgentResponse
  onRerun: () => void
  taskSlug?: string
  agentId?: string
  requestPayload?: Record<string, unknown>
  title?: string
}

export default function TaskAgentResultCard({
  result,
  onRerun,
  taskSlug,
  agentId,
  requestPayload,
  title,
}: Props) {
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: tasksService.saveResult,
    onSuccess: () => {
      setSaved(true)
      toast.success("Saved to your workspace.")
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Save failed"
      toast.error(`Could not save: ${message}`)
    },
  })

  const handleSave = () => {
    if (!taskSlug || !agentId) {
      toast.error("Cannot save: missing task identity.")
      return
    }
    save.mutate({
      task_slug: taskSlug,
      agent_id: agentId,
      request_payload: requestPayload ?? {},
      result_payload: result as unknown as Record<string, unknown>,
      confidence: result.confidence,
      title: title ?? result.agent_name,
    })
  }

  const canSave = Boolean(taskSlug && agentId)

  return (
    <Card className="border-emerald-200 bg-emerald-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-emerald-700">{result.agent_name}</span>
            <Badge variant="outline" className="text-xs font-normal">
              confidence {Math.round(result.confidence * 100)}%
            </Badge>
            {typeof result.metadata?.elapsed_ms === "number" && (
              <Badge variant="outline" className="text-xs font-normal">
                {Math.round(result.metadata.elapsed_ms as number)} ms
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-800">
          {result.content}
        </div>

        {result.suggested_next && (
          <div className="rounded-md bg-emerald-100/60 px-3 py-2 text-sm text-emerald-900">
            <span className="font-medium">Suggested next:</span> {result.suggested_next}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onRerun}>
            Re-run with different inputs
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || save.isPending || saved}
          >
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saved ? "Saved" : "Save to my workspace"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
