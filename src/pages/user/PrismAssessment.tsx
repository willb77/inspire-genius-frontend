import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next';
import UserLayout from '@/layouts/UserLayout'
import PrismInitiateForm from '@/components/prism/PrismInitiateForm'
import ActivePrismRequestCard from '@/components/prism/ActivePrismRequestCard'
import PrismAssessmentCard from '@/components/prism/PrismAssessmentCard'
import PrismReportViewer from '@/components/prism/PrismReportViewer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import { usePrismHistory } from '@/hooks/prism/usePrismHistory'
import { usePrismImport } from '@/hooks/prism/usePrismImport'
import { ASSESSMENT_STATUS } from '@/constants/prism'

const ACTIVE_STATUSES: Set<string> = new Set([
  ASSESSMENT_STATUS.INITIATED,
  ASSESSMENT_STATUS.QUESTIONNAIRE_SENT,
  ASSESSMENT_STATUS.IN_PROGRESS,
  ASSESSMENT_STATUS.COMPLETED,
  ASSESSMENT_STATUS.UNLOCKED,
])

export default function PrismAssessment() {
  const { t } = useTranslation(["common", "coaching"]);
  const { user } = useAuth()
  const { data, isLoading } = usePrismHistory(user?.id ?? null)
  const importMutation = usePrismImport()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [viewingReportId, setViewingReportId] = useState<string | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && user?.id) {
      importMutation.mutate({ userId: user.id, file })
    }
    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const assessments = data?.data?.assessments ?? []
  const activeAssessment = assessments.find((a) =>
    ACTIVE_STATUSES.has(a.status),
  )
  const pastAssessments = assessments.filter(
    (a) => !ACTIVE_STATUSES.has(a.status),
  )

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("coaching:prism.assessment")}
            </h1>
            <p className="text-muted-foreground">
              {t("coaching:prism.completeDescription")}
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.csv,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              Import Existing Report
            </Button>
          </div>
        </div>

        {/* Active Assessment */}
        {activeAssessment && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t("coaching:prism.activeAssessment")}</h2>
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
              <h2 className="text-lg font-semibold">{t("coaching:prism.report")}</h2>
              <button
                onClick={() => setViewingReportId(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
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
              <h2 className="text-lg font-semibold">{t("coaching:prism.assessmentHistory")}</h2>
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
