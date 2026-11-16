import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import {
  Download,
  FileText,
  ChevronDown,
  Printer,
  Save,
  Mail,
  Link2,
  PenLine,
  Loader2,
} from "lucide-react"
import type { FitDetail } from "@/types/job-fit"
import { downloadBlob } from "@/lib/exportTranscript"
import { renderHtmlToPdf } from "@/lib/exportTranscript/renderPdf"
import { copyReportLink, emailReportLink } from "@/lib/honor/shareReportLink"
import { useSaveFitReport } from "@/hooks/job-fit/useFitHistory"
import {
  buildFitReportHtml,
  buildFitReportMarkdown,
  buildFitReportText,
  fitReportFileBase,
  type FitV2Report,
} from "@/lib/job-fit/fitReport"
import { displayFitPercent } from "@/components/fit/fit"

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-3 py-2 text-sm font-medium text-white hover:bg-[#0b8078] disabled:opacity-50"

type ExportFormat = "pdf" | "md" | "html" | "txt"
const EXPORT_FORMATS: ExportFormat[] = ["pdf", "md", "html", "txt"]

function exportFormatLabel(fmt: ExportFormat, t: TFunction): string {
  switch (fmt) {
    case "pdf":
      return t("fitActionsBar.formatPdf", "PDF")
    case "md":
      return t("fitActionsBar.formatMd", "Markdown (.md)")
    case "html":
      return t("fitActionsBar.formatHtml", "Web page (.html)")
    default:
      return t("fitActionsBar.formatTxt", "Text (.txt)")
  }
}

/** Print a rendered PDF blob via a hidden iframe (keeps the report isolated). */
function printBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement("iframe")
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
  iframe.src = url
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      window.open(url, "_blank")
    }
    window.setTimeout(() => {
      iframe.remove()
      URL.revokeObjectURL(url)
    }, 60_000)
  }
  document.body.appendChild(iframe)
}

/**
 * Honor-Evaluate-style action toolbar for a Job Fit result: Download PDF,
 * Export As, Print, Save, Email, Copy link, and Write Résumé. All copy is
 * NON-BINARY. Reuses the shared export/share utils — no new dependencies.
 *
 * Save writes a real row (POST /v1/blueprint/fit/history, JS-3) with the
 * breakdown as rendered; it used to write browser storage and report success.
 *
 * "Write Résumé" opens the Résumé Writer aimed at this role
 * (`/my/resume?jobId=<id>`), built on the person's whole résumé. The basic
 * inline draft it used to fall back to, and its route
 * (`POST /v1/agents/blueprint/write-resume`), were removed on Bill's word,
 * typed in Coord2 2026-10-24 23:13 EDT: "remove Career Fit's old résumé route:
 * yes". With no `resumeHref` (no role id) there is no button.
 *
 * JF-6 — PDF only on the Careers and Jobs job page. When the page passes `v2`
 * (its `job_fit_v2` layout) the bar offers Download PDF, Save and Write
 * Résumé; Export as, Print, Email and Copy link are not drawn, and the PDF
 * carries the v2 page's sections. Without `v2` the bar is today's bar. Honor's
 * share helpers (`lib/honor/shareReportLink`) are untouched and still serve
 * the Honor pages (F-32).
 */
