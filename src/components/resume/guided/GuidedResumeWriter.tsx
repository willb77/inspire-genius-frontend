/**
 * RWO-8 — the guided Résumé Writer (CSA
 * docs/analysis/2026-11-04-rwo-8-resume-writer-guided-flow-and-assistant-csa.md,
 * option 1 and §7).
 *
 * Shown only when the server sends `guidedEnabled` (`resume_writer_guided` ON).
 * Without it `/my/resume` is today's page, unchanged — a frontend merge reaches
 * dev and stable at once, so the switch is the only thing that turns this on.
 *
 * Steps are page state, not routes, so one draft, one contact block and one set of
 * answers live across them, and nothing new is stored anywhere:
 *   1 What is it for? → 2 Your information → 3 Aim it → (3b A few questions)
 *   → 4 Review with the assistant → 5 Download.
 *
 * Every draft and every Apply is one of today's slots and passes the server's
 * fabrication and assessment-term checks. Questions and the assistant's answers
 * are free. Undo restores the previous draft from page state, with no request.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Download, FileText, Loader2, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { downloadBlob } from "@/lib/exportTranscript"
import { useAuth } from "@/context/useAuth"
import {
  useGenerateResume,
  useResumeQuestions,
  useSavedJobDescriptions,
  useSavedJobFile,
} from "@/hooks/useResumeWriter"
import { useDocumentUpload } from "@/hooks/documents/useDocumentUpload"
import { DocumentRejectedError, DocumentStillCheckingError } from "@/lib/documents/scan"
import { readJobFile } from "@/lib/resume/guided/readJobFile"
import { combinePosting, JOB_DESCRIPTION_KIND, positionCap } from "@/lib/resume/guided/jobFile"
import { rolesForRequest, type RoleDraft } from "@/lib/resume/guided/roles"
import type { FormatChoice } from "@/components/resume/ResumeFormatPanel"
import { ResumeCrosswalk, ResumeTalkingPoints } from "@/components/resume/ResumeDocumentView"
import { ResumeMiniCardPanel } from "@/components/resume/ResumeMiniCardPanel"
import { atsPdfPageCount, renderAtsResume } from "@/lib/resume/exportResumeAts"
import { buildResumeDocument, DEFAULT_SECTIONS, type ResumeContact } from "@/lib/resume/resumeDocument"
import type { Situation, UseWhere } from "@/lib/resume/formatSelector"
import { buildDraftSummary, changedLines, weakBullets } from "@/lib/resume/guided/draftSummary"
import { askAboutLine, downloadFileName, rewriteLine, yourChoices } from "@/lib/resume/guided/choices"
import {
  isResumeWriterDisabled,
  type GeneratedResume,
  type InterviewAnswer,
  type InterviewQuestion,
  type RemovedLine,
  type ResumeWriterRequest,
  type ResumeWriterSources,
  type TargetRoleView,
} from "@/types/resumeWriter"
import { StepAim, StepInformation, StepPurpose, type Aim, type JobFileStorage } from "./GuidedSetupSteps"
import { FollowUpCards, InterviewPromise, StepQuestions } from "./GuidedInterview"
import { ResumeAssistant } from "./ResumeAssistant"
import { GuidedDraftView } from "./GuidedDraftView"

export type GuidedStep = "purpose" | "info" | "aim" | "questions" | "review" | "download"

const STEPS: { id: GuidedStep; label: string }[] = [
  { id: "purpose", label: "1 · What is it for?" },
  { id: "info", label: "2 · Your information" },
  { id: "aim", label: "3 · Aim it" },
  { id: "review", label: "4 · Review" },
  { id: "download", label: "5 · Download" },
]
const ORDER: GuidedStep[] = ["purpose", "info", "aim", "questions", "review", "download"]

/** At most this many answers ride one draft (the server's cap, Q11). */
const ANSWERS_MAX = 6

