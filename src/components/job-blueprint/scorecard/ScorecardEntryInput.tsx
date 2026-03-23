import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ScorecardScore } from '@/types/job-blueprint'

type ScorecardEntryInputProps = {
  dimensionName: string
  score: ScorecardScore
  evidence: string
  onScoreChange: (score: ScorecardScore) => void
  onEvidenceChange: (evidence: string) => void
  isCounterProductive?: boolean
}

const SCORE_OPTIONS: { value: ScorecardScore; label: string; description: string }[] = [
  { value: 0, label: '0', description: 'Unable to demonstrate satisfactorily' },
  { value: 3, label: '3', description: 'Demonstrated to moderate extent' },
  { value: 5, label: '5', description: 'Demonstrated to large extent' },
]

export function ScorecardEntryInput({
  dimensionName,
  score,
  evidence,
  onScoreChange,
  onEvidenceChange,
  isCounterProductive,
}: ScorecardEntryInputProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">
          {dimensionName}
          {isCounterProductive && (
            <span className="text-xs font-normal text-red-500 ml-2">(Counter-productive - inverted)</span>
          )}
        </p>
      </div>

      <div className="flex gap-2" role="radiogroup" aria-label={`Score for ${dimensionName}`}>
        {SCORE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={score === opt.value}
            onClick={() => onScoreChange(opt.value)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm border transition-colors',
              score === opt.value
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            )}
          >
            <span className="font-bold text-lg">{opt.label}</span>
            <p className="text-[10px] mt-0.5 opacity-80">{opt.description}</p>
          </button>
        ))}
      </div>

      <Textarea
        placeholder="Evidence and observations..."
        value={evidence}
        onChange={e => onEvidenceChange(e.target.value)}
        rows={2}
        className="text-sm"
      />
    </div>
  )
}
