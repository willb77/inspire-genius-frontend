import { useState, type ChangeEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FlaskConical, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useImportCatalog } from "@/hooks/curriculum/useCurriculumAdmin"
import { curriculumError, type CurriculumError } from "@/services/curriculum/curriculumErrors"
import { CurriculumErrorPanel, CurriculumReportView } from "./CurriculumReportView"
import {
  COURSES_CSV_TEMPLATE,
  importSchema,
  PROGRAMS_CSV_TEMPLATE,
  type ImportValues,
} from "./curriculum.schemas"
import { canImport, type DryRun } from "./curriculumUi"

/**
 * CSV import for one catalog: a dry run first (nothing is written), its full
 * report, and only then an import that REPLACES the draft's content.
 */
export function CatalogImport({ catalogId, editable }: { catalogId: string; editable: boolean }) {
  const run = useImportCatalog(catalogId)
  const [dryRun, setDryRun] = useState<DryRun | null>(null)
  const [importError, setImportError] = useState<CurriculumError | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ImportValues>({
    resolver: zodResolver(importSchema),
    defaultValues: { coursesCsv: "", programsCsv: "" },
  })
  const current = { coursesCsv: watch("coursesCsv"), programsCsv: watch("programsCsv") }
  const allowed = canImport(editable, dryRun, current)
  const stale =
    dryRun !== null && (dryRun.coursesCsv !== current.coursesCsv || dryRun.programsCsv !== current.programsCsv)

  const loadFile = (field: keyof ImportValues) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setValue(field, await file.text(), { shouldDirty: true })
  }

  const onDryRun = handleSubmit((values) => {
    setImportError(null)
    run.mutate(
      { ...values, dryRun: true },
      {
        onSuccess: (res) => setDryRun({ ...values, report: res.report }),
        onError: (err) => {
          setDryRun(null)
          setImportError(curriculumError(err, "The dry run failed."))
        },
      }
    )
  })

  const onImport = handleSubmit((values) => {
    if (!canImport(editable, dryRun, values)) return
    setImportError(null)
    run.mutate(
      { ...values, dryRun: false },
      {
        onSuccess: (res) => {
          toast.success(`Imported ${res.report.counts.courses} courses and ${res.report.counts.programs} programs.`)
          setDryRun(null)
        },
        onError: (err) => setImportError(curriculumError(err, "Nothing was imported.")),
      }
    )
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Two CSV files: courses (one row per course; prerequisites as <code>MAT 121|MAT 171; ENG 111:C</code>) and
        programs (one row per requirement group). A dry run checks unknown codes, requirement loops and credit
        totals and writes nothing. An import replaces this draft's courses and programs.
      </p>
      <form aria-label="CSV import" className="space-y-3" onSubmit={onDryRun}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="import-courses">Courses CSV</Label>
            <Textarea
              id="import-courses"
              rows={8}
              className="font-mono text-xs"
              placeholder={COURSES_CSV_TEMPLATE}
              {...register("coursesCsv")}
            />
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Load courses CSV file"
              onChange={loadFile("coursesCsv")}
              className="text-xs"
            />
            {errors.coursesCsv && <p className="text-xs text-red-600">{errors.coursesCsv.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="import-programs">Programs CSV</Label>
            <Textarea
              id="import-programs"
              rows={8}
              className="font-mono text-xs"
              placeholder={PROGRAMS_CSV_TEMPLATE}
              {...register("programsCsv")}
            />
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Load programs CSV file"
              onChange={loadFile("programsCsv")}
              className="text-xs"
            />
            {errors.programsCsv && <p className="text-xs text-red-600">{errors.programsCsv.message}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" variant="outline" disabled={run.isPending} className="gap-1.5">
            <FlaskConical className="h-4 w-4" />
            Run dry run
          </Button>
          {editable && (
            <Button type="button" size="sm" onClick={onImport} disabled={!allowed || run.isPending} className="gap-1.5">
              <Upload className="h-4 w-4" />
              Import into this draft
            </Button>
          )}
          {editable && !allowed && (
            <span className="text-xs text-muted-foreground">
              {dryRun === null
                ? "Run a dry run first."
                : stale
                  ? "The files changed since the dry run — run it again."
                  : "Fix the problems in the report, then run the dry run again."}
            </span>
          )}
          {!editable && (
            <span className="text-xs text-muted-foreground">
              Published catalogs are never edited — start a new version to import into.
            </span>
          )}
        </div>
      </form>

      {importError && <CurriculumErrorPanel error={importError} />}
      {dryRun && <CurriculumReportView report={dryRun.report} title="Dry run" />}
    </div>
  )
}

export default CatalogImport
