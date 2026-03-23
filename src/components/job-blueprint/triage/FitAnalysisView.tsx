import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBar } from '@/components/job-blueprint/shared/ScoreBar'
import { ClassificationBadge } from '@/components/job-blueprint/shared/ClassificationBadge'
import type { DimensionBenchmark, DimensionScore, VariationResult, ClassificationTier } from '@/types/job-blueprint'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type FitAnalysisViewProps = {
  candidateName: string
  candidateScores: DimensionScore[]
  benchmark: DimensionBenchmark[]
  variation: VariationResult
  tier: ClassificationTier
}

export function FitAnalysisView({
  candidateName,
  candidateScores,
  benchmark,
  variation,
  tier,
}: FitAnalysisViewProps) {
  const gapRows = benchmark.map(b => {
    const cs = candidateScores.find(c => c.dimensionId === b.dimensionId && c.category === b.category)
    const candidateScore = cs?.score ?? 0
    const gap = candidateScore - b.finalBenchmarkPercent
    return {
      ...b,
      candidateScore,
      gap,
      absGap: Math.abs(gap),
    }
  }).sort((a, b) => b.absGap - a.absGap)

  const SkewIcon = variation.skew > 2 ? TrendingUp : variation.skew < -2 ? TrendingDown : Minus

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Fit Analysis: {candidateName}</h3>
        <ClassificationBadge tier={tier} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-slate-800">{variation.totalVariation}</p>
            <p className="text-xs text-slate-500">Total Variation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-slate-800">{variation.standardDeviation}</p>
            <p className="text-xs text-slate-500">Std Deviation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <SkewIcon className="w-5 h-5 text-slate-600" />
              <p className="text-2xl font-bold text-slate-800">{variation.skew}</p>
            </div>
            <p className="text-xs text-slate-500">Skew</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="space-y-1">
              <p className="text-sm"><span className="font-bold">{variation.behaviorVariation}</span> <span className="text-slate-400">Behavior</span></p>
              <p className="text-sm"><span className="font-bold">{variation.aptitudeVariation}</span> <span className="text-slate-400">Aptitude</span></p>
              <p className="text-sm"><span className="font-bold">{variation.coreTraitVariation}</span> <span className="text-slate-400">Trait</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dimension gap table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gap Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase border-b">
                  <th className="py-2 pr-4">Dimension</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4 text-center">Benchmark</th>
                  <th className="py-2 pr-4 text-center">Candidate</th>
                  <th className="py-2 text-center">Gap</th>
                </tr>
              </thead>
              <tbody>
                {gapRows.map(row => (
                  <tr key={`${row.category}-${row.dimensionId}`} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{row.dimensionName}</td>
                    <td className="py-2 pr-4 capitalize text-slate-500">{row.category.replace('-', ' ')}</td>
                    <td className="py-2 pr-4">
                      <ScoreBar score={row.finalBenchmarkPercent} size="sm" showValue />
                    </td>
                    <td className="py-2 pr-4">
                      <ScoreBar score={row.candidateScore} size="sm" showValue />
                    </td>
                    <td className="py-2 text-center">
                      <span className={`font-semibold ${row.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.gap > 0 ? '+' : ''}{row.gap}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
