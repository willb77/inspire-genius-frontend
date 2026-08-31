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
  status: PlanStatus
  className?: string
}

/** Plan-status badge — icon + label so status is not conveyed by colour alone. */
export function PlanStatusBadge({ status, className }: PlanStatusBadgeProps) {
  const { variant, Icon, className: metaClass } = STATUS_META[status]
  return (
    <Badge variant={variant} className={cn("gap-1", metaClass, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {PLAN_STATUS_LABEL[status]}
    </Badge>
  )
}
