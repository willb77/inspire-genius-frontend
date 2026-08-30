import { useState } from 'react'
import { useTranslation } from 'react-i18next';
import UserLayout from '@/layouts/UserLayout'
import { V2Panel } from '@/components/v2'
import PrismInitiateForm from '@/components/prism/PrismInitiateForm'
import ActivePrismRequestCard from '@/components/prism/ActivePrismRequestCard'
import PrismAssessmentCard from '@/components/prism/PrismAssessmentCard'
import PrismReportViewer from '@/components/prism/PrismReportViewer'
import { ReplacePrismDataButton } from '@/components/prism/ReplacePrismDataButton'
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

/**
 * PrismAssessmentV2 — the new-design ("HomeV2" system) variant of PrismAssessment.
 * Flag-gated (new_user_surfaces) additive swap; the classic page is unchanged and
 * remains at /prism/classic. Same data/hooks/logic — only the presentation is
 * re-skinned to the cream panel + tokens + serif headings. RTL-safe (logical CSS).
 */
export default function PrismAssessmentV2() {
  const { t } = useTranslation(["common", "coaching"]);
  const { user } = useAuth()
  const { data, isLoading } = usePrismHistory(user?.id ?? null)
  const [viewingReportId, setViewingReportId] = useState<string | null>(null)

  const assessments = data?.data?.assessments ?? []
  const activeAssessment = assessments.find((a) =>
    ACTIVE_STATUSES.has(a.status),
  )
  const pastAssessments = assessments.filter(
    (a) => !ACTIVE_STATUSES.has(a.status),
  )

  return (
    <UserLayout>
      <V2Panel>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
              {t("coaching:prism.assessment")}
            </h1>
            <p className="text-body-slate">
              {t("coaching:prism.completeDescription")}
            </p>
          </div>
          <div>
            <ReplacePrismDataButton
              label="Import / Replace Report"
              variant="outline"
              size="sm"
            />
          </div>
        </div>

        {/* Active Assessment */}
        {activeAssessment && (
          <div className="space-y-2">
            <h2 className="font-serif text-lg font-semibold text-ink">{t("coaching:prism.activeAssessment")}</h2>
            <PrismAssessmentCard
              assessment={activeAssessment}
              onViewReport={setViewingReportId}
            />
          </div>
        )}

        {/* Request New */}
        {/* Recover the questionnaire link for any survey already requested
            but not yet completed — it is otherwise shown only once. */}
        <ActivePrismRequestCard />

        <PrismInitiateForm disabled={!!activeAssessment} />

        {/* Report Viewer */}
        {viewingReportId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-ink">{t("coaching:prism.report")}</h2>
              <button
                onClick={() => setViewingReportId(null)}
                className="text-sm text-body-slate hover:text-ink"
              >
                {t("common:close")}
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
              <h2 className="font-serif text-lg font-semibold text-ink">{t("coaching:prism.assessmentHistory")}</h2>
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
      </V2Panel>
    </UserLayout>
  )
}
