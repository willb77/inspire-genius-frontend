import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClassificationBadge } from '@/components/job-blueprint/shared/ClassificationBadge'
import { ScoreBar } from '@/components/job-blueprint/shared/ScoreBar'
import type { InsightPackage } from '@/types/job-blueprint'
import { AlertTriangle, CheckCircle, HelpCircle, Target } from 'lucide-react'

type InsightPackageViewProps = {
  insight: InsightPackage
}

export function InsightPackageView({ insight }: InsightPackageViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Insight Package</h3>
          <p className="text-sm text-slate-500">Generated {new Date(insight.generatedAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBar score={insight.fitScore} label="Fit Score" className="w-32" size="sm" />
          <ClassificationBadge tier={insight.tier} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gap Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              Gap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insight.gapAnalysis.map(gap => (
              <div key={gap.dimensionId} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                <div>
                  <p className="font-medium">{gap.dimensionName}</p>
                  <p className="text-xs text-slate-500">{gap.recommendation}</p>
                </div>
                <span className={`font-semibold text-sm ${gap.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {gap.gap > 0 ? '+' : ''}{gap.gap}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Interview Focus Areas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              Interview Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insight.interviewFocusAreas.map((area, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {area}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Probe Questions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Probe Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insight.probeQuestions.map((pq, i) => (
              <div key={i} className="text-sm border-b last:border-0 pb-2">
                <Badge variant="outline" className="text-xs mb-1">{pq.area}</Badge>
                <p className="text-slate-600">{pq.question}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Risk & Opportunity */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {insight.riskFactors.map((r, i) => (
                  <li key={i} className="text-sm text-red-600 flex items-start gap-1.5">
                    <span className="text-red-400 mt-1">-</span>
                    {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5 text-green-700">
                <CheckCircle className="w-4 h-4" />
                Opportunity Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {insight.opportunityFactors.map((o, i) => (
                  <li key={i} className="text-sm text-green-600 flex items-start gap-1.5">
                    <span className="text-green-400 mt-1">+</span>
                    {o}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
