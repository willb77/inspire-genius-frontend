import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClassificationBadge } from '@/components/job-blueprint/shared/ClassificationBadge'
import type { Candidate, DimensionBenchmark } from '@/types/job-blueprint'
import { cn } from '@/lib/utils'

type CandidateComparisonProps = {
  candidates: Candidate[]
  benchmark: DimensionBenchmark[]
}

function getCellColor(variation: number): string {
  if (variation <= 5) return 'bg-green-100 text-green-800'
  if (variation <= 15) return 'bg-green-50 text-green-700'
  if (variation <= 25) return 'bg-yellow-50 text-yellow-700'
  if (variation <= 35) return 'bg-orange-50 text-orange-700'
  return 'bg-red-100 text-red-800'
}

export function CandidateComparison({ candidates, benchmark }: CandidateComparisonProps) {
  const sorted = [...candidates]
    .filter(c => c.variationScores)
    .sort((a, b) => (a.variationScores?.totalVariation ?? 999) - (b.variationScores?.totalVariation ?? 999))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Candidate Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b">
                <th className="py-2 pr-4 sticky left-0 bg-white">Dimension</th>
                <th className="py-2 pr-4 text-center">Benchmark</th>
                {sorted.map(c => (
                  <th key={c.id} className="py-2 px-2 text-center min-w-[100px]">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-700">{c.name}</p>
                      {c.classificationTier && (
                        <ClassificationBadge tier={c.classificationTier} size="sm" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benchmark.map(b => (
                <tr key={`${b.category}-${b.dimensionId}`} className="border-b last:border-0">
                  <td className="py-1.5 pr-4 sticky left-0 bg-white font-medium text-xs">{b.dimensionName}</td>
                  <td className="py-1.5 pr-4 text-center text-xs font-semibold">{b.finalBenchmarkPercent}%</td>
                  {sorted.map(c => {
                    const score = c.prismScores?.find(
                      s => s.dimensionId === b.dimensionId && s.category === b.category
                    )
                    const variation = score ? Math.abs(score.score - b.finalBenchmarkPercent) : null

                    return (
                      <td key={c.id} className="py-1.5 px-2 text-center">
                        {score ? (
                          <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', getCellColor(variation!))}>
                            {score.score}%
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t-2 font-semibold">
                <td className="py-2 pr-4 sticky left-0 bg-white text-xs">Total Variation</td>
                <td className="py-2 pr-4 text-center">--</td>
                {sorted.map(c => (
                  <td key={c.id} className="py-2 px-2 text-center text-xs">
                    {c.variationScores?.totalVariation ?? '--'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
