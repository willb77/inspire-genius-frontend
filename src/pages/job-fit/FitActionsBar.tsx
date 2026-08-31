import { useState } from "react"
import { toast } from "sonner"
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
  X,
} from "lucide-react"
import type { FitDetail } from "@/types/job-fit"
import { downloadBlob } from "@/lib/exportTranscript"
import { renderHtmlToPdf } from "@/lib/exportTranscript/renderPdf"
import { copyReportLink, emailReportLink } from "@/lib/honor/shareReportLink"
import { useWriteResume } from "@/hooks/job-fit/useWriteResume"
import {
  buildFitReportHtml,
  buildFitReportMarkdown,
  buildFitReportText,
  fitReportFileBase,
} from "@/lib/job-fit/fitReport"
import { fitPercent } from "./_fit"

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-3 py-2 text-sm font-medium text-white hover:bg-[#0b8078] disabled:opacity-50"

type ExportFormat = "pdf" | "md" | "html" | "txt"
const EXPORT_FORMATS: Array<{ fmt: ExportFormat; label: string }> = [
  { fmt: "pdf", label: "PDF" },
  { fmt: "md", label: "Markdown (.md)" },
  { fmt: "html", label: "Web page (.html)" },
  { fmt: "txt", label: "Text (.txt)" },
]

const SAVED_KEY = "ig.jobfit.savedReports"

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
 */
export function FitActionsBar({ data, overview }: { data: FitDetail; overview?: string }) {
  const pct = fitPercent(data.fitScore, data.totalVariation, data.perDimension.length || 22)
  const reportInput = { data, pct, overview }
  const [busy, setBusy] = useState<null | "pdf" | "print" | "export">(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const writeResume = useWriteResume()
  const [showResume, setShowResume] = useState(false)

  async function handleDownloadPdf() {
    setBusy("pdf")
    try {
      const blob = await renderHtmlToPdf(buildFitReportHtml(reportInput))
      downloadBlob(`${fitReportFileBase(data)}.pdf`, blob)
      toast.success("Fit report downloaded.")
    } catch {
      toast.error("Could not generate the PDF.")
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
      toast.success("Fit report exported.")
    } catch {
      toast.error("Could not export the report.")
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
      toast.error("Could not prepare the report for printing.")
    } finally {
      setBusy(null)
    }
  }

  function handleSave() {
    try {
      const raw = localStorage.getItem(SAVED_KEY)
      const list: unknown[] = raw ? JSON.parse(raw) : []
      const entry = {
        jobId: data.jobId,
        roleTitle: data.roleTitle,
        fitScore: pct,
        overview: overview || "",
        savedAt: new Date().toISOString(),
        url: window.location.href,
      }
      const next = [entry, ...list.filter((e) => (e as { jobId?: string })?.jobId !== data.jobId)].slice(0, 50)
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      setSaved(true)
      toast.success("Saved to your fit reports.")
    } catch {
      toast.error("Could not save this report.")
    }
  }

  function handleEmail() {
    emailReportLink({
      subject: `My Job Fit — ${data.roleTitle}`,
      intro: `My fit for ${data.roleTitle}: about ${pct}% aligned. View the full breakdown:`,
      url: window.location.href,
    })
  }

  async function handleCopyLink() {
    const ok = await copyReportLink(window.location.href)
    toast[ok ? "success" : "error"](ok ? "Link copied to clipboard." : "Could not copy the link.")
  }

  async function handleWriteResume() {
    setShowResume(true)
    if (writeResume.data || writeResume.isPending) return
    const topDimensions = data.perDimension
      .filter((d) => d.gap >= 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 6)
      .map((d) => d.dimensionName)
    try {
      await writeResume.mutateAsync({
        roleTitle: data.roleTitle,
        strengths: data.interviewSelfAdvocacy,
        topDimensions,
        fitContext: `About ${pct}% aligned with ${data.roleTitle}.`,
        fitScore: pct,
      })
    } catch {
      toast.error("Could not draft a résumé right now.")
    }
  }

  function downloadResume() {
    const r = writeResume.data
    if (!r) return
    const lines = [
      r.summary,
      "",
      "STRENGTHS",
      ...r.strengths.map((s) => `- ${s}`),
      "",
      "SUGGESTED BULLETS",
      ...r.suggestedBullets.map((s) => `- ${s}`),
      "",
      r.disclaimer,
    ]
    downloadBlob(`${fitReportFileBase(data)}_resume-draft.txt`, new Blob([lines.join("\n")], { type: "text/plain" }))
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleDownloadPdf} disabled={busy !== null} className={BTN_PRIMARY}>
          {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>

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
            Export as…
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
                {EXPORT_FORMATS.map(({ fmt, label }) => (
                  <button
                    key={fmt}
                    type="button"
                    role="menuitem"
                    onClick={() => handleExport(fmt)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1f2937] hover:bg-[#f4f6fa]"
                  >
                    <FileText className="h-4 w-4 text-[#6b7280]" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button type="button" onClick={handlePrint} disabled={busy !== null} className={BTN}>
          {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Print
        </button>

        <button type="button" onClick={handleSave} className={BTN} title="Save this fit report to revisit later">
          <Save className="h-4 w-4" />
          {saved ? "Saved" : "Save"}
        </button>

        <button type="button" onClick={handleEmail} className={BTN} title="Open your email with a link to this fit">
          <Mail className="h-4 w-4" />
          Email
        </button>

        <button type="button" onClick={handleCopyLink} className={BTN} title="Copy a link to this fit">
          <Link2 className="h-4 w-4" />
          Copy link
        </button>

        <button type="button" onClick={handleWriteResume} className={BTN} title="Draft a role-aligned résumé from your strengths">
          <PenLine className="h-4 w-4" />
          Write Résumé
        </button>
      </div>

      {showResume && (
        <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
              Résumé draft — {data.roleTitle}
            </h2>
            <button type="button" onClick={() => setShowResume(false)} aria-label="Close résumé draft" className="text-[#9ca3af] hover:text-[#374151]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {writeResume.isPending && (
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Loader2 className="h-4 w-4 animate-spin" /> Drafting your résumé…
            </div>
          )}

          {writeResume.isError && (
            <p className="text-sm text-[#b91c1c]">Couldn&apos;t draft a résumé just now — please try again.</p>
          )}

          {writeResume.data && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[#374151]">{writeResume.data.summary}</p>
              {writeResume.data.strengths.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Strengths</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-[#374151]">
                    {writeResume.data.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {writeResume.data.suggestedBullets.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Suggested bullets</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-[#374151]">
                    {writeResume.data.suggestedBullets.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={downloadResume} className={BTN}>
                  <Download className="h-4 w-4" />
                  Download draft
                </button>
              </div>
              <p className="text-xs leading-relaxed text-[#9ca3af]">{writeResume.data.disclaimer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
