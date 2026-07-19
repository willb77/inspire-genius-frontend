import { useState } from "react"
import { toast } from "sonner"
import { FileText, Loader2, Download, Printer, Mail, X, Sparkles } from "lucide-react"
import { useAuth } from "@/context/useAuth"
import { useCaseload, useCoachHome } from "@/hooks/honor/useCoachData"
import { useGenerateResume, isResumeDisabled } from "@/hooks/honor/useHonorResume"
import { useEmailHonorReport, useRecordReportExport } from "@/hooks/honor/useHonorReport"
import { USE_HONOR_REPORT_EMAIL, MOCK_RESUME } from "@/hooks/honor/mocks"
import { downloadBlob } from "@/lib/exportTranscript"
import { formatReportDate, type HonorReportMeta } from "@/lib/honor/exportHonorReport"
import { renderHonorResumePdf } from "@/lib/honor/exportHonorResume"
import type { HonorResume as HonorResumeData } from "@/types/honor"
import {
  HonorCard,
  HonorEmptyState,
  HonorPageHeader,
  HonorPill,
  HonorSectionTitle,
} from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY, fellowName } from "./_format"

/**
 * Honor Coach Workbench — Résumé Writer (Phase 5).
 *
 * Generates a private-sector résumé for a Fellow via the deterministic-structure /
 * generative-content route (POST /v1/agents/honor/coach/students/{id}/resume).
 * The draft is written from the Fellow's own profile + résumé/bio, framed by the
 * THF safe-translation rules; the UI renders + brands it and can Download / Print /
 * Email (kind="resume", reusing the Phase-4 export path). Live generation ships
 * DARK behind the server `honor_resume` flag — while off, the surface renders a
 * clearly-labeled sample so the layout + branded PDF stay demoable.
 */

const HONOR_CAREER_AREAS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "operations_program_management", label: "Operations & Program Management" },
  { key: "security_risk_management", label: "Security & Risk Management" },
  { key: "consulting_advisory", label: "Consulting & Advisory" },
  { key: "sales_business_development", label: "Sales & Business Development" },
  { key: "people_leadership", label: "People Leadership" },
  { key: "analysis_intelligence", label: "Analysis & Intelligence" },
]

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => {
      const s = String(r.result)
      resolve(s.slice(s.indexOf(",") + 1))
    }
    r.onerror = () => reject(new Error("Could not read the PDF."))
    r.readAsDataURL(blob)
  })
}

function printBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
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

