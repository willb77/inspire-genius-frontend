import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { History } from "lucide-react"
import type { SystemPrompt } from "@/types/prompt-builder"

type PromptVersionHistoryProps = {
  versions: SystemPrompt[]
  isLoading?: boolean
  onSelectVersion: (prompt: SystemPrompt) => void
}

export default function PromptVersionHistory({
  versions,
  isLoading,
  onSelectVersion,
}: PromptVersionHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="size-4" /> Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!versions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="size-4" /> Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No versions yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="size-4" /> Version History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[300px] overflow-auto">
        {versions.map((v) => (
          <Button
            key={v.id}
            variant="ghost"
            className="w-full justify-start text-sm h-auto py-2"
            onClick={() => onSelectVersion(v)}
          >
            <div className="text-left">
              <div className="font-medium">v{v.version}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(v.created_at).toLocaleString()}
              </div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
