import { useState } from "react"
import { isAxiosError } from "axios"
import { AlertCircle, Download, FileText, Users } from "lucide-react"
import { toast } from "sonner"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCohortReadout, useCohortReadoutExport } from "@/hooks/company-admin/useCohortReadout"
import type { CohortCell, CohortExportFormat, CohortMetric, CohortReadoutFull } from "@/types/cohortReadout"

/**
 * N-3 — the cohort read-out: the organisation's PRISM coverage, Job Fit
 * distribution, goals and practice, as counts and percentages. Every number is
 * an aggregate; groups under 5 people arrive from the server as "<5" and are
 * shown exactly so. The page never computes a count itself.
 */
export default function CohortReadout() {
  const [since, setSince] = useState("")
  const { data, isLoading, error } = useCohortReadout(since || undefined)
  const exportMutation = useCohortReadoutExport()

  const handleExport = (format: CohortExportFormat) => {
    exportMutation.mutate(
      { format, since: since || undefined },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `cohort-readout.${format}`
          a.click()
          URL.revokeObjectURL(url)
        },
        onError: () => toast.error("The export failed. Please try again."),
      },
    )
  }

  const forbidden = isAxiosError(error) && error.response?.status === 403
  const detail =
    isAxiosError(error) && typeof error.response?.data?.detail === "string" ? error.response.data.detail : null

  return (
    <CompanyAdminLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Cohort read-out</h1>
            <p className="text-sm text-muted-foreground">
              Your organisation at a glance — counts and percentages only, never an individual&apos;s result.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-xs text-muted-foreground">
              Activity since
              <input
                type="date"
                aria-label="Activity since"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="mt-1 rounded-md border px-2 py-1 text-sm text-foreground"
              />
            </label>
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={!data || exportMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => handleExport("docx")} disabled={!data || exportMutation.isPending}>
              <FileText className="mr-2 h-4 w-4" /> Word (day-90)
            </Button>
          </div>
        </header>

        {isLoading && <Skeleton className="h-48 w-full" />}

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <span>
              {forbidden
                ? (detail ?? "The cohort read-out is not enabled for your organisation.")
                : "The cohort read-out could not be loaded. Please try again."}
            </span>
          </div>
        )}

        {data?.suppressed && (
          <div role="status" className="rounded-md border p-4 text-sm">
            Your organisation has fewer than {data.threshold} members, so no figures are shown — any number would
            describe individual people.
          </div>
        )}

        {data && !data.suppressed && <ReadoutBody data={data} />}

        <p className="text-xs text-muted-foreground">
          Any group of fewer than 5 people is shown as &lt;5. Where a hidden number could be worked out from the
          total, a second number is hidden too. &quot;Confirmed at least one goal&quot; counts members who confirmed a
          goal they set.
        </p>
      </div>
    </CompanyAdminLayout>
  )
}

function pct(cell: CohortCell): string {
  return cell.suppressed || cell.percent === null ? "" : `${cell.percent.toFixed(1)}%`
}

function MetricCard({ title, metric, extra }: { title: string; metric: CohortMetric; extra?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{metric.display}</div>
      <div className="text-sm text-muted-foreground">
        {metric.label}
        {pct(metric) && ` · ${pct(metric)}`}
      </div>
      {extra && <div className="mt-1 text-xs text-muted-foreground">{extra}</div>}
    </div>
  )
}

function ReadoutBody({ data }: { data: CohortReadoutFull }) {
  const m = data.metrics
  const sessions = m.practice.sessions === null ? "<5" : String(m.practice.sessions)
  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <Users className="h-4 w-4" />
        <span>
          <strong>{data.members}</strong> members
          {data.since && ` · activity since ${data.since}`}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="PRISM coverage" metric={m.prismCoverage} />
        <MetricCard title="Goals set" metric={m.goalsSet} />
        <MetricCard title="Goals progressed" metric={m.goalsProgressed} />
        <MetricCard title="Practice" metric={m.practice} extra={`Practice sessions in total: ${sessions}`} />
      </div>
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">Job Fit distribution</h2>
        {data.jobFit.withheld && (
          <p className="mt-1 text-xs text-muted-foreground">
            Withheld: every member is in the same tier, so the breakdown would state each person&apos;s result.
          </p>
        )}
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Tier</th>
              <th className="py-1">People</th>
              <th className="py-1">Percent of members</th>
            </tr>
          </thead>
          <tbody>
            {data.jobFit.cells.map((c) => (
              <tr key={c.tier} className="border-t">
                <td className="py-1">{c.label}</td>
                <td className="py-1">{c.display}</td>
                <td className="py-1">{pct(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
