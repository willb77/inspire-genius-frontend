import { AlertTriangle, CheckCircle2, CircleDashed, FileText, PlayCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PLAN_STATUS_LABEL } from "@/constants/development"
import type { PlanStatus } from "@/types/development"

const STATUS_META: Record<
  PlanStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; Icon: typeof CircleDashed; className?: string }
> = {
  no_plan: { variant: "outline", Icon: CircleDashed },
  draft: { variant: "secondary", Icon: FileText },
  active: { variant: "secondary", Icon: PlayCircle },
  on_track: { variant: "default", Icon: CheckCircle2, className: "bg-emerald-600 text-white" },
  at_risk: { variant: "destructive", Icon: AlertTriangle },
}

export type PlanStatusBadgeProps = {
  /**
   * `null` when the server withheld the plan (U6d). Renders nothing then, and
   * for any value this build does not know: a badge must never throw, and it
   * must never turn "withheld" into "No plan".
   */
  status: PlanStatus | null | undefined
  className?: string
}

/** Plan-status badge — icon + label so status is not conveyed by colour alone. */
export function PlanStatusBadge({ status, className }: PlanStatusBadgeProps) {
  const meta = status != null && Object.prototype.hasOwnProperty.call(STATUS_META, status) ? STATUS_META[status] : undefined
  if (!meta || status == null) return null
  const { variant, Icon, className: metaClass } = meta
  return (
    <Badge variant={variant} className={cn("gap-1", metaClass, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {PLAN_STATUS_LABEL[status]}
    </Badge>
  )
}
