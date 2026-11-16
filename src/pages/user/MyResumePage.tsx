/**
 * Résumé Writer — the person's OWN résumé, under My Workspace (2026-10-19).
 *
 * Request: "add Résumé Writer to every user's menu but give it a UI that
 * matches the platform under My Workspace". Résumé Writer CSA, option 1.
 *
 * Not the Honor coach tool (/vertical/honor/resume), which drafts for a Fellow
 * and keeps its own look. This page drafts for whoever is signed in, from their
 * own résumé/bio and assessments, through `/v1/agents/resume-writer/me` — the
 * server takes the subject from the token, so nothing here names anyone.
 *
 * Three honest states the page must never blur into "here is a draft":
 *   - the server switch is off           → said so, Generate disabled
 *   - today's limit is used up           → said so, Generate disabled
 *   - nothing on file to ground a draft  → asks for a résumé or bio first
 *
 * RW2 (2026-10-24): opened as `/my/resume?jobId=<id>` — Career Fit's "Write
 * résumé" while the server's `resume_writer_tailored` switch is on — the draft
 * is built on the person's whole current résumé and aimed at that role. The
 * server names the role only if its org-scoped read finds it; what its
 * fabrication check took out is always listed here, never dropped silently.
 * Switch off, the page is today's whatever the URL says.
 *
 * RWO-2 (CSA docs/analysis/2026-11-03-rwo-2-resume-writer-page-and-ats-export-csa.md,
 * Bill's "RWO-2 go", Lane 814, 2026-11-03 23:37 EDT): while the server's
 * `resume_writer_options` switch is on (`optionsEnabled`), the page offers the
 * formats and bullet styles, shows what the checks removed on EVERY draft, a
 * contact block for the file, the Mini card, and writes Word / PDF / Copy from
 * one ATS-safe document — a text PDF on US Letter, with no AI disclaimer,
 * "Drafted from", "Target —" line or platform footer in the file (D3, Q1-Q3).
 * Switch off — including on any tier whose engine predates RWO-1 — every piece
 * of this page, the request body and all three exports are today's, by keeping
 * today's code path rather than by care: a frontend merge deploys to dev AND
 * stable at once, so the off path is what stable users get until the switch.
 *
 * RW2 follow-up (Bill, typed in Coord2 2026-10-24 23:13 EDT): with no role
 * chosen, the page offers the role the person set as their goal target, when
 * the server names one (`goalTarget`, resolved through the same org-scoped
 * read). Taking it only sets `?jobId=`; the server resolves the role again. Career
 * Fit now always links here, so with the switch off the page says it cannot aim
 * at that role rather than dropping it silently.
 *
 * RWO-8 (CSA docs/analysis/2026-11-04-rwo-8-resume-writer-guided-flow-and-assistant-csa.md,
 * option 1 and §7): when the server sends `guidedEnabled` (`resume_writer_guided`
 * ON) together with its formats, the page is the guided flow instead —
 * `GuidedResumeWriter`, with the résumé interview and the assistant. Without it,
 * everything below is today's page, request bodies and exports included.
 */
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Copy, Download, FileText, FileUp, Loader2, ScrollText, Sparkles, Target } from "lucide-react"
import { toast } from "sonner"
import UserLayout from "@/layouts/UserLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  AddPersonalDocModal,
  type AddPersonalDocTarget,
} from "@/components/dashboard/v2/AddPersonalDocModal"
import { useAuth } from "@/context/useAuth"
import { useGenerateResume, useResumeWriterSources } from "@/hooks/useResumeWriter"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { downloadBlob } from "@/lib/exportTranscript"
import { resumeToPlainText } from "@/lib/resume/buildResumeHtml"
import { renderResumePdf } from "@/lib/resume/exportResume"
import { renderResumeDocx } from "@/lib/resume/exportResumeDocx"
import { cn } from "@/lib/utils"
import { ResumeContactFields } from "@/components/resume/ResumeContactFields"
import { ResumeCrosswalk, ResumeDocumentView, ResumeTalkingPoints } from "@/components/resume/ResumeDocumentView"
import { ResumeFormatPanel, type FormatChoice } from "@/components/resume/ResumeFormatPanel"
import { ResumeMiniCardPanel } from "@/components/resume/ResumeMiniCardPanel"
import { GuidedResumeWriter } from "@/components/resume/guided/GuidedResumeWriter"
import { atsPdfPageCount, renderAtsResume } from "@/lib/resume/exportResumeAts"
import {
  buildResumeDocument,
  DEFAULT_SECTIONS,
  documentToPlainText,
  type ResumeContact,
} from "@/lib/resume/resumeDocument"
import { isResumeWriterDisabled, type GeneratedResume, type RemovedLine } from "@/types/resumeWriter"
import { useTranslation } from "react-i18next"

