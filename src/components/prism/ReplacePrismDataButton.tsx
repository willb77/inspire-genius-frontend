import { useRef, useState } from "react"
import type { JSX } from "react"
import { Loader2, Upload } from "lucide-react"

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
import { useReplaceMyPrismReport } from "@/hooks/prism/usePrismReportDownload"

interface ReplacePrismDataButtonProps {
  /** Button label. Defaults to "Replace PRISM Data". */
  label?: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
}

/**
 * Self-service: a user replaces their OWN PRISM scores from a raw-data CSV, and
 * optionally the report PDF, in a single step. Reused on the PRISM Assessment
 * page and in user Settings. Backed by `POST /v1/prism/report/me/replace`, which
 * is scoped to the caller — a user can only replace their own data.
 */
export function ReplacePrismDataButton({
  label = "Replace PRISM Data",
  variant = "outline",
  size = "sm",
  className,
}: ReplacePrismDataButtonProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [csv, setCsv] = useState<File | null>(null)
  const [pdf, setPdf] = useState<File | null>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const replace = useReplaceMyPrismReport()

  const reset = (): void => {
    setCsv(null)
    setPdf(null)
    if (csvRef.current) csvRef.current.value = ""
    if (pdfRef.current) pdfRef.current.value = ""
  }

  const onOpenChange = (next: boolean): void => {
    setOpen(next)
    if (!next) reset()
  }

  const submit = (): void => {
    if (!csv) return
    replace.mutate(
      { csv, pdf },
      { onSuccess: () => onOpenChange(false) },
    )
  }

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

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace your PRISM data</DialogTitle>
            <DialogDescription>
              Upload your PRISM raw-data CSV to replace your current scores.
              This overwrites your existing PRISM profile — it does not add a
              second one. You can optionally attach a replacement report PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prism-csv">
                PRISM scores CSV <span className="text-destructive">*</span>
              </Label>
              <input
                id="prism-csv"
                ref={csvRef}
                type="file"
                accept=".csv,text/csv"
                data-testid="prism-replace-csv"
                onChange={(e) => setCsv(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prism-pdf">Replacement report PDF (optional)</Label>
              <input
                id="prism-pdf"
                ref={pdfRef}
                type="file"
                accept="application/pdf,.pdf"
                data-testid="prism-replace-pdf"
                onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                If omitted, your report PDF is regenerated from the new scores.
              </p>
            </div>
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
            <Button
              type="button"
              data-testid="prism-replace-submit"
              onClick={submit}
              disabled={!csv || replace.isPending}
            >
              {replace.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ReplacePrismDataButton
