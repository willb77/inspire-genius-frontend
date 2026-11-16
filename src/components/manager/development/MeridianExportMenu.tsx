/**
 * "Export" on the TDS Meridian tile — Word, PDF, Excel, Print and Email for the
 * conversation on screen.
 *
 * Browser-only, like the workspace's Download button: the caller can already
 * see every word exported here. "Email" opens the manager's own mail client and
 * asks them to attach the downloaded file — nothing leaves through our mail
 * servers. Each artefact carries the member-data notice from
 * `lib/exportDevelopmentChat`.
 */
import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  developmentNotice,
  emailDevelopmentChat,
  exportDevelopmentChatExcel,
  exportDevelopmentChatPdf,
  exportDevelopmentChatWord,
  printDevelopmentChat,
  type DevelopmentChatTurn,
} from "@/lib/exportDevelopmentChat"
import { useTranslation } from "react-i18next"

type ExportAction = "word" | "pdf" | "excel" | "print" | "email"

export interface MeridianExportMenuProps {
  memberName: string
  managerName: string
  turns: DevelopmentChatTurn[]
}

const SUCCESS: Partial<Record<ExportAction, string>> = {
  word: "Exported the conversation as a Word document.",
  pdf: "Exported the conversation as a PDF.",
  excel: "Exported the conversation as an Excel workbook.",
  email: "Word copy downloaded — attach it to the email that just opened.",
}

export function MeridianExportMenu({ memberName, managerName, turns }: MeridianExportMenuProps) {
  const { t } = useTranslation("managerPages")
  const [busy, setBusy] = useState(false)
  const empty = turns.length === 0

  const run = async (action: ExportAction) => {
    const payload = { memberName, managerName, turns, generatedAt: new Date() }
    setBusy(true)
    try {
      if (action === "word") await exportDevelopmentChatWord(payload)
      else if (action === "pdf") await exportDevelopmentChatPdf(payload)
      else if (action === "excel") await exportDevelopmentChatExcel(payload)
      else if (action === "print") printDevelopmentChat(payload)
      else await emailDevelopmentChat(payload)
      const message = SUCCESS[action]
      if (message) toast.success(message)
    } catch {
      toast.error(t("meridianExportMenu.couldnTExportTheConversation", { defaultValue: "Couldn't export the conversation — please try again." }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={empty || busy}
          title={empty ? t("meridianExportMenu.nothingToExportYet", { defaultValue: "Nothing to export yet" }) : undefined}
          data-testid="meridian-export-trigger"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          )}{t("meridianExportMenu.export", { defaultValue: "Export" })}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px] font-normal leading-snug text-slate-500" data-testid="meridian-export-notice">
          {developmentNotice(memberName)}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void run("word")} data-testid="meridian-export-word">{t("meridianExportMenu.wordDocx", { defaultValue: "Word (.docx)" })}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void run("pdf")} data-testid="meridian-export-pdf">{t("meridianExportMenu.pdf", { defaultValue: "PDF" })}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void run("excel")} data-testid="meridian-export-excel">{t("meridianExportMenu.excelXlsx", { defaultValue: "Excel (.xlsx)" })}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void run("print")} data-testid="meridian-export-print">{t("meridianExportMenu.print", { defaultValue: "Print" })}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void run("email")} data-testid="meridian-export-email">{t("meridianExportMenu.emailOpensYourMailApp", { defaultValue: "Email (opens your mail app)" })}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