export default function HonorResume() {
  const { data: fellows = [] } = useCaseload()
  const { user } = useAuth()
  const { data: coachHome } = useCoachHome()
  const generate = useGenerateResume()
  const recordExport = useRecordReportExport()
  const emailMutation = useEmailHonorReport()

  const [fellowId, setFellowId] = useState("")
  const [role, setRole] = useState("")
  const [careerArea, setCareerArea] = useState("")
  const [positionText, setPositionText] = useState("")
  const [resume, setResume] = useState<HonorResumeData | null>(null)
  const [isSample, setIsSample] = useState(false)
  const [exporting, setExporting] = useState<null | "download" | "print">(null)
  const [showEmail, setShowEmail] = useState(false)
  const [emailTo, setEmailTo] = useState("")

  const primary = fellows.find((f) => f.id === fellowId)

  async function runGenerate() {
    if (!primary) {
      toast.warning("Select a fellow first.")
      return
    }
    try {
      const data = await generate.mutateAsync({
        fellowId: primary.id,
        body: {
          role: role.trim() || undefined,
          careerArea: careerArea || undefined,
          positionText: positionText.trim() || undefined,
        },
      })
      if (isResumeDisabled(data)) {
        setResume({ ...MOCK_RESUME, fellow_id: primary.id })
        setIsSample(true)
        toast.info("Résumé generation is pending activation — showing a sample layout.")
      } else if (data) {
        setResume(data)
        setIsSample(false)
      } else {
        toast.error("No résumé was returned.")
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      toast.error(
        status === 409
          ? "This fellow has no profile yet — invite them before writing a résumé."
          : "Résumé generation failed. Please try again.",
      )
    }
  }

  function buildResumeMeta(): HonorReportMeta | null {
    if (!primary) return null
    return {
      fellowName: fellowName(primary.firstName, primary.lastName),
      fellowTitle: resume?.target || primary.target || primary.background || "",
      fellowEmail: primary.email || "",
      coachName: user?.fullName || user?.name || coachHome?.coachName || "Coach",
      coachTitle: coachHome?.coachTitle || "",
      coachEmail: user?.email || "",
      dateLabel: formatReportDate(new Date()),
    }
  }

  async function renderPdf() {
    const meta = buildResumeMeta()
    if (!resume || !meta) return null
    return renderHonorResumePdf(resume, meta)
  }

  async function handleDownload() {
    if (!resume || !primary) return
    setExporting("download")
    try {
      const out = await renderPdf()
      if (!out) return
      downloadBlob(out.fileName, out.blob)
      if (!isSample) recordExport.mutate({ fellowId: primary.id, kind: "resume", action: "download" })
      toast.success("Résumé PDF downloaded.")
    } catch {
      toast.error("Could not generate the PDF.")
    } finally {
      setExporting(null)
    }
  }

  async function handlePrint() {
    if (!resume || !primary) return
    setExporting("print")
    try {
      const out = await renderPdf()
      if (!out) return
      printBlob(out.blob)
      if (!isSample) recordExport.mutate({ fellowId: primary.id, kind: "resume", action: "print" })
    } catch {
      toast.error("Could not prepare the résumé for printing.")
    } finally {
      setExporting(null)
    }
  }

  function openEmail() {
    if (!primary) return
    setEmailTo(primary.email || "")
    setShowEmail(true)
  }

  async function confirmEmail() {
    if (!resume || !primary) return
    const to = emailTo.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      toast.warning("Enter a valid recipient email.")
      return
    }
    try {
      const out = await renderPdf()
      if (!out) return
      const pdfBase64 = await blobToBase64(out.blob)
      const res = await emailMutation.mutateAsync({
        fellowId: primary.id,
        body: {
          to,
          kind: "resume",
          filename: out.fileName,
          pdfBase64,
          subject: `Résumé — ${fellowName(primary.firstName, primary.lastName)}`,
        },
      })
      if (res?.disabled) {
        toast.info("Email delivery isn't enabled yet. Download or print the résumé in the meantime.")
      } else if (res?.sent) {
        toast.success(`Résumé emailed to ${to}.`)
        setShowEmail(false)
      } else {
        toast.error("The résumé could not be emailed.")
      }
    } catch {
      toast.error("The résumé could not be emailed.")
    }
  }

  const canExport = !!resume && !!primary

  return (
    <div>
      <HonorPageHeader
        icon={FileText}
        title="Résumé Writer"
        description="Generate a private-sector résumé from the Fellow's profile and documents, safely translated from their service. Review before use."
      />

      <HonorCard className="mb-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Fellow</span>
            <select
              value={fellowId}
              onChange={(e) => setFellowId(e.target.value)}
              className="w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
            >
              <option value="">Select a fellow…</option>
              {fellows.map((f) => (
                <option key={f.id} value={f.id}>
                  {fellowName(f.firstName, f.lastName)} — {f.target}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-[#374151]">
              Target role <span className="text-[#9299a6]">(optional)</span>
            </span>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Program Manager"
              className="w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-[#374151]">
              Career area <span className="text-[#9299a6]">(optional)</span>
            </span>
            <select
              value={careerArea}
              onChange={(e) => setCareerArea(e.target.value)}
              className="w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
            >
              <option value="">Any / infer from profile</option>
              {HONOR_CAREER_AREAS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-[#374151]">
              Target position description <span className="text-[#9299a6]">(optional)</span>
            </span>
            <textarea
              value={positionText}
              onChange={(e) => setPositionText(e.target.value)}
              placeholder="Paste a job description to tailor the résumé…"
              className="min-h-[42px] w-full resize-y rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
            />
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={runGenerate}
            disabled={!primary || generate.isPending}
            className={HONOR_BTN_PRIMARY}
          >
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generate.isPending ? "Writing résumé…" : "Generate résumé"}
          </button>
        </div>
        {fellows.length === 0 && (
          <HonorEmptyState>No fellows on your caseload yet.</HonorEmptyState>
        )}
      </HonorCard>

      {resume && (
        <>
          {isSample && (
            <div className="mb-4 rounded-lg border border-[#f0d9b8] bg-[#fdf6ec] px-4 py-3 text-sm text-[#8a5a12]">
              <b>Sample layout.</b> Résumé generation is pending activation (safe-translation
              review). This is demo content — not a draft for this fellow.
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleDownload} disabled={!canExport || exporting !== null} className={HONOR_BTN_PRIMARY}>
              {exporting === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </button>
            <button type="button" onClick={handlePrint} disabled={!canExport || exporting !== null} className={HONOR_BTN_OUTLINE}>
              {exporting === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Print
            </button>
            {USE_HONOR_REPORT_EMAIL && !isSample && (
              <button type="button" onClick={openEmail} disabled={!canExport} className={HONOR_BTN_OUTLINE}>
                <Mail className="h-4 w-4" />
                Email to fellow
              </button>
            )}
            <span className="ml-auto text-xs text-[#9299a6]">
              Coach must review before use · Confidential.
            </span>
          </div>

          <ResumeView resume={resume} />
        </>
      )}

      {showEmail && primary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#18202f]">Email résumé</h3>
              <button type="button" onClick={() => setShowEmail(false)} className="text-[#9299a6] hover:text-[#18202f]" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-sm text-[#5b6678]">
              Sends the branded résumé PDF for{" "}
              <span className="font-medium text-[#18202f]">{fellowName(primary.firstName, primary.lastName)}</span>. Review it first.
            </p>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-[#374151]">Recipient</span>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="fellow@email.com"
                className="w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowEmail(false)} className={HONOR_BTN_OUTLINE}>
                Cancel
              </button>
              <button type="button" onClick={confirmEmail} disabled={emailMutation.isPending} className={HONOR_BTN_PRIMARY}>
                {emailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResumeView({ resume }: { resume: HonorResumeData }) {
  return (
    <div className="space-y-6">
      <HonorCard>
        <div className="text-xl font-bold text-[#18202f]">{resume.headline || "Résumé"}</div>
        <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-[#E8792B]">
          Target — {resume.target}
        </div>
        {resume.summary && <p className="mt-3 text-sm text-[#18202f]">{resume.summary}</p>}
        {resume.competencies.length > 0 && (
          <div className="mt-4">
            <HonorSectionTitle>Core Competencies</HonorSectionTitle>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {resume.competencies.map((c) => (
                <HonorPill key={c} tone="navy">
                  {c}
                </HonorPill>
              ))}
            </div>
          </div>
        )}
      </HonorCard>

      {resume.experience.length > 0 && (
        <HonorCard>
          <HonorSectionTitle>Experience</HonorSectionTitle>
          <div className="mt-2 space-y-4">
            {resume.experience.map((e, i) => (
              <div key={`${e.title}-${i}`} className="rounded-lg border border-[#f1f3f7] p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-[#18202f]">{e.title}</span>
                  <span className="text-xs text-[#9299a6]">{e.dates}</span>
                </div>
                <div className="text-sm font-medium text-[#b4532a]">{e.organization}</div>
                {e.bullets.length > 0 && (
                  <ul className="mt-1.5 list-disc pl-5 text-sm text-[#374151]">
                    {e.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </HonorCard>
      )}

      {(resume.education.length > 0 || resume.certifications.length > 0) && (
        <HonorCard>
          <div className="grid gap-4 sm:grid-cols-2">
            {resume.education.length > 0 && (
              <div>
                <HonorSectionTitle>Education</HonorSectionTitle>
                <ul className="mt-2 list-disc pl-5 text-sm text-[#374151]">
                  {resume.education.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {resume.certifications.length > 0 && (
              <div>
                <HonorSectionTitle>Certifications</HonorSectionTitle>
                <ul className="mt-2 list-disc pl-5 text-sm text-[#374151]">
                  {resume.certifications.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </HonorCard>
      )}

      <p className="text-xs text-[#9299a6]">
        {resume.sources.length > 0 && <>Grounded in: {resume.sources.join(" · ")}. </>}
        {resume.disclaimer}
      </p>
    </div>
  )
}
