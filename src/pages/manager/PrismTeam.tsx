import { useState } from 'react'
import ManagerLayout from '@/layouts/ManagerLayout'
import PrismStatusBadge from '@/components/prism/PrismStatusBadge'
import PrismReportViewer from '@/components/prism/PrismReportViewer'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Users } from 'lucide-react'
import { QUEST_TYPE_NAMES } from '@/constants/prism'
import { useManagerTeamPrism } from '@/hooks/manager/useManagerTeamPrism'
import { useTranslation } from "react-i18next"

export default function PrismTeam() {
  const { t } = useTranslation("managerPages")
  const { data, isLoading } = useManagerTeamPrism()
  const [viewingReportId, setViewingReportId] = useState<string | null>(null)

  const assessments = data?.assessments ?? []

  const completedCount = assessments.filter(
    (a) => a.status === 'report_ready' || a.status === 'ingested',
  ).length
  const completionRate =
    assessments.length > 0
      ? Math.round((completedCount / assessments.length) * 100)
      : 0

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("prismTeam.teamPrismAssessments", { defaultValue: "Team PRISM Assessments" })}</h1>
          <p className="text-muted-foreground">{t("prismTeam.trackYourTeamMembersPrism", { defaultValue: "Track your team members' PRISM assessment progress" })}</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("prismTeam.teamMembers", { defaultValue: "Team Members" })}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("prismTeam.completed", { defaultValue: "Completed" })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("prismTeam.completionRate", { defaultValue: "Completion Rate" })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
            </CardContent>
          </Card>
        </div>

        {viewingReportId ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("prismTeam.teamMemberReport", { defaultValue: "Team Member Report" })}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingReportId(null)}
              >{t("prismTeam.backToTeam", { defaultValue: "Back to Team" })}</Button>
            </div>
            <PrismReportViewer assessmentId={viewingReportId} />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("prismTeam.teamAssessments", { defaultValue: "Team Assessments" })}</CardTitle>
              <CardDescription>{assessments.length === 1 ? t("prismTeam.teamMemberOne", { defaultValue: "{{length}} team member", length: assessments.length }) : t("prismTeam.teamMemberOther", { defaultValue: "{{length}} team members", length: assessments.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : assessments.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("prismTeam.noTeamAssessmentsYet", { defaultValue: "No team assessments yet." })}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("prismTeam.teamMember2", { defaultValue: "Team Member" })}</TableHead>
                      <TableHead>{t("prismTeam.type", { defaultValue: "Type" })}</TableHead>
                      <TableHead>{t("prismTeam.status", { defaultValue: "Status" })}</TableHead>
                      <TableHead>{t("prismTeam.initiated", { defaultValue: "Initiated" })}</TableHead>
                      <TableHead>{t("prismTeam.completed", { defaultValue: "Completed" })}</TableHead>
                      <TableHead className="text-right">{t("prismTeam.actions", { defaultValue: "Actions" })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessments.map((assessment) => (
                      <TableRow key={assessment.id}>
                        <TableCell className="font-medium">
                          {assessment.externalIdent}
                        </TableCell>
                        <TableCell>
                          {QUEST_TYPE_NAMES[assessment.questionnaireType]}
                        </TableCell>
                        <TableCell>
                          <PrismStatusBadge status={assessment.status} />
                        </TableCell>
                        <TableCell>
                          {formatDate(assessment.initiatedAt)}
                        </TableCell>
                        <TableCell>
                          {formatDate(assessment.questionnaireCompletedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(assessment.status === 'report_ready' ||
                            assessment.status === 'ingested') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setViewingReportId(assessment.id)
                              }
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />{t("prismTeam.view", { defaultValue: "View" })}</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ManagerLayout>
  )
}
