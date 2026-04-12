import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Download, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BulkImportResponse } from "@/types/bulk-import"

type ImportProgressProps = {
  isLoading: boolean
  data: BulkImportResponse | undefined
  onContinue: () => void
}

function downloadReport(data: BulkImportResponse) {
  const header = "email,status,error"
  const rows = data.results.map((r) => {
    const error = r.error ? `"${r.error.replace(/"/g, '""')}"` : ""
    return `${r.email},${r.status},${error}`
  })
  const csv = [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `import-report-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function ImportProgress({ isLoading, data, onContinue }: ImportProgressProps) {
  const total = data?.total ?? 0
  const succeeded = data?.succeeded ?? 0
  const failed = data?.failed ?? 0
  const processed = succeeded + failed
  const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0
  const isComplete = !isLoading && !!data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          Import Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground mb-4">
          Your users are being imported into the system. This may take a moment. You'll see the results below when complete.
        </p>
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {processed} / {total} processed
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            Total: {total}
          </Badge>
          <Badge
            className={cn(
              "text-sm",
              succeeded > 0
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            Succeeded: {succeeded}
          </Badge>
          <Badge
            className={cn(
              "text-sm",
              failed > 0
                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            Failed: {failed}
          </Badge>
        </div>

        {/* Per-user result list */}
        {data?.results && data.results.length > 0 && (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
            {data.results.map((result, index) => (
              <div
                key={`${result.email}-${index}`}
                className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {result.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <span className="truncate">{result.email}</span>
                </div>
                {result.error && (
                  <span className="ml-2 truncate text-xs text-red-600">{result.error}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {isComplete && (
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={onContinue}>
              Continue to Invitations
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => data && downloadReport(data)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
