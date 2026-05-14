import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RoutingHealth, RoutingTrace } from "@/types/explainability/types"

export type RoutingTraceBadgeProps = {
  trace: RoutingTrace | null
  className?: string
}

export function RoutingTraceBadge({ trace, className }: RoutingTraceBadgeProps) {
  if (!trace) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        no routing trace
      </Badge>
    )
  }
  const score = trace.intent_score ?? trace.confidence
  const intent = trace.intent ?? trace.intent_class ?? "unknown"
  const tone =
    typeof score === "number" && score < 0.55
      ? "destructive"
      : typeof score === "number" && score < 0.75
      ? "secondary"
      : "default"
  return (
    <Badge variant={tone as "default" | "secondary" | "destructive"} className={className}>
      {intent}
      {typeof score === "number" ? ` · ${(score * 100).toFixed(0)}%` : ""}
    </Badge>
  )
}

export type HealthBadgeProps = {
  health: RoutingHealth
  className?: string
}

export function HealthBadge({ health, className }: HealthBadgeProps) {
  const colour =
    health === "green"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
      : health === "amber"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40"
      : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40"
  return (
    <Badge variant="outline" className={cn(colour, "capitalize", className)}>
      {health}
    </Badge>
  )
}
