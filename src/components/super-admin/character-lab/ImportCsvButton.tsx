import { useRef, useState } from "react"
import { toast } from "sonner"
import { FileUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useImportProfileCsv } from "@/hooks/super-admin/useCharacterLab"
import { apiErrorMessage } from "@/lib/apiErrorMessage"

/** One row of the per-file outcome, so a partial batch is legible. */
type Outcome = { file: string; ok: boolean; message: string }

/**
 * Import authored PRISM CSVs into the library.
 *
 * Multi-file, because these arrive as a folder: twelve characters were scored
 * by hand into the wide export format before the Lab could store anything.
 *
 * Files are imported ONE AT A TIME rather than fanned out. The batch is small
 * and each request writes to the database, so there is nothing to win from
 * concurrency and a serial loop keeps the per-file outcome unambiguous — which
 * matters more here than speed, because a partial batch is the likely case.
 *
 * Every file reports its own result. A batch that half-worked must say which
 * half; "12 files imported" over 9 successes is the failure this whole surface
 * has been avoiding all along.
 */
export default function ImportCsvButton() {
  const input = useRef<HTMLInputElement>(null)
  const importCsv = useImportProfileCsv()
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
        const result = await importCsv.mutateAsync({ content, filename: file.name })
        const short =
          result.imported === result.expected
            ? `${result.name} — all ${result.expected} scales`
            : `${result.name} — ${result.imported} of ${result.expected} scales`
        results.push({
          file: file.name,
          ok: true,
          // Warnings ride along on a SUCCESS. A file that imported 62 of 88
          // scales is a success with a caveat, not a failure, and hiding the
          // caveat would let it read as complete.
          message: result.warnings.length ? `${short} · ${result.warnings[0]}` : short,
        })
      } catch (err) {
        results.push({ file: file.name, ok: false, message: apiErrorMessage(err, "Import failed") })
      }
      setOutcomes([...results])
    }

    setRunning(false)
    const ok = results.filter((r) => r.ok).length
    const failed = results.length - ok
    if (failed === 0) toast.success(`Imported ${ok} character${ok === 1 ? "" : "s"}`)
    else if (ok === 0) toast.error(`All ${failed} file(s) failed — see the list below`)
    else toast.warning(`${ok} imported, ${failed} failed — see the list below`)

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
          aria-label="Character CSV files"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <Button
          variant="secondary"
          onClick={() => input.current?.click()}
          disabled={running}
        >
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" /> Import CSV
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Wide-format PRISM exports — the layout <strong>Wide CSV</strong> writes. Scores are
          taken exactly as authored; the brain map is derived from the eight behaviour
          preferences. Re-importing a corrected file updates that character.
        </p>
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
