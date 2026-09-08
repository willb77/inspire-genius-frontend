import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ScorecardRecommendation } from '@/types/job-blueprint'
import { SCORECARD_BAND_LABELS, SCORECARD_THRESHOLDS } from '@/constants/job-blueprint/classification'

type ScorecardSummaryProps = {
  grandTotal: number
  recommendation: ScorecardRecommendation
}

// The band is what the interview evidence shows against the benchmark —
// decision support for the hiring manager, never a verdict. Labels come from
// the one source in classification.ts so the badge, the scale and the guide agree.
const recColors: Record<ScorecardRecommendation, string> = {
  'strong-alignment': 'bg-green-100 text-green-800',
  'good-alignment': 'bg-blue-100 text-blue-800',
  'partial-alignment': 'bg-yellow-100 text-yellow-800',
  'limited-alignment': 'bg-red-100 text-red-800',
}

export function ScorecardSummary({ grandTotal, recommendation }: ScorecardSummaryProps) {
  return (
    <Card className="border-2">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Grand Total</p>
            <p className="text-3xl font-bold text-slate-800">{grandTotal} <span className="text-lg text-slate-400">/ 55</span></p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-500 mb-1">What the evidence shows</p>
            <Badge className={`text-sm px-3 py-1 ${recColors[recommendation]}`}>
              {SCORECARD_BAND_LABELS[recommendation]}
            </Badge>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3">
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
            {SCORECARD_THRESHOLDS.slice().reverse().map(t => (
              <div
                key={t.recommendation}
                className="h-full"
                style={{
                  width: `${((t.max - t.min + 1) / 56) * 100}%`,
                  backgroundColor: t.color,
                  opacity: recommendation === t.recommendation ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0</span>
            <span>24</span>
            <span>34</span>
            <span>44</span>
            <span>55</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