const RESUME_UPLOAD: AddPersonalDocTarget = { name: "Résumé", docKind: "resume" }
const BIO_UPLOAD: AddPersonalDocTarget = { name: "Bio", docKind: "bio" }

function SourceChip({ on, label }: { on: boolean; label: string }) {
  const { t } = useTranslation("userPages")
  return (
    <Badge
      variant={on ? "default" : "outline"}
      className={cn(!on && "text-muted-foreground")}
      data-testid={`source-${label.toLowerCase()}`}
    >
      {t("myResumePage.sourceChip", { defaultValue: "{{label}}: {{state}}", label, state: on ? t("myResumePage.onFile", "on file") : t("myResumePage.notOnFile", "not on file") })}
    </Badge>
  )
}

// Resolved at render (hooks cannot run at module level): the key is stored, t() is called where it is shown.
const REMOVED_REASON: Record<string, { key: string; text: string }> = {
  employer: { key: "myResumePage.removedReason.employer", text: "Employer not in anything you've given us" },
  title: { key: "myResumePage.removedReason.title", text: "Job title not in anything you've given us" },
  dates: { key: "myResumePage.removedReason.dates", text: "Dates not in anything you've given us" },
  education: { key: "myResumePage.removedReason.education", text: "Education not in anything you've given us" },
  certification: { key: "myResumePage.removedReason.certification", text: "Certification not in anything you've given us" },
  number: { key: "myResumePage.removedReason.number", text: "A number that isn't in anything you've given us" },
  activity: { key: "myResumePage.removedReason.activity", text: "A claim nothing you've given us backs up" },
  training: { key: "myResumePage.removedReason.training", text: "Training not in anything you've given us" },
  assessment: { key: "myResumePage.removedReason.assessment", text: "Assessment wording — kept off your résumé" },
}

