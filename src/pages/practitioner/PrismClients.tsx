import { useState } from 'react'
import PractitionerLayout from '@/layouts/PractitionerLayout'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye } from 'lucide-react'
import { QUEST_TYPE_NAMES, STATUS_CONFIG } from '@/constants/prism'
import type { PrismAssessment, AssessmentStatus } from '@/types/prism/assessment-types'
import { usePractitionerClients } from '@/hooks/practitioner/usePractitioner'

export default function PrismClients() {
  const { data, isLoading } = usePractitionerClients()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewingReportId, setViewingReportId] = useState<string | null>(null)

  const assessments = ((data as { clients?: PrismAssessment[] } | undefined)?.clients ?? []) as PrismAssessment[]
  const filtered =
    statusFilter === 'all'
      ? assessments
      : assessments.filter((a) => a.status === statusFilter)

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <PractitionerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Client PRISM Assessments
          </h1>
          <p className="text-muted-foreground">
            View and manage your clients' PRISM assessments
          </p>
        </div>

        {viewingReportId ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Client Report</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingReportId(null)}
              >
                Back to List
              </Button>
            </div>
            <PrismReportViewer assessmentId={viewingReportId} />
          </div>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Assessments</CardTitle>
                <CardDescription>
                  {filtered.length} assessment{filtered.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(
                    Object.keys(STATUS_CONFIG) as AssessmentStatus[]
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_CONFIG[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No assessments found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Initiated</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((assessment) => (
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
    </PractitionerLayout>
  )
}
