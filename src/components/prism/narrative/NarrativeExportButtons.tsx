import { useState } from "react"
import { toast } from "sonner"
import { FileDown, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  exportNarrativePdf,
  exportNarrativeWord,
  hasNarrative,
  type NarrativeDoc,
} from "@/lib/exportNarrative"

/**
 * Word + PDF for any Character Lab narrative.
 *
 * `build` is a FUNCTION, not a value: the panels re-render as sections stream
 * in, and a doc captured at render time would export whatever was on screen
 * when the button first mounted. Building on click reads the current state.
 *
 * Disabled until there is something to export. An export button that produces
 * an empty document with a title and a notice is worse than no button — it
 * looks like the narrative was generated and came back blank.
 */
export default function NarrativeExportButtons({
  build,
  disabled,
  label = "this write-up",
}: {
  build: () => NarrativeDoc
  disabled?: boolean
  label?: string
}) {
  const [busy, setBusy] = useState<"word" | "pdf" | null>(null)

  async function run(kind: "word" | "pdf") {
    const doc = build()
    if (!hasNarrative(doc)) {
      toast.error(`Nothing to export yet — generate ${label} first.`)
      return
    }
    setBusy(kind)
    try {
      await (kind === "word" ? exportNarrativeWord(doc) : exportNarrativePdf(doc))
      toast.success(`Saved the ${kind === "word" ? "Word" : "PDF"} document`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={disabled || busy !== null} onClick={() => run("pdf")}>
        {busy === "pdf" ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-3.5 w-3.5" />
        )}
        PDF
      </Button>
      <Button variant="outline" size="sm" disabled={disabled || busy !== null} onClick={() => run("word")}>
        {busy === "word" ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="mr-2 h-3.5 w-3.5" />
        )}
        Word
      </Button>
    </div>
  )
}
