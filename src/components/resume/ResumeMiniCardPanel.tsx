/**
 * RWO-2 — Option 11, the Mini Résumé / Profile Card, from the finished draft.
 * No model call, no daily slot. For career fairs and networking, never for an
 * application.
 */
import { useState } from "react"
import { Copy, Download, IdCard } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { downloadBlob } from "@/lib/exportTranscript"
import { renderAtsResume } from "@/lib/resume/exportResumeAts"
import { buildMiniCard, miniCardDocument, miniCardText } from "@/lib/resume/miniCard"
import type { ResumeContact } from "@/lib/resume/resumeDocument"
import type { GeneratedResume } from "@/types/resumeWriter"

export function ResumeMiniCardPanel({ draft, contact }: { draft: GeneratedResume; contact: ResumeContact }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const card = buildMiniCard(draft, contact)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(miniCardText(card))
      toast.success("Mini card copied.")
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.")
    }
  }
  const onPdf = async () => {
    setBusy(true)
    try {
      const { fileName, blob } = await renderAtsResume(miniCardDocument(card), "pdf", null, "Profile-Card")
      downloadBlob(fileName, blob)
    } catch {
      toast.error("Couldn't build the PDF. Try again, or use Copy.")
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} data-testid="resume-mini-open">
        <IdCard className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Make a Mini card for networking
      </Button>
    )

  return (
    <section data-testid="resume-mini-card" className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Mini card</h3>
          <p className="text-xs text-muted-foreground">For career fairs and networking — not for applications.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={onCopy}>
            <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Copy
          </Button>
          <Button size="sm" onClick={onPdf} disabled={busy}>
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            PDF
          </Button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm" data-testid="resume-mini-text">
        {miniCardText(card)}
      </pre>
    </section>
  )
}
