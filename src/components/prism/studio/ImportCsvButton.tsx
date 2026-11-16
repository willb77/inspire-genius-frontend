import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { FileUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import type { ImportCopy, ImportPort } from "./ports"

/** One row of the per-file outcome, so a partial batch is legible. */
type Outcome = { file: string; ok: boolean; message: string }

/**
 * Import authored PRISM CSVs into a library.
 *
 * Multi-file, because these arrive as a folder: twelve subjects were scored by
 * hand into the wide export format before anything could store them.
 *
 * Files are imported ONE AT A TIME rather than fanned out. The batch is small
 * and each request writes to the database, so there is nothing to win from
 * concurrency and a serial loop keeps the per-file outcome unambiguous — which
 * matters more here than speed, because a partial batch is the likely case.
 *
 * Every file reports its own result. A batch that half-worked must say which
 * half; "12 files imported" over 9 successes is the failure this whole surface
 * has been avoiding all along.
 *
 * The importer itself arrives by prop — see ./ports.ts.
 */
export default function ImportCsvButton({
  port,
  copy,
}: {
  port: ImportPort
  copy: ImportCopy
}) {
  const { t } = useTranslation("prismUi")
  const input = useRef<HTMLInputElement>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [running, setRunning] = useState(false)

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setRunning(true)
    setOutcomes([])
    const results: Outcome[] = []

    for (const file of Array.from(files)) {
      try {
        const content = await file.text()
        const result = await port.importCsv.run({ content, filename: file.name })
        const short =
          result.imported === result.expected
            ? t("importCsv.allScales", {
                defaultValue: "{{name}} — all {{expected}} scales",
                name: result.name,
                expected: result.expected,
              })
            : t("importCsv.someScales", {
                defaultValue: "{{name}} — {{imported}} of {{expected}} scales",
                name: result.name,
                imported: result.imported,
                expected: result.expected,
              })
        results.push({
          file: file.name,
          ok: true,
          // Warnings ride along on a SUCCESS. A file that imported 62 of 88
          // scales is a success with a caveat, not a failure, and hiding the
          // caveat would let it read as complete.
          message: result.warnings.length
            ? t("importCsv.withWarning", {
                defaultValue: "{{summary}} · {{warning}}",
                summary: short,
                warning: result.warnings[0],
              })
            : short,
        })
      } catch (err) {
        results.push({ file: file.name, ok: false, message: apiErrorMessage(err, t("importCsv.failed", { defaultValue: "Import failed" })) })
      }
      setOutcomes([...results])
    }

    setRunning(false)
    const ok = results.filter((r) => r.ok).length
    const failed = results.length - ok
    if (failed === 0) toast.success(copy.imported(ok))
    else if (ok === 0) toast.error(
        t("importCsv.allFailed", {
          defaultValue: "All {{failed}} file(s) failed — see the list below",
          failed,
        }),
      )
    else toast.warning(
        t("importCsv.partial", {
          defaultValue: "{{ok}} imported, {{failed}} failed — see the list below",
          ok,
          failed,
        }),
      )

    if (input.current) input.current.value = "" // re-importing the same file must re-fire
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="sr-only"
          aria-label={t("importCsv.ariaLabel", { defaultValue: "Character CSV files" })}
          onChange={(e) => void onFiles(e.target.files)}
        />
        <Button
          variant="secondary"
          onClick={() => input.current?.click()}
          disabled={running}
        >
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("importCsv.importing", { defaultValue: "Importing…" })}
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" /> {t("importCsv.button", { defaultValue: "Import CSV" })}
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">{copy.blurb}</p>
      </div>

      {outcomes.length > 0 && (
        <ul className="space-y-1 rounded-md border p-3 text-xs">
          {outcomes.map((o) => (
            <li key={o.file} className={o.ok ? "text-muted-foreground" : "text-destructive"}>
              <span aria-hidden>{o.ok ? "✓" : "✗"}</span>{" "}
              <span className="font-medium">{o.file}</span> — {o.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
