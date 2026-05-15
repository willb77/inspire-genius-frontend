import { cn } from '@/lib/utils'

type ScoreBarProps = {
  score: number // 0-100
  maxScore?: number
  label?: string
  showValue?: boolean
  color?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
}

function getDefaultColor(score: number): string {
  if (score >= 85) return 'bg-green-500'
  if (score >= 65) return 'bg-blue-500'
  if (score >= 45) return 'bg-yellow-500'
  if (score >= 25) return 'bg-orange-500'
  return 'bg-red-500'
}

export function ScoreBar({ score, maxScore = 100, label, showValue = true, color, className, size = 'md' }: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100))
  const barColor = color ?? getDefaultColor(score)

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs font-medium text-slate-600 truncate">{label}</span>}
          {showValue && <span className="text-xs font-semibold text-slate-700 ml-2">{Math.round(score)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-slate-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
