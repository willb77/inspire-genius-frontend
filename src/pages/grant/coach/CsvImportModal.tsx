import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Download, FileUp, Loader2, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useImportStudents } from "@/hooks/grant/useCoachRoster"
import type { CoachImportResult, CoachStudentImportRow } from "@/types/grant/coach"
import { RichText } from "../_rich"
import { CSV_HEADERS, parseCsvToRows, templateDataUri } from "./csv"

const PREVIEW_LIMIT = 10

export function CsvImportModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation("grantPages")
  const importMutation = useImportStudents()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<CoachStudentImportRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<CoachImportResult | null>(null)

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
      const text = await file.text()
      const parsed = parseCsvToRows(text)
      if (parsed.length === 0) {
        setRows([])
        setParseError(
          t(
            "csvImport.noDataRows",
            "No data rows found. Make sure the file has a header row and at least one student."
          )
        )
        return
      }
      setRows(parsed)
    } catch {
      setRows([])
      setParseError(t("csvImport.readError", "Couldn't read that file. Please upload a plain .csv file."))
    }
  }

  function handleImport() {
    if (rows.length === 0) return
    importMutation.mutate(rows, {
      onSuccess: (res) => setResult(res),
    })
  }

  const previewRows = rows.slice(0, PREVIEW_LIMIT)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("csvImport.title", "Import students from CSV")}</DialogTitle>
          <DialogDescription>
            <RichText
              text={t(
                "csvImport.description",
                "Upload a roster and we'll create a managed profile for each student. Only <code>first_name</code> is required."
              )}
              tags={{ code: <code className="rounded bg-[#f3f4f6] px-1 text-[#374151]" /> }}
            />
          </DialogDescription>
        </DialogHeader>

        {/* Result report — shown after a successful import */}
        {result ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <ResultTile label={t("csvImport.created", "Created")} value={result.created} tone="green" />
              <ResultTile label={t("csvImport.duplicates", "Duplicates")} value={result.duplicates} tone="amber" />
              <ResultTile label={t("csvImport.errors", "Errors")} value={result.errors} tone="red" />
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border border-[#e5e7eb]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
                  <tr>
                    <th className="px-3 py-2">{t("csvImport.colRow", "Row")}</th>
                    <th className="px-3 py-2">{t("csvImport.colStatus", "Status")}</th>
                    <th className="px-3 py-2">{t("csvImport.colName", "Name")}</th>
                    <th className="px-3 py-2">{t("csvImport.colDetail", "Detail")}</th>
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
                            r.status === "duplicate" && "text-[#b45309]",
                            r.status === "error" && "text-[#b91c1c]"
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
              <Button variant="outline" onClick={reset}>
                {t("csvImport.importAnother", "Import another file")}
              </Button>
              <Button
                className="bg-[#3B5BFF] hover:bg-[#2f49cc]"
                onClick={() => handleOpenChange(false)}
              >
                {t("common.done", "Done")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File picker + template link */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="gap-2"
              >
                <FileUp className="h-4 w-4" /> {t("csvImport.chooseFile", "Choose .csv file")}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                aria-label={t("csvImport.fileAria", "CSV file")}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <a
                href={templateDataUri()}
                download="grant-students-template.csv"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3B5BFF] hover:underline"
              >
                <Download className="h-4 w-4" /> {t("csvImport.downloadTemplate", "Download template")}
              </a>
              {fileName && <span className="text-sm text-[#6b7280]">{fileName}</span>}
            </div>

            <p className="text-xs text-[#9ca3af]">
              {t("csvImport.columns", {
                columns: CSV_HEADERS.join(", "),
                defaultValue: "Columns: {{columns}}",
              })}
            </p>

            {parseError && <p className="text-sm text-[#b91c1c]">{parseError}</p>}

            {/* Preview */}
            {rows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#374151]">
                    {rows.length === 1
                      ? t("csvImport.previewOne", {
                          count: rows.length,
                          defaultValue: "Preview — {{count}} student",
                        })
                      : t("csvImport.previewOther", {
                          count: rows.length,
                          defaultValue: "Preview — {{count}} students",
                        })}
                  </span>
                  {rows.length > PREVIEW_LIMIT && (
                    <span className="text-[#9ca3af]">
                      {t("csvImport.showingFirst", {
                        limit: PREVIEW_LIMIT,
                        defaultValue: "showing first {{limit}}",
                      })}
                    </span>
                  )}
                </div>
                <div className="max-h-64 overflow-auto rounded-lg border border-[#e5e7eb]">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
                      <tr>
                        <th className="px-3 py-2">{t("csvImport.colFirst", "First")}</th>
                        <th className="px-3 py-2">{t("csvImport.colLast", "Last")}</th>
                        <th className="px-3 py-2">{t("csvImport.colEmail", "Email")}</th>
                        <th className="px-3 py-2">{t("csvImport.colState", "State")}</th>
                        <th className="px-3 py-2">{t("csvImport.colGrade", "Grade")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} className="border-t border-[#f3f4f6]">
                          <td
                            className={cn(
                              "px-3 py-1.5",
                              r.first_name ? "text-[#1f2937]" : "text-[#b91c1c]"
                            )}
                          >
                            {r.first_name || t("csvImport.missing", "missing")}
                          </td>
                          <td className="px-3 py-1.5 text-[#6b7280]">{r.last_name ?? ""}</td>
                          <td className="px-3 py-1.5 text-[#6b7280]">{r.email ?? ""}</td>
                          <td className="px-3 py-1.5 text-[#6b7280]">{r.state ?? ""}</td>
                          <td className="px-3 py-1.5 text-[#6b7280]">{r.grade_level ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                className="bg-[#3B5BFF] hover:bg-[#2f49cc]"
                onClick={handleImport}
                disabled={rows.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-1 h-4 w-4" />
                )}
                {rows.length > 0
                  ? rows.length === 1
                    ? t("csvImport.importOne", {
                        count: rows.length,
                        defaultValue: "Import {{count}} student",
                      })
                    : t("csvImport.importOther", {
                        count: rows.length,
                        defaultValue: "Import {{count}} students",
                      })
                  : t("csvImport.importZero", "Import students")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ResultTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "green" | "amber" | "red"
}) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-3 text-center">
      <p
        className={cn(
          "text-2xl font-bold",
          tone === "green" && "text-[#15803d]",
          tone === "amber" && "text-[#b45309]",
          tone === "red" && "text-[#b91c1c]"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-[#6b7280]">{label}</p>
    </div>
  )
}