const REMOVED_REASON: Record<string, string> = {
  employer: "Employer not in your résumé",
  title: "Job title not in your résumé",
  dates: "Dates not in your résumé",
  education: "Education not in your résumé",
  certification: "Certification not in your résumé",
  number: "A number that isn't in your résumé",
  activity: "Something your résumé doesn't show",
  training: "Training not in your résumé",
  assessment: "Assessment wording — kept off your résumé",
}

export interface GuidedResumeWriterProps {
  data: ResumeWriterSources
  jobId?: string
  onPickRole: (role: TargetRoleView) => void
  onClearRole: () => void
  onUpload: (kind: "resume" | "bio") => void
}

export function GuidedResumeWriter({ data, jobId, onPickRole, onClearRole, onUpload }: GuidedResumeWriterProps) {
  const { user } = useAuth()
  const generate = useGenerateResume()
  const interview = useResumeQuestions()
  const followUp = useResumeQuestions()

  const options = useMemo(() => data.options ?? [], [data.options])
  const styles = data.bulletStyles ?? []
  const [step, setStep] = useState<GuidedStep>("purpose")
  const [reached, setReached] = useState(0)
  const [situation, setSituation] = useState<Situation | "">("")
  const [where, setWhere] = useState<UseWhere>("online")
  const [format, setFormat] = useState<FormatChoice>({ optionId: "", styleId: "", disclosure: "", federalDetails: "" })
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [contact, setContact] = useState<ResumeContact>(() => ({
    name: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: "",
    location: "",
    link: "",
  }))
  const tailoredRole = data.tailoredEnabled && data.targetRole ? data.targetRole : null
  const goalTarget = !jobId && data.tailoredEnabled && data.goalTarget ? data.goalTarget : null
  const [aim, setAim] = useState<Aim>(tailoredRole ? "role" : "posting")
  const [title, setTitle] = useState("")
  const [roleText, setRoleText] = useState("")
  const [area, setArea] = useState("")
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [askedFor, setAskedFor] = useState("")
  const [followUps, setFollowUps] = useState<InterviewQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<GeneratedResume[]>([])
  const [showRemoved, setShowRemoved] = useState(false)
  const [pendingAsk, setPendingAsk] = useState<string | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [prefill, setPrefill] = useState<{ text: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [pages, setPages] = useState<number | null>(null)
  const [checks, setChecks] = useState({ read: false, contact: false, reviewed: false })
  // RWO-8 §10 — roles added by hand (only while the server sends rolesEnabled).
  const rolesOn = data.rolesEnabled === true
  const [roles, setRoles] = useState<RoleDraft[]>([])
  // RWO-8 §9 — a job-description file read on the device and kept for 90 days
  // (only while the server sends jobFileStorageEnabled). Its text aims the draft;
  // it is never put in the box. "loaded" only once its virus scan has passed.
  const storeJobFile = data.jobFileStorageEnabled === true
  const [jobFile, setJobFile] = useState<{ name: string; text: string; status: "checking" | "loaded" } | null>(null)
  const [jobNote, setJobNote] = useState<string | null>(null)
  const jobToken = useRef(0)
  const upload = useDocumentUpload()
  const savedJobs = useSavedJobDescriptions(storeJobFile)
  const savedFile = useSavedJobFile()

  const optionId = format.optionId || data.defaultOption || options[0]?.id || ""
  const styleId = format.styleId || data.defaultBulletStyle || styles[0]?.id || ""
  const chosen = options.find((o) => o.id === optionId)
  const draft = history.length ? history[history.length - 1] : null
  const previous = history.length > 1 ? history[history.length - 2] : null
  const used = draft?.usedToday ?? data.usedToday
  const limit = draft?.dailyLimit ?? data.dailyLimit
  const left = Math.max(0, limit - used)
  const hasResume = data.sources.resume || documentIds.length > 0
  const hasAnything = hasResume || data.sources.bio || data.sources.assessments.length > 0
  const switchedOff = !data.enabled || isResumeWriterDisabled(generate.data)
  const addedRoles = rolesOn ? rolesForRequest(roles) : []
  const jobChecking = storeJobFile && jobFile?.status === "checking"
  const canWrite =
    !switchedOff &&
    left > 0 &&
    !generate.isPending &&
    !jobChecking &&
    (aim === "role" && tailoredRole ? hasResume : hasAnything || addedRoles.length > 0)
  const aimedAt = aim === "role" && tailoredRole ? tailoredRole.title : title.trim() || area.trim()

  const draftOffer = options.find((o) => o.id === draft?.option)
  const doc = draft
    ? buildResumeDocument(
        draft,
        contact,
        draftOffer?.sections ?? DEFAULT_SECTIONS,
        draftOffer?.takesFederalDetails ? "federal" : "standard",
      )
    : null
  const changed = useMemo(() => (draft ? changedLines(previous, draft) : new Set<string>()), [draft, previous])
  const summary = draft ? buildDraftSummary(draft, draftOffer?.name ?? "", aimedAt) : ""
  const pageLimit = draftOffer?.pageLimit
  const docKey = doc && pageLimit ? JSON.stringify(doc) : ""

  useEffect(() => {
    // RWO-3: a format with a page limit (Federal: 2) shows the PDF's page count.
    if (!docKey || !doc) {
      setPages(null)
      return
    }
    let live = true
    void atsPdfPageCount(doc)
      .then((n) => live && setPages(n))
      .catch(() => live && setPages(null))
    return () => {
      live = false
    }
    // docKey stands for the document's content; `doc` is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey])

  const go = (next: GuidedStep) => {
    setStep(next)
    setReached((r) => Math.max(r, ORDER.indexOf(next)))
  }

  const targetBody = (): ResumeWriterRequest => {
    if (aim === "role" && tailoredRole) return { jobId: tailoredRole.jobId }
    if (aim === "posting") {
      const fileText = storeJobFile && jobFile?.status === "loaded" ? jobFile.text : ""
      const posting = combinePosting(roleText, fileText, positionCap(chosen))
      return { role: title.trim() || undefined, positionText: posting?.text }
    }
    return { role: title.trim() || undefined, careerArea: area.trim() || undefined }
  }

  const answered = (): InterviewAnswer[] =>
    [...questions, ...followUps]
      .filter((q) => (answers[q.id] ?? "").trim())
      .map((q) => ({ question: q.text, answer: answers[q.id].trim() }))
      .slice(0, ANSWERS_MAX)

  const loadFollowUps = (first: GeneratedResume) => {
    const weak = weakBullets(first)
    if (!weak.length) return
    followUp.mutate(
      { afterDraft: true, weakBullets: weak, option: optionId },
      {
        onSuccess: (r) => {
          if (!Array.isArray(r)) return
          setFollowUps(r.map((q) => ({ ...q, id: `f-${q.id}` })))
        },
      },
    )
  }

  const write = (instruction?: string) => {
    const facts = answered()
    const disclosure = chosen?.takesDisclosure ? format.disclosure.trim() : ""
    const federalDetails = chosen?.takesFederalDetails ? format.federalDetails.trim() : ""
    generate.mutate(
      {
        ...targetBody(),
        documentIds: documentIds.length ? documentIds : undefined,
        option: optionId,
        bulletStyle: styleId || undefined,
        ...(disclosure ? { disclosure } : {}),
        ...(federalDetails ? { federalDetails } : {}),
        ...(facts.length ? { answers: facts } : {}),
        ...(addedRoles.length ? { roles: addedRoles } : {}),
        ...(instruction ? { instruction } : {}),
      },
      {
        onSuccess: (r) => {
          if (isResumeWriterDisabled(r)) return
          const first = history.length === 0
          setHistory((h) => [...h, r])
          go("review")
          if (first && !instruction) loadFollowUps(r)
        },
      },
    )
  }

  const startQuestions = () => {
    go("questions")
    const key = JSON.stringify({ ...targetBody(), optionId, documentIds })
    if (key === askedFor) return
    setAskedFor(key)
    setQuestions([])
    setQIndex(0)
    interview.mutate(
      { ...targetBody(), documentIds: documentIds.length ? documentIds : undefined, option: optionId },
      { onSuccess: (r) => setQuestions(Array.isArray(r) ? r : []) },
    )
  }

  const onDownload = async (kind: "docx" | "pdf") => {
    if (!doc) return
    setExporting(true)
    try {
      const { fileName, blob } = await renderAtsResume(doc, kind, aimedAt || null)
      downloadBlob(fileName, blob)
    } catch {
      toast.error(kind === "pdf" ? "Couldn't build the PDF. Try again." : "Couldn't build the Word file. Try again.")
    } finally {
      setExporting(false)
    }
  }

  const removeJobFile = () => {
    jobToken.current += 1
    setJobFile(null)
  }

  // Keep the text only after the stored copy has passed its virus scan; a
  // refused file's text is discarded and never aims a draft.
  const onJobFile = (file: File, text: string) => {
    const token = ++jobToken.current
    setJobNote(null)
    setJobFile({ name: file.name, text, status: "checking" })
    upload.mutate(
      { file, docKind: JOB_DESCRIPTION_KIND },
      {
        onSuccess: () => {
          if (token !== jobToken.current) return
          setJobFile({ name: file.name, text, status: "loaded" })
        },
        onError: (err) => {
          if (token !== jobToken.current) return
          setJobFile(null)
          setJobNote(
            err instanceof DocumentRejectedError
              ? err.message
              : err instanceof DocumentStillCheckingError
                ? "We're still checking this file — try again in a minute."
                : "Couldn't keep that file. Try again, or describe the role in the box.",
          )
        },
      },
    )
  }

  const onUseSaved: JobFileStorage["onUseSaved"] = (saved) => {
    const token = ++jobToken.current
    setJobNote(null)
    savedFile.mutate(saved, {
      onSuccess: async (file) => {
        try {
          const text = await readJobFile(file)
          if (token === jobToken.current) setJobFile({ name: saved.filename, text, status: "loaded" })
        } catch {
          if (token === jobToken.current) setJobNote(`Couldn't read ${saved.filename}. Choose the file again.`)
        }
      },
      onError: () => {
        if (token === jobToken.current) setJobNote(`Couldn't open ${saved.filename}. Choose the file again.`)
      },
    })
  }

  const jobFileProps: JobFileStorage | undefined = storeJobFile
    ? {
        loaded: jobFile ? { name: jobFile.name, status: jobFile.status } : null,
        note: jobNote,
        both: !!(jobFile && roleText.trim()),
        truncated:
          !!jobFile &&
          !!roleText.trim() &&
          !!combinePosting(roleText, jobFile.text, positionCap(chosen))?.truncated,
        saved: savedJobs.data ?? [],
        onFile: onJobFile,
        onRemove: removeJobFile,
        onUseSaved,
        openingSaved: savedFile.isPending,
      }
    : undefined

  const setAnswer = (id: string, text: string) => setAnswers((a) => ({ ...a, [id]: text }))
  // Lines are only clickable on the review step, where the assistant is always open.
  const fillAssistant = (text: string) => setPrefill({ text })
  const choices = yourChoices({
    situation,
    formatName: chosen?.name ?? "",
    sources: data.sources,
    addedDocuments: documentIds.length,
    aimedAt,
    styleName: styles.length > 1 ? (styles.find((st) => st.id === styleId)?.name ?? "") : "",
  })
  const removed: RemovedLine[] = draft?.removed ?? []
  const notShown = [
    ...(draft?.notEvidenced ?? []),
    ...(draft?.qualifications_crosswalk ?? []).filter((r) => !r.evidence).map((r) => r.requirement),
  ]
  const stepIndex = ORDER.indexOf(step)
  const pillFor = (s: GuidedStep) => (s === "questions" ? "aim" : s)

  return (
    <div className="space-y-6" data-testid="guided-resume-writer">
      <p className="text-sm text-muted-foreground" data-testid="guided-drafts-left">
        {left} of {limit} drafts left today
      </p>
      <nav aria-label="Steps" className="flex flex-wrap gap-2">
        {STEPS.map((s) => {
          const i = ORDER.indexOf(s.id)
          const current = pillFor(step) === s.id
          const done = i < stepIndex && !current
          return (
            <button
              key={s.id}
              type="button"
              aria-current={current ? "step" : undefined}
              disabled={i > reached || ((s.id === "review" || s.id === "download") && !draft)}
              onClick={() => go(s.id)}
              className={cn(
                "min-h-9 rounded-full px-3 text-xs",
                current ? "bg-teal-700 font-semibold text-white" : done ? "bg-teal-50 text-teal-900" : "bg-muted text-muted-foreground",
              )}
            >
              {s.label}
              {done ? " ✓" : ""}
            </button>
          )
        })}
      </nav>

      {switchedOff ? (
        <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Résumé Writer is turned off right now. Your documents are still on file; try again later.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
      {step === "purpose" ? (
        <StepPurpose
          options={options}
          defaultOption={data.defaultOption || options[0]?.id || ""}
          situation={situation}
          where={where}
          optionId={optionId}
          onSituation={setSituation}
          onWhere={setWhere}
          onOption={(id) => setFormat((f) => ({ ...f, optionId: id }))}
        />
      ) : null}

      {step === "info" ? (
        <StepInformation
          data={data}
          chosen={chosen}
          format={format}
          onFormat={setFormat}
          documentIds={documentIds}
          onToggleDoc={(id, on) =>
            setDocumentIds((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))
          }
          contact={contact}
          onContact={setContact}
          onUpload={onUpload}
          {...(rolesOn ? { roles, onRoles: setRoles } : {})}
        />
      ) : null}

      {step === "aim" ? (
        <StepAim
          aim={aim}
          onAim={setAim}
          title={title}
          onTitle={setTitle}
          roleText={roleText}
          onRoleText={setRoleText}
          area={area}
          onArea={setArea}
          tailoredRole={tailoredRole}
          goalTarget={goalTarget}
          onPickRole={onPickRole}
          onClearRole={onClearRole}
          styles={styles}
          styleId={styleId}
          onStyle={(id) => setFormat((f) => ({ ...f, styleId: id }))}
          left={left}
          limit={limit}
          jobFile={jobFileProps}
        />
      ) : null}

      {step === "questions" ? (
          <StepQuestions
            questions={questions}
            answers={answers}
            index={qIndex}
            loading={interview.isPending}
            error={interview.isError ? apiErrorMessage(interview.error, "We couldn't think of questions just now. You can write your résumé without them.") : null}
            onAnswer={setAnswer}
            onIndex={setQIndex}
            onExplain={(q) => {
              setAssistantOpen(true)
              setPendingAsk(`What do you mean by this question: "${q.text}"?`)
            }}
          />
      ) : null}

      {step === "review" && draft && doc ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRemoved((v) => !v)}
                aria-expanded={showRemoved}
                data-testid="guided-removed-toggle"
                className="min-h-9 rounded-full border border-amber-300 bg-amber-50 px-3 text-xs text-amber-900"
              >
                {removed.length ? `${removed.length} line${removed.length === 1 ? "" : "s"} left out — why?` : "Nothing left out"}
              </button>
              {notShown.length ? (
                <span className="rounded-full border px-3 py-1.5 text-xs" data-testid="guided-not-shown">
                  {notShown.length} job skill{notShown.length === 1 ? "" : "s"} not shown yet
                </span>
              ) : null}
              {changed.size ? (
                <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs text-teal-900" data-testid="guided-changed-count">
                  {changed.size} line{changed.size === 1 ? "" : "s"} changed
                </span>
              ) : null}
              {previous ? (
                <Button size="sm" variant="ghost" onClick={() => setHistory((h) => h.slice(0, -1))} data-testid="guided-undo">
                  <Undo2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Undo
                </Button>
              ) : null}
            </div>
            {showRemoved ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm" data-testid="guided-removed-list">
                {removed.length ? (
                  <>
                    <p className="mb-1 text-xs text-muted-foreground">
                      The draft only keeps what your résumé (and your answers) show. If one of these is true, add it to
                      your résumé or answer a question, and write again.
                    </p>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {removed.map((r, i) => (
                        <li key={`${r.reason}-${i}`}>
                          <span className="text-muted-foreground">{REMOVED_REASON[r.reason] ?? "Not in your résumé"}:</span>{" "}
                          {r.text}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Every line was found in your résumé or your answers.</p>
                )}
                {notShown.length ? (
                  <>
                    <p className="mt-2 font-medium">The job also asks for</p>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {notShown.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : null}
            {pageLimit && pages !== null ? (
              <p
                role={pages > pageLimit ? "alert" : "status"}
                className={cn("rounded-md border p-2 text-sm", pages > pageLimit ? "border-red-200 bg-red-50 text-red-700" : "text-muted-foreground")}
              >
                {pages > pageLimit
                  ? `This résumé runs to ${pages} pages. USAJOBS won't accept more than ${pageLimit} — ask the assistant to shorten it.`
                  : `This résumé is ${pages} page${pages === 1 ? "" : "s"} as a PDF (USAJOBS allows ${pageLimit}).`}
              </p>
            ) : null}
            <ResumeCrosswalk rows={draft.qualifications_crosswalk ?? []} />
            <ResumeTalkingPoints points={draft.talking_points ?? []} />
            <div className="rounded-lg border p-4">
              <GuidedDraftView
                doc={doc}
                changed={changed}
                footnote={`${draft.sources.length ? `Drafted from: ${draft.sources.join(" · ")}. ` : ""}${draft.disclaimer}`}
                onAsk={(line) => fillAssistant(askAboutLine(line))}
                onRewrite={(line) => fillAssistant(rewriteLine(line))}
              />
            </div>
          </div>
      ) : null}

      {step === "download" && draft && doc ? (
        <div className="space-y-5" data-testid="guided-step-download">
          <div>
            <h2 className="text-xl font-semibold">Your résumé is ready</h2>
            <p className="text-sm text-muted-foreground">Pick the file for where you&apos;re sending it.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border-2 border-teal-600 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Recommended</p>
              <p className="text-lg font-semibold">Word</p>
              <p className="text-sm text-muted-foreground">For online applications. Screening systems read it best.</p>
              <Button onClick={() => void onDownload("docx")} disabled={exporting}>
                <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Download Word
              </Button>
              <p className="break-words text-xs text-muted-foreground" data-testid="guided-file-name-docx">
                File name: {downloadFileName(doc.name, aimedAt, "docx")}
              </p>
            </div>
            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email or print</p>
              <p className="text-lg font-semibold">PDF</p>
              <p className="text-sm text-muted-foreground">Keeps its layout exactly. Use when a posting asks for PDF.</p>
              <Button variant="outline" onClick={() => void onDownload("pdf")} disabled={exporting}>
                <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {exporting ? "Building…" : "Download PDF"}
              </Button>
              <p className="break-words text-xs text-muted-foreground" data-testid="guided-file-name-pdf">
                File name: {downloadFileName(doc.name, aimedAt, "pdf")}
              </p>
            </div>
          </div>
          <ResumeMiniCardPanel draft={draft} contact={contact} />
          <fieldset className="space-y-2 rounded-lg border p-4" data-testid="guided-checklist">
            <legend className="px-1 text-sm font-semibold">Before you send it</legend>
            {(
              [
                ["read", "I read every line — it's all true"],
                ["contact", "My phone and email are right"],
                ["reviewed", "A coach or friend has looked at it (optional)"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checks[k]}
                  onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))}
                  className="h-4 w-4"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <p className="text-sm text-muted-foreground">
            Applying somewhere else?{" "}
            <button type="button" className="text-teal-700 underline" onClick={() => go("aim")}>
              Aim at another job
            </button>{" "}
            — your information stays.
          </p>
        </div>
      ) : null}

      </div>
      <aside className="min-w-0 space-y-4">
        {step === "aim" ? (
          <section aria-label="Your choices" className="rounded-lg border p-4 text-sm" data-testid="guided-your-choices">
            <h3 className="mb-1 font-semibold">Your choices</h3>
            <dl className="space-y-1">
              {choices.map((c) => (
                <div key={c.label} className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">{c.label}</dt>
                  <dd className="min-w-0">{c.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        {step === "questions" ? <InterviewPromise /> : null}
        {step === "review" ? <FollowUpCards questions={followUps} answers={answers} onAnswer={setAnswer} /> : null}
        {step === "download" ? null : (
          <details
            open={assistantOpen || step === "review"}
            onToggle={(e) => setAssistantOpen((e.currentTarget as HTMLDetailsElement).open)}
            className="rounded-lg"
            data-testid="guided-assistant-drawer"
          >
            <summary className={cn("cursor-pointer text-sm font-medium", step === "review" && "sr-only")}>
              Questions? Ask the résumé assistant
            </summary>
            <ResumeAssistant
              summary={summary}
              accessToken={user?.token ?? undefined}
              left={left}
              limit={limit}
              applying={generate.isPending}
              canApply={!!draft && canWrite}
              showApply={!!draft}
              onApply={(instruction) => write(instruction)}
              pendingAsk={pendingAsk}
              onPendingAskUsed={() => setPendingAsk(null)}
              prefill={prefill}
            />
          </details>
        )}
      </aside>
      </div>

      {generate.isError ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {apiErrorMessage(generate.error, "The draft couldn't be written. Try again in a moment.")}
        </div>
      ) : null}

      {/* RWO8-F2: the page's floating help launcher (SidebarScaffold, 56px at
          24px from the viewport's right and bottom edges) sat on this footer's
          primary button and took its clicks. 96px under the footer (mb-24)
          keeps it above the launcher's top edge (80px up) once scrolled to the
          end, and 80px on the right (pr-20) keeps the buttons out of the
          launcher's column where the content runs to the viewport's edge. The
          shared launcher itself is unchanged. */}
      <footer
        className="mb-24 flex flex-wrap items-center justify-between gap-3 border-t pt-4 pr-20"
        data-testid="guided-footer"
      >
        {step !== "purpose" ? (
          <Button
            variant="ghost"
            onClick={() => go(step === "review" ? "aim" : ORDER[Math.max(0, stepIndex - 1)])}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {step === "purpose" ? (
            <Button onClick={() => go("info")} disabled={!optionId}>
              Next
            </Button>
          ) : null}
          {step === "info" ? <Button onClick={() => go("aim")}>Next</Button> : null}
          {step === "aim" ? (
            <>
              <Button variant="ghost" onClick={() => write()} disabled={!canWrite}>
                Skip questions, write now
              </Button>
              <Button onClick={startQuestions} disabled={switchedOff || jobChecking}>
                Next: a few quick questions
              </Button>
            </>
          ) : null}
          {step === "questions" ? (
            <Button onClick={() => write()} disabled={!canWrite} data-testid="guided-write">
              {generate.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {generate.isPending ? "Writing…" : "Write my résumé"}
            </Button>
          ) : null}
          {step === "review" ? <Button onClick={() => go("download")}>Looks good — download</Button> : null}
        </div>
      </footer>
    </div>
  )
}
