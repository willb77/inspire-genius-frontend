/**
 * TDS U12 (CSA #2210, "link only"): a practitioner imports a linked client's
 * PRISM report CSV from the client's own page.
 *
 * The page names the client only by its coach-record id. The server resolves
 * the client's own account from the link and writes the report there, where it
 * becomes the client's current PRISM. The dialog says so before anything is
 * sent. CSV only; anything else is refused here, before an upload. Every refusal
 * from the server (not linked, already imported, no access, unreadable file) is
 * shown in the server's own words.
 */
import { useRef, useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useImportClientPrism } from "@/hooks/practitioner/useCoachClient"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { withPrism } from "@/lib/withPrism"
import { isCsvFile } from "./clientPrismImportHelpers"

interface ClientPrismImportProps {
  clientId: string
  clientName: string
}

export default function ClientPrismImport({ clientId, clientName }: ClientPrismImportProps): JSX.Element {
  const { t } = useTranslation("practitionerPages")
  const importPrism = useImportClientPrism()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function openDialog() {
    setError(null)
    setDone(false)
    importPrism.reset()
    setOpen(true)
  }

  function send() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError(t("clientPrismImport.chooseFile", { defaultValue: "Choose the client’s PRISM report CSV first." }))
      return
    }
    if (!isCsvFile(file)) {
      setError(t("clientPrismImport.csvOnly", { defaultValue: "A PRISM report imports as a CSV file only. Choose a .csv file." }))
      return
    }
    setError(null)
    importPrism.mutate(
      { clientId, file },
      {
        onSuccess: () => {
          setOpen(false)
          setDone(true)
          if (fileRef.current) fileRef.current.value = ""
        },
        onError: (err) => {
          setError(
            apiErrorMessage(
              err,
              t("clientPrismImport.failed", {
                name: clientName,
                defaultValue: "The import failed. Nothing was added to {{name}}’s profile.",
              }),
            ),
          )
        },
      },
    )
  }

  return (
    <div className="space-y-2">
      {done && (
        <p role="status" className="text-sm text-[#065F46]" data-testid="client-prism-import-done">
          {withPrism(
            t("clientPrismImport.done", {
              name: clientName,
              defaultValue: "Imported. This PRISM report is now on {{name}}’s InspiresGenius profile as their current PRISM.",
            }),
          )}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        className="border-[#e5e7eb] text-[#3B5BFF] hover:bg-[#eef1ff] hover:text-[#2A47CC]"
        onClick={openDialog}
      >
        <Upload className="mr-1.5 h-4 w-4" />
        {withPrism(t("clientPrismImport.open", { defaultValue: "Import PRISM report (CSV)" }))}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{withPrism(t("clientPrismImport.open", { defaultValue: "Import PRISM report (CSV)" }))}</DialogTitle>
            <DialogDescription>
              {withPrism(
                t("clientPrismImport.description", {
                  name: clientName,
                  defaultValue:
                    "This adds the report to {{name}}’s own InspiresGenius profile, where it becomes their current PRISM. Only a CSV file can be imported.",
                }),
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            <Label htmlFor="client-prism-csv-file">
              {withPrism(t("clientPrismImport.fileLabel", { defaultValue: "PRISM report (CSV file)" }))}
            </Label>
            <input
              ref={fileRef}
              id="client-prism-csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={() => setError(null)}
              className="block w-full text-sm text-[#6b7280] file:mr-3 file:rounded file:border-0 file:bg-[#3B5BFF] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#2A47CC]"
            />
            {/* Plain text on purpose: a server refusal is shown exactly as sent. */}
            {error && (
              <p role="alert" className="text-sm text-[#B91C1C]" data-testid="client-prism-import-error">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("clientProfile.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              className="bg-[#3B5BFF] text-white hover:bg-[#2A47CC]"
              disabled={importPrism.isPending}
              onClick={send}
            >
              {importPrism.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("clientPrismImport.send", { defaultValue: "Import" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
