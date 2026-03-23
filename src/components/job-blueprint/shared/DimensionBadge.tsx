import { cn } from '@/lib/utils'
import type { DimensionCategory } from '@/types/job-blueprint'
import { CATEGORY_COLORS } from '@/constants/job-blueprint/dimensions'

type DimensionBadgeProps = {
  name: string
  category: DimensionCategory
  score?: number
  className?: string
}

export function DimensionBadge({ name, category, score, className }: DimensionBadgeProps) {
  const colors = CATEGORY_COLORS[category]

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      colors.bg, colors.text, colors.border,
      className
    )}>
      {name}
      {score !== undefined && (
        <span className="font-bold">{Math.round(score)}%</span>
      )}
    </span>
  )
}
