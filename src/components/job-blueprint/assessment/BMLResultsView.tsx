import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBar } from '@/components/job-blueprint/shared/ScoreBar'
import { DimensionBadge } from '@/components/job-blueprint/shared/DimensionBadge'
import type { DimensionScore } from '@/types/job-blueprint'
import { Shield } from 'lucide-react'

type BMLResultsViewProps = {
  scores: DimensionScore[]
  confidence: number
}

export function BMLResultsView({ scores, confidence }: BMLResultsViewProps) {
  const behaviors = scores.filter(s => s.category === 'behavior').sort((a, b) => b.score - a.score)
  const aptitudes = scores.filter(s => s.category === 'aptitude').sort((a, b) => b.score - a.score)
  const coreTraits = scores.filter(s => s.category === 'core-trait').sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Assessment Results</h3>
        <div className="flex items-center gap-1.5 text-sm">
          <Shield className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600">Confidence: <span className="font-semibold">{confidence}%</span></span>
        </div>
      </div>

      {[
        { title: 'Behavior Preferences', items: behaviors },
        { title: 'Work Aptitudes', items: aptitudes },
        { title: 'Core Traits', items: coreTraits },
      ].map(section => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {section.items.map(s => (
              <div key={`${s.category}-${s.dimensionId}`} className="flex items-center gap-3">
                <DimensionBadge name={s.dimensionName} category={s.category} className="w-48 justify-center" />
                <div className="flex-1">
                  <ScoreBar score={s.score} size="sm" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
