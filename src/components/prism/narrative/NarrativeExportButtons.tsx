import { useState } from "react"
import { useTranslation } from "react-i18next"
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
  label,
}: {
  build: () => NarrativeDoc
  disabled?: boolean
  label?: string
}) {
  const { t } = useTranslation("prismUi")
  const what = label ?? t("narrativeExport.defaultLabel", { defaultValue: "this write-up" })
  const [busy, setBusy] = useState<"word" | "pdf" | null>(null)

  async function run(kind: "word" | "pdf") {
    const doc = build()
    if (!hasNarrative(doc)) {
      toast.error(
        t("narrativeExport.nothingToExport", {
          defaultValue: "Nothing to export yet — generate {{what}} first.",
          what,
        }),
      )
      return
    }
    setBusy(kind)
    try {
      await (kind === "word" ? exportNarrativeWord(doc) : exportNarrativePdf(doc))
      toast.success(
        kind === "word"
          ? t("narrativeExport.savedWord", { defaultValue: "Saved the Word document" })
          : t("narrativeExport.savedPdf", { defaultValue: "Saved the PDF document" }),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("narrativeExport.failed", { defaultValue: "Export failed" }))
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
        {t("studioUi:prism.narrativeNarrativeExportButtons.pdf", { defaultValue: "PDF" })}
      </Button>
      <Button variant="outline" size="sm" disabled={disabled || busy !== null} onClick={() => run("word")}>
        {busy === "word" ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="mr-2 h-3.5 w-3.5" />
        )}
        {t("studioUi:prism.narrativeNarrativeExportButtons.word", { defaultValue: "Word" })}
      </Button>
    </div>
  )
}
