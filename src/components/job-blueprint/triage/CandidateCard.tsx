import { Card, CardContent } from '@/components/ui/card'
import { ClassificationBadge } from '@/components/job-blueprint/shared/ClassificationBadge'
import { PipelineStepBadge } from '@/components/job-blueprint/shared/PipelineStepBadge'
import type { Candidate } from '@/types/job-blueprint'
import { User, Mail } from 'lucide-react'

type CandidateCardProps = {
  candidate: Candidate
  onClick?: () => void
}

export function CandidateCard({ candidate, onClick }: CandidateCardProps) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{candidate.name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {candidate.email}
              </p>
            </div>
          </div>
          <PipelineStepBadge step={candidate.status} />
        </div>

        <div className="flex items-center gap-2 mt-2">
          {candidate.classificationTier && (
            <ClassificationBadge tier={candidate.classificationTier} size="sm" />
          )}
          {candidate.variationScores && (
            <span className="text-xs text-slate-500">
              Variation: {candidate.variationScores.totalVariation}
            </span>
          )}
          {candidate.code && (
            <span className="text-xs text-slate-400 ml-auto">Code: {candidate.code}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
