import { useRef, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Eye, Upload, Loader2 } from 'lucide-react'
import { QUEST_TYPE_NAMES, STATUS_CONFIG } from '@/constants/prism'
import type { PrismAssessment, AssessmentStatus } from '@/types/prism/assessment-types'
import { usePractitionerClients } from '@/hooks/practitioner/usePractitioner'
import { usePrismImport } from '@/hooks/prism/usePrismImport'

export default function PrismClients() {
  const { data, isLoading } = usePractitionerClients()
  const importMutation = usePrismImport()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewingReportId, setViewingReportId] = useState<string | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importClientId, setImportClientId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImportSubmit() {
    const file = fileInputRef.current?.files?.[0]
    if (file && importClientId.trim()) {
      importMutation.mutate(
        { userId: importClientId.trim(), file },
        {
          onSuccess: () => {
            setImportDialogOpen(false)
            setImportClientId('')
            if (fileInputRef.current) fileInputRef.current.value = ''
          },
        },
      )
    }
  }

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Client PRISM Assessments
            </h1>
            <p className="text-muted-foreground">
              View and manage your clients' PRISM assessments
            </p>
          </div>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="mr-1.5 h-4 w-4" />
                Import Client Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Client PRISM Report</DialogTitle>
                <DialogDescription>
                  Upload an existing PRISM report file for a client.
                  Supported formats: PDF, DOCX, CSV, XLS, XLSX.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="client-id">Client ID</Label>
                  <Input
                    id="client-id"
                    placeholder="Enter client user ID"
                    value={importClientId}
                    onChange={(e) => setImportClientId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prism-file">Report File</Label>
                  <input
                    ref={fileInputRef}
                    id="prism-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.csv,.xls,.xlsx"
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <Button
                  onClick={handleImportSubmit}
                  disabled={importMutation.isPending || !importClientId.trim()}
                  className="w-full"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-4 w-4" />
                  )}
                  {importMutation.isPending ? 'Importing...' : 'Import Report'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
