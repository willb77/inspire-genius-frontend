import { useRef, useState } from "react"
import { toast } from "sonner"
import { FileSpreadsheet, Upload, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import {
  convertLongToWide,
  PrismCsvError,
  toCsv,
  type ConversionReport,
} from "@/lib/prism/longToWide"

/**
 * Converts a long-format PRISM export into the standard wide report layout.
 *
 * Entirely in the browser: the file never leaves the machine. These exports
 * carry a named person's assessment, so uploading them to an endpoint to do
 * arithmetic we can do here would add a data path for no benefit.
 */
export default function PrismCsvConverter() {
  const [report, setReport] = useState<ConversionReport | null>(null)
  const [sourceName, setSourceName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File) {
    try {
      const text = await file.text()
      const r = convertLongToWide(text)
      setReport(r)
      setSourceName(file.name)
      toast.success(`Converted ${r.candidate}`)
    } catch (err) {
      setReport(null)
      toast.error(
        err instanceof PrismCsvError || err instanceof Error
          ? err.message
          : "Could not read that file",
      )
    }
  }

  function download() {
    if (!report) return
    const stem = report.candidate.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")
    const blob = new Blob(["\uFEFF" + toCsv(report.rows)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${stem}_PRISM_scores_standard.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const scored = report ? report.filledFromLongForm + report.copiedFromUnderlying : 0

  return (
    <SuperAdminLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold">PRISM CSV Converter</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Turns a long-format PRISM export into the standard 97-column report layout.
            Runs entirely in your browser — the file is never uploaded.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Long-format export</CardTitle>
            <CardDescription>
              The CSV with a <code>category,dimension,score_type,score</code> header row.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label="Long-format PRISM CSV"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onFile(f)
                e.target.value = ""
              }}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Choose CSV
            </Button>
            {sourceName && (
              <p className="text-muted-foreground text-xs">Loaded {sourceName}</p>
            )}
          </CardContent>
        </Card>

        {report && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{report.candidate}</CardTitle>
              <CardDescription>
                {report.rows.length} rows × {report.rows[0].length} columns · {scored} scored cells
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground text-xs">From the long form</dt>
                  <dd className="font-medium">{report.filledFromLongForm}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Copied from Underlying</dt>
                  <dd className="font-medium">{report.copiedFromUnderlying}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Empty</dt>
                  <dd className="font-medium">{report.emptyCells}</dd>
                </div>
              </dl>

              {report.copiedFromUnderlying > 0 && (
                <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium">
                      {report.copiedFromUnderlying} cells repeat the Underlying score.
                    </p>
                    <p className="text-muted-foreground mt-1">
                      The long form carried only one score type for these scales, so Adapted and
                      Consistent are copies rather than separate measurements. That is correct for
                      Work Aptitudes, Core Traits, Mental Toughness, Emotional Intelligence and the
                      Big Five. It is <strong>not</strong> correct for Career Development Analysis,
                      where a full report has three distinct values — check against the original
                      report before treating those as measured.
                    </p>
                    <ul className="text-muted-foreground mt-2 space-y-0.5">
                      {report.repeatedGroups.map((g) => (
                        <li key={g.group}>
                          {g.group} — {g.cells} cells
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {report.missingColumns.length > 0 && (
                <div className="flex gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-950/40">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div>
                    <p className="font-medium">
                      {report.missingColumns.length} columns had no value in the source
                    </p>
                    <ul className="text-muted-foreground mt-1 space-y-0.5">
                      {report.missingColumns.slice(0, 8).map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                      {report.missingColumns.length > 8 && (
                        <li>…and {report.missingColumns.length - 8} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <Button onClick={download}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download standard CSV
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminLayout>
  )
}
