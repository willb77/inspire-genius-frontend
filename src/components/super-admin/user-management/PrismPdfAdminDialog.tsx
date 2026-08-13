import { useRef, useState } from "react"
import type { JSX } from "react"
import { Loader2, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  useAdminDeletePrismPdf,
  useAdminUploadPrismPdf,
} from "@/hooks/prism/usePrismReportDownload"

export type PrismPdfTarget = { id: string; email: string; name?: string }

interface PrismPdfAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: PrismPdfTarget | null
}

/**
 * Super-admin: upload or delete a user's PRISM report PDF. Upload registers the
 * PDF as the user's report (the report link then serves it); delete removes it,
 * after which the report falls back to rendering from the user's scores.
 */
export default function PrismPdfAdminDialog({
  open,
  onOpenChange,
  target,
}: PrismPdfAdminDialogProps): JSX.Element {
  const [pdf, setPdf] = useState<File | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useAdminUploadPrismPdf()
  const del = useAdminDeletePrismPdf()

  const reset = (): void => {
    setPdf(null)
    setConfirmDelete(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const close = (next: boolean): void => {
    onOpenChange(next)
    if (!next) reset()
  }

  const doUpload = (): void => {
    if (!pdf || !target) return
    upload.mutate({ userId: target.id, pdf }, { onSuccess: () => close(false) })
  }

  const doDelete = (): void => {
    if (!target) return
    del.mutate({ userId: target.id }, { onSuccess: () => close(false) })
  }

  const busy = upload.isPending || del.isPending
  const who = target?.name || target?.email || "this user"

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PRISM report PDF — {who}</DialogTitle>
          <DialogDescription>
            Upload a PRISM report PDF for this user, or delete their current one.
            After a delete, their report is regenerated from their scores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="admin-prism-pdf">Report PDF</Label>
            <input
              id="admin-prism-pdf"
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              data-testid="admin-prism-pdf-file"
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
            <Button
              type="button"
              size="sm"
              className="mt-1"
              data-testid="admin-prism-pdf-upload"
              onClick={doUpload}
              disabled={!pdf || busy}
            >
              {upload.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              Upload PDF
            </Button>
          </div>

          <div className="border-t pt-3">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Delete this user's PRISM PDF?
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  data-testid="admin-prism-pdf-delete-confirm"
                  onClick={doDelete}
                  disabled={busy}
                >
                  {del.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  Confirm delete
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive"
                data-testid="admin-prism-pdf-delete"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete PRISM PDF
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
