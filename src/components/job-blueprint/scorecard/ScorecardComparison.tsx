import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBar } from '@/components/job-blueprint/shared/ScoreBar'
import type { InterviewScorecard, ScorecardRecommendation } from '@/types/job-blueprint'
import { SCORECARD_BAND_LABELS } from '@/constants/job-blueprint/classification'
import { cn } from '@/lib/utils'

type ScorecardComparisonProps = {
  scorecards: InterviewScorecard[]
}

const recColors: Record<ScorecardRecommendation, string> = {
  'strong-alignment': 'text-green-600',
  'good-alignment': 'text-blue-600',
  'partial-alignment': 'text-yellow-600',
  'limited-alignment': 'text-red-600',
}

export function ScorecardComparison({ scorecards }: ScorecardComparisonProps) {
  const sorted = [...scorecards].sort((a, b) => b.grandTotal - a.grandTotal)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Scorecard Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sorted.map(sc => (
            <div key={sc.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">Candidate {sc.candidateId.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{sc.grandTotal}/55</span>
                  <span className={cn('text-xs font-semibold', recColors[sc.recommendation])}>
                    {SCORECARD_BAND_LABELS[sc.recommendation] ?? sc.recommendation}
                  </span>
                </div>
              </div>
              <ScoreBar score={(sc.grandTotal / 55) * 100} size="sm" showValue={false} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