/** RW2 — what the check took out, and what the role asks for that the résumé doesn't show. */
function TailoredNotes({ resume }: { resume: GeneratedResume }) {
  const { t } = useTranslation("userPages")
  const removed: RemovedLine[] = resume.removed ?? []
  const notEvidenced = resume.notEvidenced ?? []
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm" data-testid="resume-tailored-notes">
      {removed.length ? (
        <section data-testid="resume-removed">
          <h3 className="mb-1 font-semibold">{t("myResumePage.takenOutHeading", { defaultValue: "Taken out — not in anything you've given us ({{total}})", total: removed.length })}</h3>
          <p className="mb-1 text-xs text-muted-foreground">
            {t("myResumePage.theDraftOnlyKeepsWhatYour", "The draft only keeps what your résumé shows. If one of these is true, add it to your résumé and draft again.")}
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {removed.map((r, i) => (
              <li key={`${r.reason}-${i}`}>
                <span className="text-muted-foreground">{REMOVED_REASON[r.reason] ? t(REMOVED_REASON[r.reason].key, REMOVED_REASON[r.reason].text) : t("myResumePage.notInAnythingYouveGivenUs", "Not in anything you've given us")}:</span>{" "}
                {r.text}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p data-testid="resume-removed-none" className="text-xs text-muted-foreground">
          {t("myResumePage.nothingWasTakenOutEveryLine", "Nothing was taken out: every line was found in your résumé.")}
        </p>
      )}
      {notEvidenced.length ? (
        <section data-testid="resume-not-evidenced">
          <h3 className="mb-1 font-semibold">{t("myResumePage.thisRoleAlsoAsksFor", "This role also asks for")}</h3>
          <p className="mb-1 text-xs text-muted-foreground">
            {t("myResumePage.yourResumeDoesntShowTheseYet", "Your résumé doesn't show these yet, so the draft doesn't claim them.")}
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {notEvidenced.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function ResumeView({ resume, name }: { resume: GeneratedResume; name: string }) {
  const { t } = useTranslation("userPages")
  return (
    <div className="space-y-4" data-testid="resume-draft">
      <div>
        <h2 className="text-xl font-semibold">{name}</h2>
        {resume.headline ? <p className="text-sm font-medium text-teal-700">{resume.headline}</p> : null}
        {resume.target ? (
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{t("myResumePage.targetLine", { defaultValue: "Target — {{target}}", target: resume.target })}</p>
        ) : null}
      </div>
      {resume.summary ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold">{t("myResumePage.professionalSummary", "Professional summary")}</h3>
          <p className="text-sm leading-relaxed">{resume.summary}</p>
        </section>
      ) : null}
      {resume.competencies.length ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold">{t("myResumePage.coreCompetencies", "Core competencies")}</h3>
          <div className="flex flex-wrap gap-1.5">
            {resume.competencies.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}
      {resume.experience.length ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold">{t("myResumePage.experience", "Experience")}</h3>
          <div className="space-y-3">
            {resume.experience.map((e, i) => (
              <div key={`${e.title}-${i}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{e.title}</span>
                  <span className="text-xs text-muted-foreground">{e.dates}</span>
                </div>
                {e.organization ? <div className="text-xs text-teal-700">{e.organization}</div> : null}
                {e.bullets.length ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                    {e.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {[
        [t("myResumePage.education", "Education"), resume.education],
        [t("myResumePage.certifications", "Certifications"), resume.certifications],
      ].map(([title, items]) =>
        (items as string[]).length ? (
          <section key={title as string}>
            <h3 className="mb-1 text-sm font-semibold">{title as string}</h3>
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {(items as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
      <p className="border-t pt-2 text-xs text-muted-foreground">
        {resume.sources.length ? t("myResumePage.draftedFrom", { defaultValue: "Drafted from: {{list}}. ", list: resume.sources.join(" · ") }) : ""}
        {resume.disclaimer}
      </p>
    </div>
  )
}

export default function MyResumePage() {
  const { t } = useTranslation("userPages")
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const jobId = params.get("jobId") || undefined
  const sources = useResumeWriterSources(jobId)
  const generate = useGenerateResume()
  const [role, setRole] = useState("")
  const [careerArea, setCareerArea] = useState("")
  const [positionText, setPositionText] = useState("")
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [uploadTarget, setUploadTarget] = useState<AddPersonalDocTarget | null>(null)
  const [exporting, setExporting] = useState(false)
  // RWO-2 — used only while the server's options switch is on.
  const [format, setFormat] = useState<FormatChoice>({ optionId: "", styleId: "", disclosure: "", federalDetails: "" })
  // The target the person aimed the draft at, for the file name. Not the draft's
  // `target`: with no role named, the server labels it "the person's next role",
  // which is not a job title (seen on dev, 2026-11-04).
  const [aimedAt, setAimedAt] = useState("")
  const [contact, setContact] = useState<ResumeContact>(() => ({
    name: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: "",
    location: "",
    link: "",
  }))

  const name = user?.fullName || t("myResumePage.myResume", "My résumé")
  const data = sources.data
  const result = generate.data
  const draft = result && !isResumeWriterDisabled(result) ? result : null
  const switchedOff = data?.enabled === false || isResumeWriterDisabled(result)
  const used = draft?.usedToday ?? data?.usedToday ?? 0
  const limit = draft?.dailyLimit ?? data?.dailyLimit ?? 0
  const left = Math.max(0, limit - used)
  const limitReached = !!data && limit > 0 && used >= limit
  const hasText = !!data && (data.sources.resume || data.sources.bio)
  const hasAnything = hasText || (data?.sources.assessments.length ?? 0) > 0 || documentIds.length > 0
  // RW2: a role is aimed at only when the server named it (switch on, role visible).
  const tailoredRole = data?.tailoredEnabled && data.targetRole ? data.targetRole : null
  const roleUnavailable = !!jobId && !!data?.tailoredEnabled && data.targetRoleStatus === "not_found"
  // Career Fit links here with ?jobId= whatever the switch says; off, say so.
  const roleIgnored = !!jobId && !!data && !data.tailoredEnabled
  // RW2 follow-up: no role chosen → offer the goal target the server named.
  const goalTarget = !jobId && data?.tailoredEnabled && data.goalTarget ? data.goalTarget : null
  const hasResume = !!data && (data.sources.resume || documentIds.length > 0)
  const canGenerate =
    !!data && !switchedOff && !limitReached && (tailoredRole ? hasResume : hasAnything) && !generate.isPending
  // RWO-2: the switch. Absent (switch off, or an engine that predates RWO-1) → today's page.
  const optionOffers = data?.optionsEnabled ? data.options ?? [] : []
  const optionsOn = optionOffers.length > 0
  const styleOffers = data?.bulletStyles ?? []
  const optionId = format.optionId || data?.defaultOption || optionOffers[0]?.id || ""
  const styleId = format.styleId || data?.defaultBulletStyle || styleOffers[0]?.id || ""
  const chosenOption = optionOffers.find((o) => o.id === optionId)
  const draftOffer = optionOffers.find((o) => o.id === draft?.option)
  const draftSections = draftOffer?.sections ?? DEFAULT_SECTIONS
  // RWO-3: Federal's layout and page limit come from the server's description of the format.
  const doc = optionsOn && draft
    ? buildResumeDocument(draft, contact, draftSections, draftOffer?.takesFederalDetails ? "federal" : "standard")
    : null
  const pageLimit = draftOffer?.pageLimit
  const [pages, setPages] = useState<number | null>(null)
  const docKey = doc && pageLimit ? JSON.stringify(doc) : ""
  useEffect(() => {
    // RWO-3: count the text PDF's pages for a format with a page limit (Federal: 2).
    if (!docKey || !doc) {
      setPages(null)
      return
    }
    let live = true
    void atsPdfPageCount(doc)
      .then((n) => {
        if (live) setPages(n)
      })
      .catch(() => {
        if (live) setPages(null)
      })
    return () => {
      live = false
    }
    // docKey stands for the document's content; `doc` is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey])
  const fileTarget = draft ? draft.targetRole?.title || aimedAt || null : null

  const toggleDoc = (id: string, on: boolean) =>
    setDocumentIds((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))

  const pickGoalTarget = (target: { jobId: string }) => {
    const next = new URLSearchParams(params)
    next.set("jobId", target.jobId)
    setParams(next, { replace: true })
  }

  const clearRole = () => {
    const next = new URLSearchParams(params)
    next.delete("jobId")
    setParams(next, { replace: true })
  }

  /** RWO-2: the format fields, only while the switch is on — off, the body is today's. */
  const withFormat = <T extends object>(body: T): T => {
    if (!optionsOn || !optionId) return body
    const disclosure = chosenOption?.takesDisclosure ? format.disclosure.trim() : ""
    const federalDetails = chosenOption?.takesFederalDetails ? format.federalDetails.trim() : ""
    return {
      ...body,
      option: optionId,
      bulletStyle: styleId || undefined,
      ...(disclosure ? { disclosure } : {}),
      ...(federalDetails ? { federalDetails } : {}),
    }
  }

  const onGenerate = () => {
    setAimedAt(tailoredRole ? tailoredRole.title : role.trim() || careerArea.trim())
    if (tailoredRole) {
      generate.mutate(
        withFormat({ jobId: tailoredRole.jobId, documentIds: documentIds.length ? documentIds : undefined }),
      )
      return
    }
    generate.mutate(
      withFormat({
        role: role.trim() || undefined,
        careerArea: careerArea.trim() || undefined,
        positionText: positionText.trim() || undefined,
        documentIds: documentIds.length ? documentIds : undefined,
      }),
    )
  }

  const onCopy = async () => {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(doc ? documentToPlainText(doc) : resumeToPlainText(draft, name))
      toast.success(t("myResumePage.resumeCopied", "Résumé copied."))
    } catch {
      toast.error(t("myResumePage.couldntCopySelectTheTextAnd", "Couldn't copy. Select the text and copy it instead."))
    }
  }

  const onDownload = async () => {
    if (!draft) return
    setExporting(true)
    try {
      const { fileName, blob } = doc
        ? await renderAtsResume(doc, "pdf", fileTarget)
        : await renderResumePdf(draft, name)
      downloadBlob(fileName, blob)
    } catch {
      toast.error(t("myResumePage.couldntBuildThePdfTryAgain", "Couldn't build the PDF. Try again, or use Copy."))
    } finally {
      setExporting(false)
    }
  }

  const onDownloadWord = async () => {
    if (!draft) return
    setExporting(true)
    try {
      const { fileName, blob } = doc
        ? await renderAtsResume(doc, "docx", fileTarget)
        : await renderResumeDocx(draft, name)
      downloadBlob(fileName, blob)
    } catch {
      toast.error(t("myResumePage.couldntBuildTheWordFileTry", "Couldn't build the Word file. Try again, or use Copy."))
    } finally {
      setExporting(false)
    }
  }

  // RWO8-F1: until the server has said which page this person gets, show
  // neither — the old page used to render and then swap to the guided one.
  if (sources.isLoading && !data) {
    return (
      <UserLayout>
        <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
          <p role="status" className="text-sm text-muted-foreground" data-testid="resume-writer-loading">
            {t("myResumePage.loadingTheResumeWriter", "Loading the Résumé Writer…")}
          </p>
        </div>
      </UserLayout>
    )
  }

  // RWO-8: the guided flow, only on the server's word and only with its formats.
  if (data?.guidedEnabled && optionsOn) {
    return (
      <UserLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
          <header className="flex items-start gap-3">
            <ScrollText className="mt-1 h-6 w-6 text-teal-700" aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-semibold">{t("myResumePage.resumeWriter", "Résumé Writer")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("myResumePage.aFewShortStepsWhatIts", "A few short steps: what it's for, your information, the job — then review it with the assistant.")}
              </p>
            </div>
          </header>
          {sources.isError ? (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {apiErrorMessage(sources.error, t("myResumePage.couldntLoadOnFile", "Couldn't load what you have on file. Try again in a moment."))}
            </div>
          ) : null}
          <GuidedResumeWriter
            data={data}
            jobId={jobId}
            onPickRole={pickGoalTarget}
            onClearRole={clearRole}
            onUpload={(kind) => setUploadTarget(kind === "resume" ? RESUME_UPLOAD : BIO_UPLOAD)}
          />
        </div>
        <AddPersonalDocModal
          target={uploadTarget}
          onOpenChange={(open) => {
            if (!open) setUploadTarget(null)
          }}
          onUploaded={() => {
            void sources.refetch()
          }}
        />
      </UserLayout>
    )
  }

  return (
    <UserLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
        <header className="flex items-start gap-3">
          <ScrollText className="mt-1 h-6 w-6 text-teal-700" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">{t("myResumePage.resumeWriter", "Résumé Writer")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("myResumePage.draftYourResumeFromTheResume", "Draft your résumé from the résumé, bio and assessments you have on file, aimed at the role you want.")}
            </p>
          </div>
        </header>

        {sources.isError ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {apiErrorMessage(sources.error, t("myResumePage.couldntLoadOnFile", "Couldn't load what you have on file. Try again in a moment."))}
          </div>
        ) : null}

        {switchedOff ? (
          <div
            role="status"
            data-testid="resume-writer-off"
            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            {t("myResumePage.resumeWriterIsTurnedOffRight", "Résumé Writer is turned off right now. Your documents are still on file; try again later.")}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("myResumePage.whatsOnFile", "What's on file")}</CardTitle>
                <CardDescription>{t("myResumePage.yourDraftIsWrittenOnlyFrom", "Your draft is written only from these. Nothing is invented.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sources.isLoading ? (
                  <p className="text-sm text-muted-foreground">{t("myResumePage.loading", "Loading…")}</p>
                ) : data ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <SourceChip on={data.sources.resume} label={t("myResumePage.resume", "Résumé")} />
                      <SourceChip on={data.sources.bio} label={t("myResumePage.bio", "Bio")} />
                      <SourceChip on={data.sources.assessments.length > 0} label={t("myResumePage.assessments", "Assessments")} />
                    </div>
                    {data.sources.assessments.length ? (
                      <p className="text-xs text-muted-foreground">
                        {t("myResumePage.assessmentsList", { defaultValue: "Assessments: {{list}}", list: data.sources.assessments.join(", ") })}
                      </p>
                    ) : null}
                    {!hasText ? (
                      <div data-testid="resume-no-source" className="rounded-md border border-dashed p-3 text-sm">
                        <p className="font-medium">{t("myResumePage.addYourResumeOrBioFirst", "Add your résumé or bio first")}</p>
                        <p className="mt-1 text-muted-foreground">
                          {t("myResumePage.withNeitherOnFileADraft", "With neither on file, a draft would rest on your assessments alone and could not list your experience.")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setUploadTarget(RESUME_UPLOAD)}>
                            <FileUp className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            {t("myResumePage.addYourResume", "Add your résumé")}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setUploadTarget(BIO_UPLOAD)}>
                            {t("myResumePage.addABio", "Add a bio")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {data.documents.length ? (
                      <fieldset className="space-y-2">
                        <legend className="text-xs font-medium text-muted-foreground">
                          {t("myResumePage.alsoUseTheseDocumentsOptional", "Also use these documents (optional)")}
                        </legend>
                        {data.documents.map((d) => (
                          <div key={d.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`doc-${d.id}`}
                              checked={documentIds.includes(d.id)}
                              onCheckedChange={(v) => toggleDoc(d.id, v === true)}
                            />
                            <Label htmlFor={`doc-${d.id}`} className="text-sm font-normal">
                              {d.filename}
                            </Label>
                          </div>
                        ))}
                      </fieldset>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>

            {optionsOn && data ? (
              <Card data-testid="resume-format-card">
                <CardHeader>
                  <CardTitle className="text-base">{t("myResumePage.format", "Format")}</CardTitle>
                  <CardDescription>{t("myResumePage.howTheResumeIsLaidOut", "How the résumé is laid out. Pick the one that fits what it's for.")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResumeFormatPanel
                    options={optionOffers}
                    styles={styleOffers}
                    value={{ optionId, styleId, disclosure: format.disclosure, federalDetails: format.federalDetails }}
                    onChange={setFormat}
                    defaultOption={data.defaultOption || optionOffers[0].id}
                    onFile={{
                      resume: data.sources.resume,
                      bio: data.sources.bio,
                      assessments: data.sources.assessments.length > 0,
                    }}
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("myResumePage.target", "Target")}</CardTitle>
                <CardDescription>
                  {tailoredRole
                    ? t("myResumePage.builtOnYourCurrentResumeAnd", "Built on your current résumé and aimed at this role.")
                    : t("myResumePage.optionalTarget", "Optional. Without one, the draft follows your own background.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roleUnavailable ? (
                  <p role="status" data-testid="resume-role-unavailable" className="text-xs text-amber-700">
                    {t("myResumePage.thatRoleIsntAvailableToYou", "That role isn't available to you, so this draft follows the target you type below.")}
                  </p>
                ) : null}
                {roleIgnored ? (
                  <p role="status" data-testid="resume-role-ignored" className="text-xs text-amber-700">
                    {t("myResumePage.aimingTheDraftAtACareer", "Aiming the draft at a Career Fit role isn't on right now — name the role below.")}
                  </p>
                ) : null}
                {goalTarget ? (
                  <div data-testid="resume-goal-target" className="space-y-2 rounded-md border border-dashed border-teal-300 p-3">
                    <p className="text-xs text-muted-foreground">{t("myResumePage.youSetThisRoleAsYour", "You set this role as your goal target.")}</p>
                    <Button size="sm" variant="outline" onClick={() => pickGoalTarget(goalTarget)}>
                      <Target className="mr-1.5 h-4 w-4 text-teal-700" aria-hidden="true" />
                      {t("myResumePage.tailorToGoalTarget", { defaultValue: "Tailor to your goal target: {{title}}", title: goalTarget.title })}
                    </Button>
                  </div>
                ) : null}
                {tailoredRole ? (
                  <div data-testid="resume-tailored-role" className="space-y-2 rounded-md border border-teal-200 bg-teal-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Target className="h-4 w-4 text-teal-700" aria-hidden="true" />
                      {tailoredRole.title}
                      {tailoredRole.department ? (
                        <span className="text-xs font-normal text-muted-foreground">· {tailoredRole.department}</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("myResumePage.everyRoleOnYourResumeIs", "Every role on your résumé is kept and rewritten toward what this role asks for. Anything that isn't in your résumé is taken out and listed with the draft.")}
                    </p>
                    {!hasResume && data ? (
                      <p data-testid="resume-tailored-needs-resume" className="text-xs text-amber-700">
                        {t("myResumePage.addYourResumeFirstThisDraft", "Add your résumé first — this draft is built on the one you have.")}
                      </p>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={clearRole}>
                      {t("myResumePage.writeWithoutThisRoleInstead", "Write without this role instead")}
                    </Button>
                  </div>
                ) : null}
                {tailoredRole ? null : (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="rw-role">{t("myResumePage.role", "Role")}</Label>
                      <Input
                        id="rw-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder={t("myResumePage.eGOperationsManager", "e.g. Operations Manager")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rw-area">{t("myResumePage.careerArea", "Career area")}</Label>
                      <Input
                        id="rw-area"
                        value={careerArea}
                        onChange={(e) => setCareerArea(e.target.value)}
                        placeholder={t("myResumePage.eGHealthcareAdministration", "e.g. Healthcare administration")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rw-jd">{t("myResumePage.jobDescription", "Job description")}</Label>
                      <Textarea
                        id="rw-jd"
                        rows={5}
                        value={positionText}
                        onChange={(e) => setPositionText(e.target.value)}
                        placeholder={t("myResumePage.pasteAJobPostingToAim", "Paste a job posting to aim the draft at it")}
                      />
                    </div>
                  </>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button onClick={onGenerate} disabled={!canGenerate}>
                    {generate.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    )}
                    {generate.isPending ? t("myResumePage.drafting", "Drafting…") : t("myResumePage.generateResume", "Generate résumé")}
                  </Button>
                  {data && limit > 0 ? (
                    <span className="text-xs text-muted-foreground" data-testid="resume-left-today">
                      {t("myResumePage.leftToday", { defaultValue: "{{left}} of {{limit}} left today", left, limit })}
                    </span>
                  ) : null}
                </div>
                {limitReached ? (
                  <p role="status" data-testid="resume-limit-reached" className="text-xs text-amber-700">
                    {t("myResumePage.limitReached", { defaultValue: "You've used today's {{limit}} drafts. You can draft again tomorrow.", limit })}
                  </p>
                ) : null}
                {generate.isError ? (
                  <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {apiErrorMessage(generate.error, t("myResumePage.theDraftCouldntBeWrittenTry", "The draft couldn't be written. Try again in a moment."))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {optionsOn ? (
              <Card data-testid="resume-contact-card">
                <CardHeader>
                  <CardTitle className="text-base">{t("myResumePage.contactDetails", "Contact details")}</CardTitle>
                  <CardDescription>{t("myResumePage.forTheTopOfYourDownloaded", "For the top of your downloaded résumé.")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResumeContactFields value={contact} onChange={setContact} />
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="min-h-[24rem]">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">{t("myResumePage.yourDraft", "Your draft")}</CardTitle>
                <CardDescription>{t("myResumePage.reviewItBeforeYouUseIt", "Review it before you use it. You can generate again any time today.")}</CardDescription>
              </div>
              {draft ? (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={onCopy}>
                    <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {t("myResumePage.copy", "Copy")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onDownloadWord} disabled={exporting}>
                    <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {t("myResumePage.downloadWord", "Download Word")}
                  </Button>
                  <Button size="sm" onClick={onDownload} disabled={exporting}>
                    <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {exporting ? t("myResumePage.building", "Building…") : t("myResumePage.downloadPdf", "Download PDF")}
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {draft && doc ? (
                <div className="space-y-4">
                  {draft.tailored || Array.isArray(draft.removed) ? <TailoredNotes resume={draft} /> : null}
                  {pageLimit && pages !== null ? (
                    <p
                      role={pages > pageLimit ? "alert" : "status"}
                      data-testid="resume-page-count"
                      className={cn(
                        "rounded-md border p-2 text-sm",
                        pages > pageLimit ? "border-red-200 bg-red-50 text-red-700" : "text-muted-foreground",
                      )}
                    >
                      {pages > pageLimit
                        ? t("myResumePage.pagesOverLimit", { defaultValue: "This résumé runs to {{pages}} pages. USAJOBS won't accept more than {{pageLimit}} — shorten it or draft again before you upload it.", pages, pageLimit })
                        : pages === 1
                          ? t("myResumePage.pagesWithinLimitOne", { defaultValue: "This résumé is {{pages}} page as a PDF (USAJOBS allows {{pageLimit}}). Check the Word file is too.", pages, pageLimit })
                          : t("myResumePage.pagesWithinLimitOther", { defaultValue: "This résumé is {{pages}} pages as a PDF (USAJOBS allows {{pageLimit}}). Check the Word file is too.", pages, pageLimit })}
                    </p>
                  ) : null}
                  <ResumeCrosswalk rows={draft.qualifications_crosswalk ?? []} />
                  <ResumeTalkingPoints points={draft.talking_points ?? []} />
                  <ResumeDocumentView
                    doc={doc}
                    footnote={`${draft.sources.length ? t("myResumePage.draftedFrom", { defaultValue: "Drafted from: {{list}}. ", list: draft.sources.join(" · ") }) : ""}${draft.disclaimer}`}
                  />
                  <ResumeMiniCardPanel draft={draft} contact={contact} />
                </div>
              ) : draft ? (
                <div className="space-y-4">
                  {draft.tailored ? <TailoredNotes resume={draft} /> : null}
                  <ResumeView resume={draft} name={name} />
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  {generate.isPending ? t("myResumePage.draftingYourResume", "Drafting your résumé…") : t("myResumePage.yourDraftWillAppearHere", "Your draft will appear here.")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <AddPersonalDocModal
        target={uploadTarget}
        onOpenChange={(open) => {
          if (!open) setUploadTarget(null)
        }}
        onUploaded={() => {
          void sources.refetch()
        }}
      />
    </UserLayout>
  )
}
