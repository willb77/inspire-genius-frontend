import { useCallback, useRef, useState } from "react"
import { Download, FileUp, Loader2, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AdminImportResult } from "@/types/honor/admin"
import {
  csvTemplateDataUri,
  HEADERS_BY_KIND,
  parseImportFile,
  xlsxTemplateBlob,
  type ImportKind,
  type ImportRecord,
} from "./importFile"

const PREVIEW_LIMIT = 10

/**
 * Honor Administration bulk-import modal (coaches & fellows). Offers a
 * client-generated CSV + XLSX template, parses the uploaded file in-repo
 * (RFC-4180 CSV or first-sheet XLSX — no papaparse), previews the rows, and posts
 * to the supplied import mutation with a per-row result report.
 */
export function ImportModal({
  open,
  onOpenChange,
  kind,
  onImport,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: ImportKind
  onImport: (rows: ImportRecord[]) => Promise<AdminImportResult>
  isPending: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRecord[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<AdminImportResult | null>(null)

  const noun = kind === "coach" ? "coach" : "fellow"
  const nounPlural = kind === "coach" ? "coaches" : "fellows"
  const headers = HEADERS_BY_KIND[kind]

  const reset = useCallback(() => {
    setFileName(null)
    setRows([])
    setParseError(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setParseError(null)
    setResult(null)
    setFileName(file.name)
    try {
      const parsed = await parseImportFile(file, kind)
      if (parsed.length === 0) {
        setRows([])
        setParseError(`No data rows found. Make sure the file has a header row and at least one ${noun}.`)
        return
      }
      setRows(parsed)
    } catch {
      setRows([])
      setParseError("Couldn't read that file. Upload a .csv or .xlsx export.")
    }
  }

  async function handleImport() {
    if (rows.length === 0) return
    try {
      const res = await onImport(rows)
      setResult(res)
    } catch {
      setParseError("Import failed — the Administration backend may not be available in this environment yet.")
    }
  }

  function downloadXlsx() {
    const blob = xlsxTemplateBlob(kind)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `honor-${nounPlural}-template.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const previewRows = rows.slice(0, PREVIEW_LIMIT)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {nounPlural} from a spreadsheet</DialogTitle>
          <DialogDescription>
            Upload a roster (.csv or .xlsx) and we&apos;ll create a record for each {noun}. Only{" "}
            <code className="rounded bg-[#f3f4f6] px-1 text-[#374151]">first_name</code> is required.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <ResultTile label="Created" value={result.created} tone="green" />
              <ResultTile label="Updated" value={result.updated} tone="blue" />
              <ResultTile label="Duplicates" value={result.duplicates} tone="amber" />
              <ResultTile label="Errors" value={result.errors} tone="red" />
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border border-[#e5e7eb]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r) => (
                    <tr key={r.row} className="border-t border-[#f3f4f6]">
                      <td className="px-3 py-1.5 text-[#6b7280]">{r.row}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={cn(
                            "font-medium",
                            r.status === "created" && "text-[#15803d]",
                            r.status === "updated" && "text-[#2f5a86]",
                            r.status === "duplicate" && "text-[#b45309]",
                            r.status === "error" && "text-[#b91c1c]",
                          )}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[#1f2937]">{r.name ?? "—"}</td>
                      <td className="px-3 py-1.5 text-[#6b7280]">{r.message ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <button type="button" className={OUTLINE} onClick={reset}>
                Import another file
              </button>
              <button type="button" className={PRIMARY} onClick={() => handleOpenChange(false)}>
                Done
              </button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={OUTLINE} onClick={() => inputRef.current?.click()}>
                <FileUp className="h-4 w-4" /> Choose file
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv,.xlsx,.xls"
                aria-label="Import file"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <a
                href={csvTemplateDataUri(kind)}
                download={`honor-${nounPlural}-template.csv`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#c9631a] hover:underline"
              >
                <Download className="h-4 w-4" /> CSV template
              </a>
              <button
                type="button"
                onClick={downloadXlsx}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#c9631a] hover:underline"
              >
                <Download className="h-4 w-4" /> XLSX template
              </button>
              {fileName && <span className="text-sm text-[#6b7280]">{fileName}</span>}
            </div>

            <p className="text-xs text-[#9ca3af]">Columns: {headers.join(", ")}</p>

            {parseError && <p className="text-sm text-[#b91c1c]">{parseError}</p>}

            {rows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#374151]">
                    Preview — {rows.length} {rows.length === 1 ? noun : nounPlural}
                  </span>
                  {rows.length > PREVIEW_LIMIT && (
                    <span className="text-[#9ca3af]">showing first {PREVIEW_LIMIT}</span>
                  )}
                </div>
                <div className="max-h-64 overflow-auto rounded-lg border border-[#e5e7eb]">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2">
                            {h.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} className="border-t border-[#f3f4f6]">
                          {headers.map((h, j) => (
                            <td
                              key={h}
                              className={cn(
                                "px-3 py-1.5",
                                j === 0 && !r[h] ? "text-[#b91c1c]" : "text-[#374151]",
                              )}
                            >
                              {r[h] || (j === 0 ? "missing" : "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-xs text-[#9ca3af]">
              Exporting from Excel or Google Sheets? A .xlsx upload works directly, or use
              &ldquo;Save as CSV&rdquo;.
            </p>

            <DialogFooter>
              <button type="button" className={GHOST} onClick={() => handleOpenChange(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={PRIMARY}
                onClick={handleImport}
                disabled={rows.length === 0 || isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                Import {rows.length > 0 ? `${rows.length} ` : ""}
                {rows.length === 1 ? noun : nounPlural}
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

const PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#E8792B] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c9631a] disabled:opacity-50 disabled:cursor-not-allowed"
const OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#c6cdd9] bg-white px-3.5 py-2 text-sm font-semibold text-[#1B2A4A] transition-colors hover:bg-[#f6f7f9]"
const GHOST =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-[#5b6678] transition-colors hover:bg-[#f6f7f9]"

function ResultTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "green" | "amber" | "red" | "blue"
}) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-3 text-center">
      <p
        className={cn(
          "text-2xl font-bold",
          tone === "green" && "text-[#15803d]",
          tone === "blue" && "text-[#2f5a86]",
          tone === "amber" && "text-[#b45309]",
          tone === "red" && "text-[#b91c1c]",
        )}
      >
        {value}
      </p>
      <p className="text-xs text-[#6b7280]">{label}</p>
    </div>
  )
}
