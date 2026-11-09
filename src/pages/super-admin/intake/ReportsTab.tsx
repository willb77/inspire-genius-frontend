import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ROLE_LABELS, SEGMENT_CONTEXT_LABELS, SEGMENT_STATUS_LABELS } from "@/constants/intake"
import { useDownloadReportCsv, useIntakeReport } from "@/hooks/super-admin/useIntake"
import { registryErrorSummary } from "@/services/super-admin/practitioner-registry/registryErrors"
import {
  INTAKE_ROLES,
  SEGMENT_CONTEXTS,
  SEGMENT_STATUSES,
  type IntakeReport,
  type IntakeRole,
  type ReportBlock,
  type ReportFilters,
} from "@/types/intake"
import { formatInZone, saveBlob, segmentLabel } from "./intakeView"
import {
  barPercent,
  hasReportFilters,
  reportFiltersFromView,
  reportViewFromSearch,
  searchFromReportView,
  type ReportView,
} from "./reportView"

/**
 * Super-admin → Intake → Reports (IN-7).
 *
 * Counts only: every number comes from intake-service's GROUP BY queries, and
 * no person is named anywhere on this tab. One filter bar narrows every block;
 * each block downloads as the server's CSV, fetched through the `api` instance
 * so the token is attached. A failed load is an error, never a page of zeros.
 */

const SELECT_CLASS = "border-input bg-background h-9 rounded-md border px-2 text-sm"
const COACHES = "career_coach,education_coach"
const ACCREDITED_LABELS = { yes: "Yes", no: "No", not_sure: "Not sure" } as const

type CountRow = { label: string; count: number }

function CsvButton({
  block,
  filters,
  pendingBlock,
  onDownload,
}: {
  block: ReportBlock
  filters: ReportFilters
  pendingBlock: ReportBlock | null
  onDownload: (block: ReportBlock, filters: ReportFilters) => void
}) {
  const busy = pendingBlock === block
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => onDownload(block, filters)}
      disabled={pendingBlock !== null}
      aria-label={`Download ${block} CSV`}
    >
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      CSV
    </Button>
  )
}

