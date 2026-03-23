import { useState } from 'react'
import UserLayout from '@/layouts/UserLayout'
import PrismInitiateForm from '@/components/prism/PrismInitiateForm'
import PrismAssessmentCard from '@/components/prism/PrismAssessmentCard'
import PrismReportViewer from '@/components/prism/PrismReportViewer'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/useAuth'
import { usePrismHistory } from '@/hooks/prism/usePrismHistory'
import { ASSESSMENT_STATUS } from '@/constants/prism'

const ACTIVE_STATUSES: Set<string> = new Set([
  ASSESSMENT_STATUS.INITIATED,
  ASSESSMENT_STATUS.QUESTIONNAIRE_SENT,
  ASSESSMENT_STATUS.IN_PROGRESS,
  ASSESSMENT_STATUS.COMPLETED,
  ASSESSMENT_STATUS.UNLOCKED,
])

export default function PrismAssessment() {
  const { user } = useAuth()
  const { data, isLoading } = usePrismHistory(user?.id ?? null)
  const [viewingReportId, setViewingReportId] = useState<string | null>(null)

  const assessments = data?.data?.data?.assessments ?? []
  const activeAssessment = assessments.find((a) =>
    ACTIVE_STATUSES.has(a.status),
  )
  const pastAssessments = assessments.filter(
    (a) => !ACTIVE_STATUSES.has(a.status),
  )

  return (
    <UserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            PRISM Assessment
          </h1>
          <p className="text-muted-foreground">
            Complete your PRISM Brain Mapping to unlock personalized coaching
            insights
          </p>
        </div>

        {/* Active Assessment */}
        {activeAssessment && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Active Assessment</h2>
            <PrismAssessmentCard
              assessment={activeAssessment}
              onViewReport={setViewingReportId}
            />
          </div>
        )}

        {/* Request New */}
        <PrismInitiateForm disabled={!!activeAssessment} />

        {/* Report Viewer */}
        {viewingReportId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Report</h2>
              <button
                onClick={() => setViewingReportId(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <PrismReportViewer assessmentId={viewingReportId} />
          </div>
        )}

        {/* History */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          pastAssessments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Assessment History</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {pastAssessments.map((assessment) => (
                  <PrismAssessmentCard
                    key={assessment.id}
                    assessment={assessment}
                    onViewReport={setViewingReportId}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </UserLayout>
  )
}
