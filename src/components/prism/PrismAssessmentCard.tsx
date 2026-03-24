import { ExternalLink, Unlock, ArrowUpCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import PrismStatusBadge from './PrismStatusBadge'
import { usePrismStatus } from '@/hooks/prism/usePrismStatus'
import { usePrismUnlock } from '@/hooks/prism/usePrismUnlock'
import { QUEST_TYPE_NAMES, QUEST_TYPE } from '@/constants/prism'
import { REPORT_TIERS } from '@/types/prism/api-types'
import type { PrismAssessment } from '@/types/prism/assessment-types'

type PrismAssessmentCardProps = {
  assessment: PrismAssessment
  onViewReport?: (assessmentId: string) => void
  onUpgrade?: (assessmentId: string) => void
}

export default function PrismAssessmentCard({
  assessment,
  onViewReport,
  onUpgrade,
}: PrismAssessmentCardProps) {
  const isActive =
    assessment.status !== 'report_ready' &&
    assessment.status !== 'ingested' &&
    assessment.status !== 'error'
  const { data: statusData } = usePrismStatus(
    isActive ? assessment.id : null,
  )
  const unlock = usePrismUnlock()

  const currentStatus =
    statusData?.data?.status ?? assessment.status
  const canUpgrade =
    assessment.questionnaireType !== QUEST_TYPE.PROFESSIONAL &&
    (currentStatus === 'report_ready' || currentStatus === 'ingested')
  const currentTierIndex = REPORT_TIERS.indexOf(assessment.questionnaireType)

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function handleUnlock() {
    unlock.mutate({
      assessmentId: assessment.id,
      transactionMethod: 'IG-Platform',
      orderReference: `IG-${assessment.id}`,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">
            {QUEST_TYPE_NAMES[assessment.questionnaireType] ??
              assessment.questionnaireTypeName}
          </CardTitle>
          <CardDescription>
            Initiated {formatDate(assessment.initiatedAt)}
          </CardDescription>
        </div>
        <PrismStatusBadge status={currentStatus} />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timeline */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Sent</span>
          <span>{formatDate(assessment.questionnaireSentAt)}</span>
          <span className="text-muted-foreground">Completed</span>
          <span>{formatDate(assessment.questionnaireCompletedAt)}</span>
          {assessment.unlockedAt && (
            <>
              <span className="text-muted-foreground">Unlocked</span>
              <span>{formatDate(assessment.unlockedAt)}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {(currentStatus === 'initiated' || currentStatus === 'sent') &&
            assessment.questionnaireUrl && (
              <Button size="sm" asChild>
                <a
                  href={assessment.questionnaireUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Questionnaire
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              </Button>
            )}

          {currentStatus === 'completed' && (
            <Button
              size="sm"
              onClick={handleUnlock}
              disabled={unlock.isPending}
            >
              <Unlock className="mr-1 h-3.5 w-3.5" />
              {unlock.isPending ? 'Unlocking...' : 'Unlock Report'}
            </Button>
          )}

          {(currentStatus === 'report_ready' ||
            currentStatus === 'ingested') && (
            <Button
              size="sm"
              onClick={() => onViewReport?.(assessment.id)}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              View Report
            </Button>
          )}

          {canUpgrade && currentTierIndex < REPORT_TIERS.length - 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpgrade?.(assessment.id)}
            >
              <ArrowUpCircle className="mr-1 h-3.5 w-3.5" />
              Upgrade
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