function CountTable({ title, rows, action }: { title: string; rows: CountRow[]; action: ReactNode }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No registrations match these filters.</p>
        ) : (
          <Table aria-label={title}>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell className="w-2/5">{r.label}</TableCell>
                  <TableCell>
                    <div className="h-2 rounded bg-muted" aria-hidden="true">
                      <div className="h-2 rounded bg-primary" style={{ width: `${barPercent(r.count, max)}%` }} />
                    </div>
                  </TableCell>
                  <TableCell className="w-16 text-right tabular-nums">{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function blockRows(report: IntakeReport, block: Exclude<ReportBlock, "totals" | "by_session">): CountRow[] {
  switch (block) {
    case "by_segment":
      return report.by_segment.map((r) => ({ label: segmentLabel(r.segment_status, r.segment_context), count: r.count }))
    case "by_role":
      return report.by_role.map((r) => ({ label: ROLE_LABELS[r.role] ?? r.role, count: r.count }))
    case "by_region":
      return report.by_region.map((r) => ({ label: r.region, count: r.count }))
    case "by_country":
      return report.by_country.map((r) => ({ label: r.country, count: r.count }))
    case "by_source":
      return report.by_source.map((r) => ({ label: r.source, count: r.count }))
    case "by_week":
      return report.by_week.map((r) => ({ label: r.week, count: r.count }))
  }
}

const COUNT_BLOCKS: { block: Exclude<ReportBlock, "totals" | "by_session">; title: string }[] = [
  { block: "by_segment", title: "By segment" },
  { block: "by_role", title: "By role" },
  { block: "by_region", title: "By region" },
  { block: "by_country", title: "By country" },
  { block: "by_source", title: "By source (heard from)" },
  { block: "by_week", title: "By week registered (ISO week)" },
]

export function ReportsTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = useMemo(() => reportViewFromSearch(searchParams), [searchParams])
  const filters = useMemo(() => reportFiltersFromView(view), [view])
  const report = useIntakeReport(filters)
  const downloader = useDownloadReportCsv()
  const pendingBlock = downloader.isPending ? (downloader.variables?.block ?? null) : null

  // Free-text filters follow the URL, and typing updates it after a short pause.
  const [country, setCountry] = useState(view.country)
  const [region, setRegion] = useState(view.region)
  useEffect(() => setCountry(view.country), [view.country])
  useEffect(() => setRegion(view.region), [view.region])
  useEffect(() => {
    if (country.trim() === view.country.trim() && region.trim() === view.region.trim()) return
    const t = setTimeout(() => setSearchParams(searchFromReportView({ ...view, country, region }, searchParams)), 400)
    return () => clearTimeout(t)
  }, [country, region, view, searchParams, setSearchParams])

  const update = (patch: Partial<ReportView>) => setSearchParams(searchFromReportView({ ...view, ...patch }, searchParams))

  const roleValue = view.role.join(",")
  const roleKnown = roleValue === "" || roleValue === COACHES || view.role.length === 1

  const download = (block: ReportBlock, f: ReportFilters) =>
    downloader.mutate(
      { block, filters: f },
      {
        onSuccess: (blob) => saveBlob(blob, `intake-${block}.csv`),
        onError: (err) => toast.error(registryErrorSummary(err, "Download failed")),
      },
    )

  const csv = (block: ReportBlock) => (
    <CsvButton block={block} filters={filters} pendingBlock={pendingBlock} onDownload={download} />
  )

  const data = report.data
  const totals = data?.totals

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1">
            <Label htmlFor="report-status">Community</Label>
            <select
              id="report-status"
              className={SELECT_CLASS}
              value={view.segment_status}
              onChange={(e) => update({ segment_status: e.target.value as ReportView["segment_status"] })}
            >
              <option value="">All</option>
              {SEGMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SEGMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-context">Context</Label>
            <select
              id="report-context"
              className={SELECT_CLASS}
              value={view.segment_context}
              onChange={(e) => update({ segment_context: e.target.value as ReportView["segment_context"] })}
            >
              <option value="">All</option>
              {SEGMENT_CONTEXTS.map((c) => (
                <option key={c} value={c}>
                  {SEGMENT_CONTEXT_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-role">Role</Label>
            <select
              id="report-role"
              className={SELECT_CLASS}
              value={roleValue}
              onChange={(e) => update({ role: e.target.value ? (e.target.value.split(",") as IntakeRole[]) : [] })}
            >
              <option value="">All roles</option>
              <option value={COACHES}>Coaches (career + education)</option>
              {INTAKE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
              {!roleKnown && <option value={roleValue}>{view.role.map((r) => ROLE_LABELS[r]).join(" + ")}</option>}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-accredited">PRISM accredited</Label>
            <select
              id="report-accredited"
              className={SELECT_CLASS}
              value={view.prism_accredited}
              onChange={(e) => update({ prism_accredited: e.target.value as ReportView["prism_accredited"] })}
            >
              <option value="">All</option>
              {(Object.keys(ACCREDITED_LABELS) as (keyof typeof ACCREDITED_LABELS)[]).map((k) => (
                <option key={k} value={k}>
                  {ACCREDITED_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36 space-y-1">
            <Label htmlFor="report-region">Region</Label>
            <Input id="report-region" value={region} maxLength={100} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div className="w-36 space-y-1">
            <Label htmlFor="report-country">Country</Label>
            <Input id="report-country" value={country} maxLength={100} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-from">Registered from</Label>
            <Input
              id="report-from"
              type="date"
              value={view.date_from}
              onChange={(e) => update({ date_from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-to">to</Label>
            <Input id="report-to" type="date" value={view.date_to} onChange={(e) => update({ date_to: e.target.value })} />
          </div>
          {hasReportFilters(view) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                update({
                  segment_status: "",
                  segment_context: "",
                  role: [],
                  prism_accredited: "",
                  country: "",
                  region: "",
                  date_from: "",
                  date_to: "",
                })
              }
            >
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {report.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
        </p>
      ) : report.error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load reports — {registryErrorSummary(report.error, "the intake service did not answer")}
        </p>
      ) : data && totals ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Totals</CardTitle>
              {csv("totals")}
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Registrants", totals.registrants],
                  ["Needs review", totals.needs_review],
                  ["Session registrations", totals.session_registrations],
                  ["None of these times", totals.none_of_these_times],
                ].map(([label, n]) => (
                  <div key={label} className="rounded-md border p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {COUNT_BLOCKS.map(({ block, title }) => (
              <CountTable key={block} title={title} rows={blockRows(data, block)} action={csv(block)} />
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">By webinar session</CardTitle>
              {csv("by_session")}
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-muted-foreground">
                Confirmed counts people who confirmed their email address; it stays 0 until confirmation emails
                are switched on.
              </p>
              <div className="overflow-x-auto">
                <Table aria-label="By webinar session">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Starts</TableHead>
                      <TableHead className="text-right">Registered</TableHead>
                      <TableHead className="text-right">Confirmed</TableHead>
                      <TableHead className="text-right">Attended</TableHead>
                      <TableHead className="text-right">No-show</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.by_session.map((s) => (
                      <TableRow key={s.webinar_id ?? "none"}>
                        <TableCell>
                          {s.webinar_id === null ? "None of these times work" : s.title}
                          {s.status === "cancelled" && <span className="ml-2 text-xs text-muted-foreground">(cancelled)</span>}
                        </TableCell>
                        <TableCell>{s.starts_at ? formatInZone(s.starts_at, "UTC") : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.registered}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.confirmed}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.attended}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.no_show}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
