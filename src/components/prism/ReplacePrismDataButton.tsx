import { useState } from "react"
import type { JSX } from "react"
import { AlertTriangle, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PrismFileDrop } from "@/components/prism/PrismFileDrop"
import {
  sectionLossOf,
  useReplaceMyPrismReport,
} from "@/hooks/prism/usePrismReportDownload"
import { usePrismPdfReplaceEnabled } from "@/hooks/switches/usePrismPdfReplaceEnabled"
import { oversizeMessage } from "@/lib/prism/prismUpload"

interface ReplacePrismDataButtonProps {
  /** Button label. Defaults to "Replace PRISM Data". */
  label?: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
}

interface ReplacePrismDataDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
}

/**
 * The replace dialog on its own, with open state supplied by the caller.
 *
 * Split out of {@link ReplacePrismDataButton} so a surface that already has its
 * own trigger can reuse the real import flow instead of re-implementing it. The
 * first caller is HomeV2's "Personal Info → Prism Rpt .csv" entry, whose Add+
 * button previously opened a *plain document upload* — it tagged the file
 * `doc_kind='prism'` and wrote no scores, while the tile ticked to done. See the
 * note on that catalog entry.
 *
 * Backed by `POST /v1/prism/report/me/replace`. One drag-and-drop field takes
 * the report PDF and/or the scores CSV:
 *
 * - `prism_pdf_replace` OFF (the default): the CSV is required and the PDF is
 *   optional — today's behaviour, unchanged apart from the drop field.
 * - ON: either file will do. A PDF on its own is read into scores server-side.
 *   If the new report lacks sections the person has today, the server answers
 *   409 and this dialog lists them and offers to replace anyway.
 */
export function ReplacePrismDataDialog({
  open,
  onOpenChange: setOpenExternal,
}: ReplacePrismDataDialogProps): JSX.Element {
  const [csv, setCsv] = useState<File | null>(null)
  const [pdf, setPdf] = useState<File | null>(null)
  const [lossSections, setLossSections] = useState<string[] | null>(null)
  const replace = useReplaceMyPrismReport()
  const pdfOn = usePrismPdfReplaceEnabled()

  const reset = (): void => {
    setCsv(null)
    setPdf(null)
    setLossSections(null)
  }

  const onOpenChange = (next: boolean): void => {
    setOpenExternal(next)
    if (!next) reset()
  }

  const oversize = pdfOn ? oversizeMessage(csv, pdf) : null
  const hasFile = pdfOn ? Boolean(csv || pdf) : Boolean(csv)
  const canSubmit = hasFile && !oversize && !replace.isPending
  const converting = pdfOn && Boolean(pdf) && !csv

  const send = (confirmSectionLoss: boolean): void => {
    if (!hasFile || oversize) return
    replace.mutate(
      { csv, pdf, confirmSectionLoss },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          const sections = sectionLossOf(error)
          if (sections) setLossSections(sections)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace your PRISM data</DialogTitle>
          <DialogDescription>
            {pdfOn
              ? "Upload your PRISM report PDF and we'll read your scores from it — or upload the PRISM scores CSV, or both."
              : "Upload your PRISM raw-data CSV to replace your current scores. You can optionally add a replacement report PDF."}{" "}
            This overwrites your existing PRISM profile — it does not add a second one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label>
            {pdfOn ? (
              "PRISM report PDF and/or scores CSV"
            ) : (
              <>
                PRISM scores CSV <span className="text-destructive">*</span>, report PDF optional
              </>
            )}
          </Label>
          <PrismFileDrop
            pdf={pdf}
            csv={csv}
            accepts={["pdf", "csv"]}
            disabled={replace.isPending}
            onChange={(next) => {
              setPdf(next.pdf)
              setCsv(next.csv)
              setLossSections(null)
            }}
          />

          {!pdfOn && pdf && !csv && (
            <p className="text-xs text-muted-foreground" data-testid="prism-replace-needs-csv">
              Add the PRISM scores CSV to replace your scores. The PDF is stored alongside it.
            </p>
          )}
          {!pdfOn && csv && !pdf && (
            <p className="text-xs text-muted-foreground">
              Without a PDF, your report PDF is regenerated from the new scores.
            </p>
          )}
          {oversize && (
            <p className="text-xs text-destructive" role="alert" data-testid="prism-replace-oversize">
              {oversize}
            </p>
          )}

          {lossSections && (
            <div
              role="alert"
              data-testid="prism-replace-section-loss"
              className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">This report has less than your current PRISM data.</p>
                  <p>
                    It does not include{" "}
                    {lossSections.length ? lossSections.join(", ") : "some sections"} as fully as
                    your current data does. Replacing will remove what is missing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={replace.isPending}
          >
            Cancel
          </Button>
          {lossSections ? (
            <Button
              type="button"
              variant="destructive"
              data-testid="prism-replace-confirm-loss"
              onClick={() => send(true)}
              disabled={!canSubmit}
            >
              {replace.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Replace anyway
            </Button>
          ) : (
            <Button
              type="button"
              data-testid="prism-replace-submit"
              onClick={() => send(false)}
              disabled={!canSubmit}
            >
              {replace.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {replace.isPending && converting ? "Reading your report…" : "Replace"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Self-service: a user replaces their OWN PRISM scores from a raw-data CSV, and
 * optionally the report PDF, in a single step (or from the PDF alone while
 * `prism_pdf_replace` is on). Reused on the PRISM Assessment page and in user
 * Settings. Backed by `POST /v1/prism/report/me/replace`, which is scoped to the
 * caller — a user can only replace their own data.
 */
export function ReplacePrismDataButton({
  label = "Replace PRISM Data",
  variant = "outline",
  size = "sm",
  className,
}: ReplacePrismDataButtonProps): JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        data-testid="prism-replace-open"
        onClick={() => setOpen(true)}
      >
        <Upload className="mr-1.5 h-4 w-4" />
        {label}
      </Button>

      <ReplacePrismDataDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export default ReplacePrismDataButton
