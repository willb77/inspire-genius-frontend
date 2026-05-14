import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { RagSource } from "@/types/explainability/types"

export type SourceProvenanceTagProps = {
  source: RagSource
}

export function SourceProvenanceTag({ source }: SourceProvenanceTagProps) {
  const similarityPct =
    typeof source.similarity === "number" ? `${(source.similarity * 100).toFixed(0)}%` : "—"
  const label = source.filename ?? source.document_id ?? "unknown source"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="cursor-help font-mono text-[11px]">
            {label}
            <span className="ml-1 text-muted-foreground">· {similarityPct}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <div className="space-y-1">
            <div>
              <span className="font-semibold">document_id:</span>{" "}
              <span className="font-mono">{source.document_id ?? "—"}</span>
            </div>
            {source.chunk_index !== undefined && (
              <div>
                <span className="font-semibold">chunk:</span> {source.chunk_index}
              </div>
            )}
            <div>
              <span className="font-semibold">similarity:</span> {similarityPct}
            </div>
            <div>
              <span className="font-semibold">scope:</span> {source.scope ?? "—"}
            </div>
            {source.owner_user_id && (
              <div>
                <span className="font-semibold">owner_user_id:</span>{" "}
                <span className="font-mono">{source.owner_user_id}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
