import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BenchmarkRadarChart } from './BenchmarkRadarChart'
import { BenchmarkBarChart } from './BenchmarkBarChart'
import { DimensionBadge } from '@/components/job-blueprint/shared/DimensionBadge'
import type { DimensionBenchmark, JobTier } from '@/types/job-blueprint'

type ReviewSubmitStepProps = {
  roleTitle: string
  department: string
  tier: JobTier
  behaviors: DimensionBenchmark[]
  aptitudes: DimensionBenchmark[]
  coreTraits: DimensionBenchmark[]
  roleContext: {
    workPressures: string[]
    requiredWorkStyles: string[]
    environmentalFactors: string[]
    culturalFactors: string[]
  }
}

const tierLabels: Record<JobTier, string> = {
  'front-line': 'Front Line',
  professional: 'Professional',
  executive: 'Executive',
}

export function ReviewSubmitStep({
  roleTitle,
  department,
  tier,
  behaviors,
  aptitudes,
  coreTraits,
  roleContext,
}: ReviewSubmitStepProps) {
  const topBehaviors = [...behaviors].sort((a, b) => a.rankPosition - b.rankPosition).slice(0, 3)
  const topAptitudes = [...aptitudes].sort((a, b) => a.rankPosition - b.rankPosition).slice(0, 3)
  const topTraits = [...coreTraits].sort((a, b) => a.rankPosition - b.rankPosition).slice(0, 3)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Review & Submit</h3>
        <p className="text-sm text-slate-500">
          Review the Job DNA benchmark before finalizing. This will create the behavioral profile used to screen candidates.
        </p>
      </div>

      {/* Role info summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Role Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="font-medium text-slate-600">Title:</span> {roleTitle || 'Not set'}</p>
          <p><span className="font-medium text-slate-600">Department:</span> {department || 'Not set'}</p>
          <p><span className="font-medium text-slate-600">Tier:</span> <Badge variant="outline">{tierLabels[tier]}</Badge></p>
        </CardContent>
      </Card>

      {/* Top dimensions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Top 3 Behaviors</p>
            <div className="flex flex-wrap gap-1.5">
              {topBehaviors.map(b => (
                <DimensionBadge key={b.dimensionId} name={b.dimensionName} category="behavior" score={b.finalBenchmarkPercent} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Top 3 Aptitudes</p>
            <div className="flex flex-wrap gap-1.5">
              {topAptitudes.map(a => (
                <DimensionBadge key={a.dimensionId} name={a.dimensionName} category="aptitude" score={a.finalBenchmarkPercent} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Top 3 Core Traits</p>
            <div className="flex flex-wrap gap-1.5">
              {topTraits.map(t => (
                <DimensionBadge key={t.dimensionId} name={t.dimensionName} category="core-trait" score={t.finalBenchmarkPercent} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Benchmark Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <BenchmarkRadarChart behaviors={behaviors} aptitudes={aptitudes} coreTraits={coreTraits} height={350} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Benchmark Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BenchmarkBarChart benchmarks={behaviors} title="Behaviors" height={200} />
            <BenchmarkBarChart benchmarks={aptitudes} title="Aptitudes" height={200} />
            <BenchmarkBarChart benchmarks={coreTraits} title="Core Traits" height={160} />
          </CardContent>
        </Card>
      </div>

      {/* Role context summary */}
      {(roleContext.workPressures.length > 0 || roleContext.requiredWorkStyles.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Role Context</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {roleContext.workPressures.length > 0 && (
              <div>
                <p className="font-medium text-slate-600 mb-1">Work Pressures</p>
                <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                  {roleContext.workPressures.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {roleContext.requiredWorkStyles.length > 0 && (
              <div>
                <p className="font-medium text-slate-600 mb-1">Required Work Styles</p>
                <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                  {roleContext.requiredWorkStyles.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {roleContext.environmentalFactors.length > 0 && (
              <div>
                <p className="font-medium text-slate-600 mb-1">Environmental Factors</p>
                <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                  {roleContext.environmentalFactors.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {roleContext.culturalFactors.length > 0 && (
              <div>
                <p className="font-medium text-slate-600 mb-1">Cultural Factors</p>
                <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                  {roleContext.culturalFactors.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
