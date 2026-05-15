import { cn } from '@/lib/utils'

type LikertScaleProps = {
  questionId: string
  value: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
}

const LABELS: Record<number, string> = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Somewhat Disagree',
  4: 'Neutral',
  5: 'Somewhat Agree',
  6: 'Agree',
  7: 'Strongly Agree',
}

export function LikertScale({
  questionId: _questionId,
  value,
  onChange,
  min = 1,
  max = 7,
  minLabel = 'Strongly Disagree',
  maxLabel = 'Strongly Agree',
}: LikertScaleProps) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      <div className="flex justify-between gap-1" role="radiogroup" aria-label="Likert scale">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            aria-label={LABELS[opt] ?? `${opt}`}
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
        <p className="text-xs text-center text-slate-500">{LABELS[value]}</p>
      )}
    </div>
  )
}
