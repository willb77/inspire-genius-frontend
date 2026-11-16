import type { TFunction } from 'i18next'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

type LikertScaleProps = {
  questionId: string
  value: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
}

function scaleLabel(t: TFunction, n: number): string | undefined {
  switch (n) {
    case 1:
      return t("likert.stronglyDisagree", { defaultValue: "Strongly Disagree" })
    case 2:
      return t("likert.disagree", { defaultValue: "Disagree" })
    case 3:
      return t("likert.somewhatDisagree", { defaultValue: "Somewhat Disagree" })
    case 4:
      return t("likert.neutral", { defaultValue: "Neutral" })
    case 5:
      return t("likert.somewhatAgree", { defaultValue: "Somewhat Agree" })
    case 6:
      return t("likert.agree", { defaultValue: "Agree" })
    case 7:
      return t("likert.stronglyAgree", { defaultValue: "Strongly Agree" })
    default:
      return undefined
  }
}

export function LikertScale({
  questionId: _questionId,
  value,
  onChange,
  min = 1,
  max = 7,
  minLabel,
  maxLabel,
}: LikertScaleProps) {
  const { t } = useTranslation("jobBlueprintPages")
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{minLabel ?? t("likert.stronglyDisagree", { defaultValue: "Strongly Disagree" })}</span>
        <span>{maxLabel ?? t("likert.stronglyAgree", { defaultValue: "Strongly Agree" })}</span>
      </div>
      <div className="flex justify-between gap-1" role="radiogroup" aria-label={t("likert.groupLabel", { defaultValue: "Likert scale" })}>
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            aria-label={scaleLabel(t, opt) ?? `${opt}`}
            onClick={() => onChange(opt)}
            className={cn(
              'flex-1 py-3 rounded-lg text-sm font-medium transition-all border',
              value === opt
                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-xs text-center text-slate-500">{scaleLabel(t, value)}</p>
      )}
    </div>
  )
}
