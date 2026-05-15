import { cn } from '@/lib/utils'
import type { PipelineStep } from '@/types/job-blueprint'
import { PIPELINE_STEP_CONFIG } from '@/constants/job-blueprint/classification'

type PipelineStepBadgeProps = {
  step: PipelineStep
  className?: string
}

export function PipelineStepBadge({ step, className }: PipelineStepBadgeProps) {
  const config = PIPELINE_STEP_CONFIG[step] ?? {
    label: step,
    bgClass: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
      config.bgClass,
      className
    )}>
      {config.label}
    </span>
  )
}
