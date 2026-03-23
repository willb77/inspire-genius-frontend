import { cn } from '@/lib/utils'

type BMLProgressBarProps = {
  current: number
  total: number
  className?: string
}

export function BMLProgressBar({ current, total, className }: BMLProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Question {current} of {total}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-700 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
