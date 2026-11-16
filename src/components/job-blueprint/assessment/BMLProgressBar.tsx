import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

type BMLProgressBarProps = {
  current: number
  total: number
  className?: string
}

export function BMLProgressBar({ current, total, className }: BMLProgressBarProps) {
  const { t } = useTranslation("jobBlueprintPages")
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{t("progress.question", { defaultValue: "Question {{current}} of {{total}}", current, total })}</span>
        <span>{t("progress.complete", { defaultValue: "{{pct}}% complete", pct })}</span>
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
