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
import type { PrismAssessment } from '@/types/prism/assessment-types'

// TODO: Replace with real hook for manager's team assessments
function useTeamAssessments() {
  return {
    data: { data: { data: { assessments: [] as PrismAssessment[], total: 0 } } },
    isLoading: false,
  }
}

export default function PrismTeam() {
  const { data, isLoading } = useTeamAssessments()
  const [viewingReportId, setViewingReportId] = useState<string | null>(null)

  const assessments = data?.data?.data?.assessments ?? []

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
          <h1 className="text-2xl font-bold tracking-tight">
            Team PRISM Assessments
          </h1>
          <p className="text-muted-foreground">
            Track your team members' PRISM assessment progress
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
            </CardContent>
          </Card>
        </div>

        {viewingReportId ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Team Member Report</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingReportId(null)}
              >
                Back to Team
              </Button>
            </div>
            <PrismReportViewer assessmentId={viewingReportId} />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Team Assessments</CardTitle>
              <CardDescription>
                {assessments.length} team member
                {assessments.length !== 1 ? 's' : ''}
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
                <p className="py-8 text-center text-muted-foreground">
                  No team assessments yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Initiated</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View
                            </Button>
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
