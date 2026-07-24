import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"
import { FileText, Loader2, Download, Mail, X, Sparkles, PenLine, Link2, ChevronDown } from "lucide-react"
import { useAuth } from "@/context/useAuth"
import { useCaseload, useCoachHome } from "@/hooks/honor/useCoachData"
import { useGenerateResume, isResumeDisabled } from "@/hooks/honor/useHonorResume"
import {
  useEmailHonorReport,
  useGenerateReportDocument,
  useRecordReportExport,
} from "@/hooks/honor/useHonorReport"
import type { HonorReportFormat } from "@/services/honor/coach.service"
import { USE_HONOR_REPORT_EMAIL } from "@/hooks/honor/mocks"
import { formatReportDate, type HonorReportMeta } from "@/lib/honor/exportHonorReport"
import { copyReportLink, emailReportLink } from "@/lib/honor/shareReportLink"
import type { HonorResume as HonorResumeData } from "@/types/honor"
import {
  HonorCard,
  HonorEmptyState,
  HonorPageHeader,
  HonorPill,
  HonorSectionTitle,
} from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY, fellowName } from "./_format"
import { HONOR_CAREER_AREAS, HONOR_CAREER_AREA_OTHER } from "./_careerAreas"

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

// Feature 3 — extra résumé formats beyond the primary Word/PDF buttons. All
// render clean + unbranded via the same backend path (kind="resume").
const RESUME_EXTRA_FORMATS: ReadonlyArray<{ fmt: HonorReportFormat; label: string }> = [
  { fmt: "txt", label: "Plain text (.txt)" },
  { fmt: "md", label: "Markdown (.md)" },
  { fmt: "html", label: "Web page (.html)" },
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

/**
 * The handoff payload from the Evaluate surface (Feature 2 — rewrite-from-eval).
 * Passed via router state so no ids ride in the URL. Either an `evaluationId`
 * (the server pulls the saved eval's "Suggestions for Improvement") or raw
 * `improvements` prose (when the eval wasn't saved) — the résumé rewrite keys
 * off whichever is present.
 */
type RewriteHandoff = {
  fellowId?: string
  fellowName?: string
  evaluationId?: string
  improvements?: string
}

export default function HonorResume() {
  const location = useLocation()
  const { data: fellows = [] } = useCaseload()
  const { user } = useAuth()
  const { data: coachHome } = useCoachHome()
  const generate = useGenerateResume()
  const generateDoc = useGenerateReportDocument()
  const recordExport = useRecordReportExport()
  const emailMutation = useEmailHonorReport()

  const [fellowId, setFellowId] = useState("")
  const [role, setRole] = useState("")
  const [careerArea, setCareerArea] = useState("")
  const [careerAreaOther, setCareerAreaOther] = useState("")
  const [positionText, setPositionText] = useState("")
  // Feature 2 — the rewrite-from-evaluation context handed off from Evaluate.
  // When set, generation keys off the evaluation's suggestions; "Clear" drops
  // back to plain generation. Retained across re-generates until cleared.
  const [rewriteFrom, setRewriteFrom] = useState<RewriteHandoff | null>(null)

  // Consume the Evaluate handoff once on arrival: pre-select the fellow and arm
  // the rewrite context. Runs when navigation state carries a fellow.
  useEffect(() => {
    const state = location.state as RewriteHandoff | null
    if (state?.fellowId && (state.evaluationId || state.improvements)) {
      setFellowId(state.fellowId)
      setRewriteFrom(state)
    }
    // location.state is a one-shot handoff; only react to identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // The effective career-area hint: the free-typed value when "Other" is picked.
  const effectiveCareerArea =
    careerArea === HONOR_CAREER_AREA_OTHER ? careerAreaOther.trim() : careerArea
  const [resume, setResume] = useState<HonorResumeData | null>(null)
  const [isSample, setIsSample] = useState(false)
  // Résumé generation ships dark behind the server `honor_resume` flag. While
  // off we show an honest "not enabled" state — never a fabricated sample résumé.
  const [genPending, setGenPending] = useState(false)
  const [exporting, setExporting] = useState<null | HonorReportFormat | "email">(null)
  const [showEmail, setShowEmail] = useState(false)
  const [emailTo, setEmailTo] = useState("")
  // Feature 3 — export polish: the extra-formats menu + share-a-link state.
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [sharing, setSharing] = useState<null | "copy" | "email">(null)

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
          careerArea: effectiveCareerArea || undefined,
          positionText: positionText.trim() || undefined,
          // Feature 2 — rewrite keyed off the evaluation, only for the fellow the
          // handoff targeted (guard against a fellow switch clearing intent).
          ...(rewriteFrom && rewriteFrom.fellowId === primary.id
            ? {
                evaluationId: rewriteFrom.evaluationId,
                improvements: rewriteFrom.improvements,
              }
            : {}),
        },
      })
      if (isResumeDisabled(data)) {
        setResume(null)
        setIsSample(false)
        setGenPending(true)
        toast.info("Résumé generation isn't enabled in this environment yet.")
      } else if (data) {
        setResume(data)
        setIsSample(false)
        setGenPending(false)
        if (data.fromEvaluation) {
          toast.success("Résumé rewritten from the evaluation's suggestions.")
        }
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

  /** Build the report/generate body for the CLEAN (unbranded) résumé document. */
  function resumeDocBody(fmt: HonorReportFormat) {
    const meta = buildResumeMeta()
    return {
      kind: "resume" as const,
      format: fmt,
      resume,
      fellowName: meta?.fellowName,
      fellowTitle: meta?.fellowTitle,
      fellowEmail: meta?.fellowEmail,
      coachName: meta?.coachName,
      coachTitle: meta?.coachTitle,
      coachEmail: meta?.coachEmail,
      dateLabel: meta?.dateLabel,
    }
  }

  /**
   * Render + download the résumé as Word or PDF via the backend, which produces
   * a clean, hiring-manager-ready document — no IG/THF cover page, branding, or
   * confidential footer, and proper page margins (no header/footer overlap).
   */
  async function handleExport(fmt: HonorReportFormat) {
    if (!resume || !primary) return
    if (isSample) {
      toast.info("This is a sample layout — enable résumé generation to export.")
      return
    }
    setExporting(fmt)
    try {
      const data = await generateDoc.mutateAsync({ fellowId: primary.id, body: resumeDocBody(fmt) })
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, "_blank", "noopener")
        recordExport.mutate({ fellowId: primary.id, kind: "resume", action: "download" })
        toast.success(`Résumé ${fmt === "docx" ? "Word document" : "PDF"} generated.`)
      } else {
        toast.error("Could not generate the résumé.")
      }
    } catch {
      toast.error(`Could not generate the résumé ${fmt === "docx" ? "Word document" : "PDF"}.`)
    } finally {
      setExporting(null)
    }
  }

  /**
   * Feature 3 — "email a link" / "copy link" for the résumé. Generates the clean
   * PDF to S3 and either copies the presigned link or opens the coach's OWN mail
   * client (mailto:) so they can send it to a hiring manager. No SES / flag / confirm.
   */
  async function handleShareLink(mode: "copy" | "email") {
    if (!resume || !primary) return
    if (isSample) {
      toast.info("This is a sample layout — enable résumé generation to share.")
      return
    }
    setSharing(mode)
    try {
      const data = await generateDoc.mutateAsync({ fellowId: primary.id, body: resumeDocBody("pdf") })
      if (!data?.downloadUrl) {
        toast.error("Could not prepare a shareable link.")
        return
      }
      recordExport.mutate({ fellowId: primary.id, kind: "resume", action: "download" })
      if (mode === "copy") {
        const ok = await copyReportLink(data.downloadUrl)
        toast[ok ? "success" : "error"](
          ok ? "Résumé download link copied." : "Could not copy the link.",
        )
      } else {
        emailReportLink({
          subject: `Résumé — ${fellowName(primary.firstName, primary.lastName)}`,
          intro: `Please find the résumé for ${fellowName(primary.firstName, primary.lastName)} at the link below.`,
          url: data.downloadUrl,
        })
      }
    } catch {
      toast.error("Could not prepare a shareable link.")
    } finally {
      setSharing(null)
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
    setExporting("email")
    try {
      // Generate the clean (unbranded) PDF on the backend, then attach it.
      const gen = await generateDoc.mutateAsync({ fellowId: primary.id, body: resumeDocBody("pdf") })
      if (!gen?.downloadUrl) {
        toast.error("Could not generate the résumé to email.")
        return
      }
      let pdfBase64: string
      try {
        const blob = await (await fetch(gen.downloadUrl)).blob()
        pdfBase64 = await blobToBase64(blob)
      } catch {
        toast.error("Résumé generated, but it couldn't be attached — download the PDF and send it manually.")
        return
      }
      const res = await emailMutation.mutateAsync({
        fellowId: primary.id,
        body: {
          to,
          kind: "resume",
          filename: gen.filename,
          pdfBase64,
          subject: `Résumé — ${fellowName(primary.firstName, primary.lastName)}`,
        },
      })
      if (res?.disabled) {
        toast.info("Email delivery isn't enabled yet. Download the résumé in the meantime.")
      } else if (res?.sent) {
        toast.success(`Résumé emailed to ${to}.`)
        setShowEmail(false)
      } else {
        toast.error("The résumé could not be emailed.")
      }
    } catch {
      toast.error("The résumé could not be emailed.")
    } finally {
      setExporting(null)
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

      {/* Feature 2 — rewrite-from-evaluation banner. Shown when arriving from
          Evaluate with an evaluation's suggestions; "Clear" reverts to plain. */}
      {rewriteFrom && rewriteFrom.fellowId === fellowId && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#cdd8ef] bg-[#eef2fb] px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm text-[#1B2A4A]">
            <PenLine className="h-4 w-4" />
            Rewriting from the evaluation&rsquo;s suggestions
            {rewriteFrom.fellowName ? ` for ${rewriteFrom.fellowName}` : ""}. Generate to apply them.
          </span>
          <button
            type="button"
            onClick={() => setRewriteFrom(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#cdd8ef] bg-white px-2.5 py-1.5 text-xs text-[#1B2A4A] hover:bg-[#f4f6fa]"
          >
            <X className="h-3.5 w-3.5" />
            Clear — write plainly
          </button>
        </div>
      )}

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
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
              <option value={HONOR_CAREER_AREA_OTHER}>Other (specify)…</option>
            </select>
            {careerArea === HONOR_CAREER_AREA_OTHER && (
              <input
                value={careerAreaOther}
                onChange={(e) => setCareerAreaOther(e.target.value)}
                placeholder="Type a career area…"
                className="mt-2 w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
              />
            )}
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
            {generate.isPending
              ? "Writing résumé…"
              : rewriteFrom && rewriteFrom.fellowId === fellowId
                ? "Rewrite résumé from evaluation"
                : "Generate résumé"}
          </button>
        </div>
        {fellows.length === 0 && (
          <HonorEmptyState>No fellows on your caseload yet.</HonorEmptyState>
        )}
      </HonorCard>

      {genPending && !resume && (
        <HonorCard className="mb-6">
          <HonorEmptyState>
            Résumé generation isn’t enabled in this environment yet. Once it’s
            activated, the generated résumé will appear here — no sample is shown.
          </HonorEmptyState>
        </HonorCard>
      )}

      {resume && (
        <>
          {isSample && (
            <div className="mb-4 rounded-lg border border-[#f0d9b8] bg-[#fdf6ec] px-4 py-3 text-sm text-[#8a5a12]">
              <b>Sample layout.</b> Résumé generation is pending activation (safe-translation
              review). This is demo content — not a draft for this fellow.
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport("docx")}
              disabled={!canExport || exporting !== null || isSample}
              className={HONOR_BTN_PRIMARY}
            >
              {exporting === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Download Word (.docx)
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={!canExport || exporting !== null || isSample}
              className={HONOR_BTN_OUTLINE}
            >
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </button>

            {/* Feature 3 — extra formats (txt / md / html), clean + unbranded. */}
            {!isSample && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
                  disabled={!canExport || exporting !== null}
                  className={HONOR_BTN_OUTLINE}
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                >
                  <FileText className="h-4 w-4" />
                  More formats
                  <ChevronDown className="h-4 w-4" />
                </button>
                {exportMenuOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40 cursor-default"
                      aria-hidden
                      tabIndex={-1}
                      onClick={() => setExportMenuOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute left-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-[#dfe4ec] bg-white py-1 shadow-lg"
                    >
                      {RESUME_EXTRA_FORMATS.map(({ fmt, label }) => (
                        <button
                          key={fmt}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setExportMenuOpen(false)
                            void handleExport(fmt)
                          }}
                          disabled={exporting !== null}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#18202f] hover:bg-[#f4f6fa] disabled:opacity-50"
                        >
                          <FileText className="h-4 w-4 text-[#5b6678]" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Feature 3 — email a link / copy link (coach's own mail client). */}
            {!isSample && (
              <>
                <button
                  type="button"
                  onClick={() => handleShareLink("email")}
                  disabled={!canExport || sharing !== null}
                  className={HONOR_BTN_OUTLINE}
                  title="Open your email with a secure download link to send"
                >
                  {sharing === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Email a link
                </button>
                <button
                  type="button"
                  onClick={() => handleShareLink("copy")}
                  disabled={!canExport || sharing !== null}
                  className={HONOR_BTN_OUTLINE}
                  title="Copy a secure download link to the clipboard"
                >
                  {sharing === "copy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  Copy link
                </button>
              </>
            )}
            {USE_HONOR_REPORT_EMAIL && !isSample && (
              <button type="button" onClick={openEmail} disabled={!canExport || exporting !== null} className={HONOR_BTN_OUTLINE}>
                {exporting === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
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
