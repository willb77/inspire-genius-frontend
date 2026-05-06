/**
 * Shared result card for task-agent pages.
 *
 * Renders the agent's content + metadata + suggested next-step. Includes
 * "Re-run with different inputs" and "Save to my workspace" affordances.
 * Save is a no-op placeholder until the monolith POST /v1/tasks/results
 * endpoint is built (see Combined Plan §A.E3.4 follow-up).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { TaskAgentResponse } from "@/services/tasks/tasks.service"

interface Props {
  result: TaskAgentResponse
  onRerun: () => void
}

export default function TaskAgentResultCard({ result, onRerun }: Props) {
  const handleSave = () => {
    // TODO: POST /v1/tasks/results once the monolith endpoint lands.
    toast.success("Saved to your workspace (placeholder).")
  }

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
          <Button onClick={handleSave}>Save to my workspace</Button>
        </div>
      </CardContent>
    </Card>
  )
}
