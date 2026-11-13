import { Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { KCE_ACCESS_DENIED_MESSAGE } from "@/services/knowledge-continuity/authz"

/**
 * Shown in place of a KCE list or page when the server refused the caller (403).
 * It must never look like an empty state: a refusal and "nothing here yet" are
 * different answers.
 */
export function KceAccessNotice() {
  return (
    <Card role="alert">
      <CardContent className="flex items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{KCE_ACCESS_DENIED_MESSAGE}</span>
      </CardContent>
    </Card>
  )
}

/** One-line variant for pickers and inline lists. */
export function KceAccessInline() {
  return (
    <p role="alert" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {KCE_ACCESS_DENIED_MESSAGE}
    </p>
  )
}
