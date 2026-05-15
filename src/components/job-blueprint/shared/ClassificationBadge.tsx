import { cn } from '@/lib/utils'
import type { ClassificationTier } from '@/types/job-blueprint'
import { TIER_CONFIG } from '@/constants/job-blueprint/classification'

type ClassificationBadgeProps = {
  tier: ClassificationTier
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}

export function ClassificationBadge({ tier, className, size = 'md' }: ClassificationBadgeProps) {
  const config = TIER_CONFIG[tier]

  return (
    <span
      data-testid="classification-badge"
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        config.bgClass,
        sizeClasses[size],
        className
      )}
    >
      {config.label}
    </span>
  )
}
