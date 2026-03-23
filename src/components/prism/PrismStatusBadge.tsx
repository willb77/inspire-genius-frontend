import { Badge } from '@/components/ui/badge'
import { STATUS_CONFIG } from '@/constants/prism'
import type { AssessmentStatus } from '@/types/prism/assessment-types'

type PrismStatusBadgeProps = {
  status: AssessmentStatus
}

export default function PrismStatusBadge({ status }: PrismStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return <Badge variant={config.variant}>{config.label}</Badge>
}