export function FitActionsBar({
  data,
  overview,
  resumeHref,
  v2,
}: {
  data: FitDetail
  overview?: string
  resumeHref?: string
  v2?: FitV2Report
}) {
  const { t } = useTranslation("jobFitPages")
  const pct = displayFitPercent(data)
  const reportInput = { data, pct, overview, v2 }
  const pdfOnly = v2 !== undefined
  const [busy, setBusy] = useState<null | "pdf" | "print" | "export">(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveReport = useSaveFitReport()

  async function handleDownloadPdf() {
    setBusy("pdf")
    try {
      const blob = await renderHtmlToPdf(buildFitReportHtml(reportInput))
      downloadBlob(`${fitReportFileBase(data)}.pdf`, blob)
      toast.success(t("fitActionsBar.downloaded", "Fit report downloaded."))
    } catch {
      toast.error(t("fitActionsBar.pdfFailed", "Could not generate the PDF."))
    } finally {
      setBusy(null)
    }
  }

  async function handleExport(fmt: ExportFormat) {
    setMenuOpen(false)
    setBusy("export")
    try {
      const base = fitReportFileBase(data)
      if (fmt === "pdf") {
        const blob = await renderHtmlToPdf(buildFitReportHtml(reportInput))
        downloadBlob(`${base}.pdf`, blob)
      } else if (fmt === "md") {
        downloadBlob(`${base}.md`, new Blob([buildFitReportMarkdown(reportInput)], { type: "text/markdown" }))
      } else if (fmt === "html") {
        downloadBlob(`${base}.html`, new Blob([buildFitReportHtml(reportInput)], { type: "text/html" }))
      } else {
        downloadBlob(`${base}.txt`, new Blob([buildFitReportText(reportInput)], { type: "text/plain" }))
      }
      toast.success(t("fitActionsBar.exported", "Fit report exported."))
    } catch {
      toast.error(t("fitActionsBar.exportFailed", "Could not export the report."))
    } finally {
      setBusy(null)
    }
  }

  async function handlePrint() {
    setBusy("print")
    try {
      const blob = await renderHtmlToPdf(buildFitReportHtml(reportInput))
      printBlob(blob)
    } catch {
      toast.error(t("fitActionsBar.printFailed", "Could not prepare the report for printing."))
    } finally {
      setBusy(null)
    }
  }

  async function handleSave() {
    if (saveReport.isPending) return
    try {
      await saveReport.mutateAsync({
        jobId: data.jobId || null,
        roleTitle: data.roleTitle,
        fitScore: pct,
        tier: data.tier,
        payload: { ...data, overview: overview || "" },
      })
      setSaved(true)
      toast.success(t("fitActionsBar.savedToast", "Saved to your fit reports."))
    } catch {
      /* the hook already toasted the failure */
    }
  }

  function handleEmail() {
    emailReportLink({
      subject: t("fitActionsBar.emailSubject", {
        defaultValue: "My Job Fit — {{role}}",
        role: data.roleTitle,
      }),
      intro: t("fitActionsBar.emailIntro", {
        defaultValue: "My fit for {{role}}: about {{pct}}% aligned. View the full breakdown:",
        role: data.roleTitle,
        pct,
      }),
      url: window.location.href,
    })
  }

  async function handleCopyLink() {
    const ok = await copyReportLink(window.location.href)
    toast[ok ? "success" : "error"](
      ok
        ? t("fitActionsBar.linkCopied", "Link copied to clipboard.")
        : t("fitActionsBar.linkCopyFailed", "Could not copy the link."),
    )
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleDownloadPdf} disabled={busy !== null} className={BTN_PRIMARY}>
          {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t("fitActionsBar.downloadPdf", "Download PDF")}
        </button>

        {!pdfOnly && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={busy !== null}
              className={BTN}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {t("fitActionsBar.exportAs", "Export as…")}
              <ChevronDown className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div role="menu" className="absolute left-0 z-50 mt-1 w-52 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-lg">
                  {EXPORT_FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      role="menuitem"
                      onClick={() => handleExport(fmt)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1f2937] hover:bg-[#f4f6fa]"
                    >
                      <FileText className="h-4 w-4 text-[#6b7280]" />
                      {exportFormatLabel(fmt, t)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!pdfOnly && (
          <button type="button" onClick={handlePrint} disabled={busy !== null} className={BTN}>
            {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {t("fitActionsBar.print", "Print")}
          </button>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saveReport.isPending}
          className={BTN}
          title={t("fitActionsBar.saveTitle", "Save this fit report to revisit later")}
        >
          {saveReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? t("fitActionsBar.savedLabel", "Saved") : t("fitActionsBar.save", "Save")}
        </button>

        {!pdfOnly && (
          <button type="button" onClick={handleEmail} className={BTN} title={t("fitActionsBar.emailTitle", "Open your email with a link to this fit")}
          >
            <Mail className="h-4 w-4" />
            {t("fitActionsBar.email", "Email")}
          </button>
        )}

        {!pdfOnly && (
          <button type="button" onClick={handleCopyLink} className={BTN} title={t("fitActionsBar.copyLinkTitle", "Copy a link to this fit")}
          >
            <Link2 className="h-4 w-4" />
            {t("fitActionsBar.copyLink", "Copy link")}
          </button>
        )}

        {resumeHref ? (
          <Link
            to={resumeHref}
            className={BTN}
            title={t(
              "fitActionsBar.resumeTitle",
              "Write your résumé for this role, built on the résumé you have on file",
            )}
          >
            <PenLine className="h-4 w-4" />
            {t("fitActionsBar.writeResume", "Write Résumé")}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
