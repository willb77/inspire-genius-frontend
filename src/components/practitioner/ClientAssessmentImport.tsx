/**
 * TDS A4 — a practitioner sends a client's DISC or CliftonStrengths result.
 *
 * On the practitioner's client page. Choose the assessment and the file →
 * POST …/assessments/import/preview (parses, saves nothing) → review the rows
 * (drop a misread one; for CliftonStrengths, fix the order) → POST
 * …/import/confirm, which sends it to the client's InspiresGenius account
 * HELD. It counts for nothing until the client accepts it in their Settings,
 * and the dialog says so when it is sent.
 *
 * The server refuses an unlinked client (409) and a client the caller has no
 * access to (403); its words are shown as they come.
 */
import { useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { ArrowDown, ArrowUp, CheckCircle2, FileUp, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  usePreviewClientAssessmentImport,
  useSendClientAssessmentImport,
} from "@/hooks/practitioner/useCoachClient"
import {
  moveRow,
  reviewProblem,
  toConfirmRows,
  toReviewRows,
  type ReviewRow,
} from "@/components/shared/settings/assessmentReview"
import type { ClientImportFramework } from "@/types/practitioner/coachClient"
import {
  CLIENT_IMPORT_ACCEPT,
  CLIENT_IMPORT_FRAMEWORKS,
  importFailure,
} from "./clientImportHelpers"

type Step = "choose" | "review" | "sent"

export default function ClientAssessmentImport({
  clientId,
  clientName,
}: {
  clientId: string
  clientName: string
}): JSX.Element {
  const { t } = useTranslation("practitionerPages")
  const preview = usePreviewClientAssessmentImport()
  const send = useSendClientAssessmentImport()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("choose")
  const [framework, setFramework] = useState<ClientImportFramework | "">("")
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const busy = preview.isPending || send.isPending

  const failText = (err: unknown): string => {
    const f = importFailure(err)
    if (f.kind === "detail" && f.detail) return f.detail
    if (f.kind === "notLinked")
      return t("clientImport.notLinked", { defaultValue: "This client has not linked an InspiresGenius account yet." })
    if (f.kind === "forbidden")
      return t("clientImport.forbidden", { defaultValue: "You do not have access to this client." })
    if (f.kind === "tooLarge") return t("clientImport.tooLarge", { defaultValue: "That file is too large." })
    return t("clientImport.failed", {
      defaultValue: "We could not read that file. Check the file and the assessment, then try again.",
    })
  }

  const reset = (): void => {
    setStep("choose")
    setFramework("")
    setFile(null)
    setRows([])
    setError(null)
    preview.reset()
    send.reset()
  }

  const close = (): void => {
    reset()
    setOpen(false)
  }

  const onRead = async (): Promise<void> => {
    if (!framework || !file) return
    setError(null)
    try {
      const data = await preview.mutateAsync({ clientId, framework, file })
      setRows(toReviewRows(data.framework, data.scores ?? []))
      setStep("review")
    } catch (err) {
      setError(failText(err))
    }
  }

  const onSend = async (): Promise<void> => {
    if (!framework || reviewProblem(framework, rows, false)) return
    setError(null)
    try {
      await send.mutateAsync({ clientId, framework, scores: toConfirmRows(framework, rows) })
      setStep("sent")
    } catch (err) {
      setError(failText(err))
    }
  }

  const label = CLIENT_IMPORT_FRAMEWORKS.find((f) => f.key === framework)?.label ?? ""
  const problem = step === "review" && framework ? reviewProblem(framework, rows, false) : null
  const isClifton = framework === "CLIFTON"

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#6b7280]">
        {t("clientImport.help", {
          name: clientName,
          defaultValue:
            "Send {{name}} a DISC or CliftonStrengths result from a report you hold. It counts only after {{name}} accepts it in their InspiresGenius Settings.",
        })}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="border-[#e5e7eb] text-[#3B5BFF] hover:bg-[#eef1ff] hover:text-[#2A47CC]"
        onClick={() => {
          reset()
          setOpen(true)
        }}
      >
        <FileUp className="mr-1.5 h-4 w-4" />
        {t("clientImport.open", { defaultValue: "Import DISC or CliftonStrengths" })}
      </Button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : !busy && close())}>
        <DialogContent data-testid="client-import-dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("clientImport.title", { name: clientName, defaultValue: "Send {{name}} an assessment result" })}
            </DialogTitle>
            <DialogDescription>
              {step === "review"
                ? t("clientImport.reviewHelp", {
                    defaultValue: "Check what we read from the file and remove anything wrong. Nothing is sent until you press Send.",
                  })
                : step === "sent"
                  ? t("clientImport.sentHelp", { defaultValue: "Sent and waiting for the client." })
                  : t("clientImport.chooseHelp", {
                      defaultValue: "Choose the assessment and the file (CSV, PDF, Excel or Word). You will review the result before it is sent.",
                    })}
            </DialogDescription>
          </DialogHeader>

          {step === "choose" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="client-import-framework">
                  {t("clientImport.framework", { defaultValue: "Assessment" })}
                </Label>
                <select
                  id="client-import-framework"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={framework}
                  onChange={(e) => setFramework(e.target.value as ClientImportFramework | "")}
                >
                  <option value="">{t("clientImport.chooseFramework", { defaultValue: "Choose an assessment" })}</option>
                  {CLIENT_IMPORT_FRAMEWORKS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="client-import-file">{t("clientImport.file", { defaultValue: "File" })}</Label>
                <Input
                  id="client-import-file"
                  type="file"
                  accept={CLIENT_IMPORT_ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="max-h-80 space-y-3 overflow-y-auto" data-testid="client-import-review">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("clientImport.reviewEmpty", { defaultValue: "No results are left to send." })}
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {rows.map((row, i) => (
                    <li key={`${row.dimension}-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                      {isClifton && <span className="w-6 shrink-0 text-muted-foreground">{i + 1}.</span>}
                      <span className="flex-1 truncate">{row.dimension}</span>
                      {isClifton && !row.known && (
                        <span className="text-xs text-destructive">
                          {t("clientImport.unknownTheme", { defaultValue: "Not a CliftonStrengths theme" })}
                        </span>
                      )}
                      {!isClifton && (
                        <span className="tabular-nums text-muted-foreground">
                          {row.score_numeric ?? row.score_text ?? ""}
                        </span>
                      )}
                      {isClifton && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("clientImport.moveUp", { name: row.dimension, defaultValue: "Move {{name}} up" })}
                            disabled={i === 0}
                            onClick={() => setRows(moveRow(rows, i, -1))}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("clientImport.moveDown", { name: row.dimension, defaultValue: "Move {{name}} down" })}
                            disabled={i === rows.length - 1}
                            onClick={() => setRows(moveRow(rows, i, 1))}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("clientImport.removeRow", { name: row.dimension, defaultValue: "Remove {{name}}" })}
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {problem === "unknown" && (
                <p className="text-xs text-destructive">
                  {t("clientImport.removeUnknown", { defaultValue: "Remove the themes marked above before sending." })}
                </p>
              )}
            </div>
          )}

          {step === "sent" && (
            <div className="flex gap-2 rounded-md border border-[#D1FAE5] bg-[#ECFDF5] p-3 text-sm" data-testid="client-import-sent">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#065F46]" />
              <p className="text-[#065F46]">
                {t("clientImport.sent", {
                  name: clientName,
                  framework: label,
                  defaultValue:
                    "Sent. The {{framework}} result is waiting for {{name}}. It does not count until {{name}} accepts it in their InspiresGenius Settings, and {{name}} can decline it.",
                })}
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            {step === "choose" && (
              <>
                <Button type="button" variant="outline" onClick={close} disabled={busy}>
                  {t("clientImport.cancel", { defaultValue: "Cancel" })}
                </Button>
                <Button type="button" onClick={() => void onRead()} disabled={busy || !framework || !file}>
                  {preview.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {t("clientImport.read", { defaultValue: "Read file" })}
                </Button>
              </>
            )}
            {step === "review" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setError(null)
                    setStep("choose")
                  }}
                  disabled={busy}
                >
                  {t("clientImport.back", { defaultValue: "Back" })}
                </Button>
                <Button type="button" onClick={() => void onSend()} disabled={busy || problem !== null}>
                  {send.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {t("clientImport.send", { name: clientName, defaultValue: "Send to {{name}}" })}
                </Button>
              </>
            )}
            {step === "sent" && (
              <Button type="button" onClick={close}>
                {t("clientImport.done", { defaultValue: "Done" })}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
