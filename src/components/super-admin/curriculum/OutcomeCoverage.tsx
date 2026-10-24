import { CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useOutcomeCoverage } from "@/hooks/curriculum/useCurriculumAdmin"
import { curriculumError } from "@/services/curriculum/curriculumErrors"
import { CurriculumErrorPanel } from "./CurriculumReportView"

/**
 * Outcome coverage for one catalog (CUR-3): which programs say nothing about
 * where they lead. Read from `GET …/admin/catalogs/{id}/outcome-coverage`; the
 * server counts, this only shows its answer.
 */
export function OutcomeCoverage({ catalogId }: { catalogId: string }) {
  const { data, isLoading, error, refetch } = useOutcomeCoverage(catalogId)

  if (isLoading) return <Skeleton className="h-24 w-full" />
  if (error || !data) {
    return (
      <div className="space-y-2">
        <CurriculumErrorPanel error={curriculumError(error, "Could not load the outcome coverage.")} />
        <Button size="sm" variant="outline" onClick={() => void refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    )
  }

  if (data.programCount === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        This catalog has no programs yet, so there is nothing to cover.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        {data.withOutcomes} of {data.programCount} programs have at least one career outcome.
      </p>
      {data.complete ? (
        <p role="status" className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-700" />
          Every program in this catalog has at least one outcome.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Programs with no outcome — set them from Programs → Outcomes{data.catalog.status === "draft" ? "" : " on a new version"}:
          </p>
          <Table aria-label="Programs with no outcome">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.withoutOutcomes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.code}</TableCell>
                  <TableCell>{p.title}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}

export default OutcomeCoverage
