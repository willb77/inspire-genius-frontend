/**
 * RWO-8 — the guided Résumé Writer's set-up steps: 1 What is it for?, 2 Your
 * information, 3 Aim it. Page state only; nothing here calls the server.
 */
import { useState } from "react"
import { Check, FileUp, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ResumeContactFields } from "@/components/resume/ResumeContactFields"
import type { FormatChoice } from "@/components/resume/ResumeFormatPanel"
import {
  recommendFormat,
  situationsFor,
  USES,
  type Situation,
  type UseWhere,
} from "@/lib/resume/formatSelector"
import { JOB_FILE_ACCEPT, JobFileRefused, readJobFile } from "@/lib/resume/guided/readJobFile"
import type { ResumeContact } from "@/lib/resume/resumeDocument"
import type { ResumeOptionView, ResumeWriterSources, TargetRoleView } from "@/types/resumeWriter"
import type { RoleDraft } from "@/lib/resume/guided/roles"
import { deletesOnLabel } from "@/lib/resume/guided/jobFile"
import type { SavedJobDescription } from "@/services/resumeWriter/resumeWriter.service"
import { GuidedRoles } from "./GuidedRoles"

const CARD = "w-full rounded-lg border p-3 text-left text-sm transition-colors"

// ── 1 · What is it for? ─────────────────────────────────────────────────────

export function StepPurpose({
  options,
  defaultOption,
  situation,
  where,
  optionId,
  onSituation,
  onWhere,
  onOption,
}: {
  options: ResumeOptionView[]
  defaultOption: string
  situation: Situation | ""
  where: UseWhere
  optionId: string
  onSituation: (s: Situation) => void
  onWhere: (w: UseWhere) => void
  onOption: (id: string) => void
}) {
  const available = options.map((o) => o.id)
  const chosen = options.find((o) => o.id === optionId)
  const rec = situation ? recommendFormat(situation, where, false, available, defaultOption) : null
  const pick = (s: Situation, w: UseWhere) => {
    onOption(recommendFormat(s, w, false, available, defaultOption).optionId)
  }
  return (
    <div className="space-y-5" data-testid="guided-step-purpose">
      <div>
        <h2 className="text-xl font-semibold">What is this résumé for?</h2>
        <p className="text-sm text-muted-foreground">Pick the one closest to you. We&apos;ll choose the format.</p>
      </div>
      <div role="radiogroup" aria-label="What it's for" className="grid gap-2 sm:grid-cols-2">
        {situationsFor(available).map((s) => {
          const on = s.id === situation
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-testid={`guided-purpose-${s.id}`}
              onClick={() => {
                onSituation(s.id)
                pick(s.id, where)
              }}
              className={cn(CARD, "min-h-11", on ? "border-teal-600 bg-teal-50" : "hover:bg-muted/50")}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Where will you use it?</legend>
        <div className="flex flex-wrap gap-2">
          {USES.map((u) => (
            <button
              key={u.id}
              type="button"
              aria-pressed={u.id === where}
              onClick={() => {
                onWhere(u.id)
                if (situation) pick(situation, u.id)
              }}
              className={cn(
                "min-h-11 rounded-full border px-3 text-sm",
                u.id === where ? "border-teal-600 bg-teal-50" : "hover:bg-muted/50",
              )}
            >
              {u.label}
            </button>
          ))}
        </div>
      </fieldset>
      {rec && chosen ? (
        <div data-testid="guided-format-choice" className="space-y-1 rounded-lg bg-teal-50 p-3 text-sm">
          <p>
            <span className="font-semibold">Format: {chosen.name}.</span>{" "}
            {chosen.id === rec.optionId ? rec.why : chosen.useWhen}
          </p>
          {rec.notes.slice(0, 1).map((n) => (
            <p key={n} className="text-xs text-muted-foreground">
              {n}
            </p>
          ))}
        </div>
      ) : null}
      <details className="rounded-lg border p-3" data-testid="guided-all-formats">
        <summary className="cursor-pointer text-sm font-medium">See all formats</summary>
        <div role="radiogroup" aria-label="Résumé format" className="mt-3 space-y-2">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={o.id === optionId}
              onClick={() => onOption(o.id)}
              className={cn(CARD, o.id === optionId ? "border-teal-600 bg-teal-50" : "hover:bg-muted/50")}
            >
              <span className="flex items-center justify-between font-medium">
                {o.number}. {o.name}
                {o.id === optionId ? <Check className="h-4 w-4 text-teal-700" aria-hidden="true" /> : null}
              </span>
              <span className="block text-xs text-muted-foreground">{o.useWhen}</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}

// ── 2 · Your information ────────────────────────────────────────────────────

export function StepInformation({
  data,
  chosen,
  format,
  onFormat,
  documentIds,
  onToggleDoc,
  contact,
  onContact,
  onUpload,
  roles,
  onRoles,
}: {
  data: ResumeWriterSources
  chosen: ResumeOptionView | undefined
  format: FormatChoice
  onFormat: (f: FormatChoice) => void
  documentIds: string[]
  onToggleDoc: (id: string, on: boolean) => void
  contact: ResumeContact
  onContact: (c: ResumeContact) => void
  onUpload: (kind: "resume" | "bio") => void
  /** RWO-8 §10 — given only while the server sends `rolesEnabled`. */
  roles?: RoleDraft[]
  onRoles?: (r: RoleDraft[]) => void
}) {
  const s = data.sources
  const ready = [s.resume || documentIds.length > 0, s.bio, s.assessments.length > 0, !!(contact.email && contact.phone)]
  const score = Math.round((ready.filter(Boolean).length / ready.length) * 100)
  const fixes = [
    !s.resume && documentIds.length === 0 ? "Add your résumé — every line of the draft comes from it." : null,
    !(contact.email && contact.phone) ? "Add your phone and email so employers can reach you." : null,
    !s.bio ? "A short bio helps the summary sound like you." : null,
  ].filter((x): x is string => !!x)
  return (
    <div className="space-y-5" data-testid="guided-step-info">
      <div>
        <h2 className="text-xl font-semibold">Your information</h2>
        <p className="text-sm text-muted-foreground">Your draft is written only from what&apos;s here. Nothing is invented.</p>
      </div>
      <div className="space-y-2 rounded-lg border p-4">
        {[
          ["Résumé", s.resume, "resume"] as const,
          ["Bio", s.bio, "bio"] as const,
        ].map(([label, on, kind]) => (
          <div key={kind} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {label}: <span className={on ? "text-teal-700" : "text-muted-foreground"}>{on ? "on file" : "not on file"}</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => onUpload(kind)}>
              <FileUp className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {on ? "Replace" : "Add"}
            </Button>
          </div>
        ))}
        <p className="text-sm">
          Assessments:{" "}
          <span className={s.assessments.length ? "text-teal-700" : "text-muted-foreground"}>
            {s.assessments.length ? `${s.assessments.join(", ")} — shapes what's emphasised, never named` : "none on file"}
          </span>
        </p>
        {roles?.length ? (
          <p className="text-sm" data-testid="guided-roles-count">
            Roles you added: <span className="text-teal-700">{roles.length} — on file for this draft</span>
          </p>
        ) : null}
        {data.documents.length ? (
          <fieldset className="space-y-1 pt-1">
            <legend className="text-xs font-medium text-muted-foreground">Also use these documents (optional)</legend>
            {data.documents.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <Checkbox
                  id={`gdoc-${d.id}`}
                  checked={documentIds.includes(d.id)}
                  onCheckedChange={(v) => onToggleDoc(d.id, v === true)}
                />
                <Label htmlFor={`gdoc-${d.id}`} className="text-sm font-normal">
                  {d.filename}
                </Label>
              </div>
            ))}
          </fieldset>
        ) : null}
      </div>
      {roles && onRoles ? <GuidedRoles roles={roles} onRoles={onRoles} /> : null}
      <div className="space-y-2 rounded-lg border p-4" data-testid="guided-readiness">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Ready to write</span>
          <span>{score}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted" aria-hidden="true">
          <div className="h-2 rounded-full bg-teal-600" style={{ width: `${score}%` }} />
        </div>
        {fixes.slice(0, 2).map((f) => (
          <p key={f} className="text-xs text-muted-foreground">
            {f}
          </p>
        ))}
      </div>
      <div className="space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Contact details</h3>
        <p className="text-xs text-muted-foreground">For the top of your résumé. Kept on this page only.</p>
        <ResumeContactFields value={contact} onChange={onContact} />
      </div>
      {chosen?.takesDisclosure ? (
        <div className="space-y-1">
          <Label htmlFor="g-disclosure">How should we describe any gap or program? (optional)</Label>
          <Textarea
            id="g-disclosure"
            rows={2}
            maxLength={300}
            value={format.disclosure}
            onChange={(e) => onFormat({ ...format, disclosure: e.target.value })}
          />
        </div>
      ) : null}
      {chosen?.takesFederalDetails ? (
        <div className="space-y-1">
          <Label htmlFor="g-federal">Federal details: hours per week, series/grade, clearance</Label>
          <Textarea
            id="g-federal"
            rows={3}
            maxLength={600}
            value={format.federalDetails}
            onChange={(e) => onFormat({ ...format, federalDetails: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  )
}

// ── 3 · Aim it ──────────────────────────────────────────────────────────────

export type Aim = "posting" | "role" | "general"

/** RWO-8 §9 — given to StepAim only while the server sends `jobFileStorageEnabled`.
 * The file's text is held by the page, never put in the box. */
export type JobFileStorage = {
  loaded: { name: string; status: "checking" | "loaded" } | null
  /** A refusal or failure to show, in place of the loaded file. */
  note: string | null
  /** Both a typed description and the file are used; `truncated` when the file was cut. */
  both: boolean
  truncated: boolean
  saved: SavedJobDescription[]
  onFile: (file: File, text: string) => void
  onRemove: () => void
  onUseSaved: (s: SavedJobDescription) => void
  openingSaved: boolean
}

export function StepAim({
  aim,
  onAim,
  title,
  onTitle,
  roleText,
  onRoleText,
  area,
  onArea,
  tailoredRole,
  goalTarget,
  onPickRole,
  onClearRole,
  styles,
  styleId,
  onStyle,
  left,
  limit,
  jobFile,
}: {
  aim: Aim
  onAim: (a: Aim) => void
  title: string
  onTitle: (t: string) => void
  roleText: string
  onRoleText: (t: string) => void
  area: string
  onArea: (t: string) => void
  tailoredRole: TargetRoleView | null
  goalTarget: TargetRoleView | null
  onPickRole: (r: TargetRoleView) => void
  onClearRole: () => void
  styles: { id: string; name: string; structure: string }[]
  styleId: string
  onStyle: (id: string) => void
  left: number
  limit: number
  jobFile?: JobFileStorage
}) {
  const [reading, setReading] = useState(false)
  const [fileNote, setFileNote] = useState<{ ok: boolean; text: string } | null>(null)
  const careerFitRole = tailoredRole ?? goalTarget

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setReading(true)
    setFileNote(null)
    try {
      const text = await readJobFile(file)
      if (jobFile) {
        // §9 (Q15 as Bill changed it): the box is not filled; the page holds the text.
        jobFile.onFile(file, text)
      } else {
        onRoleText(text)
        setFileNote({ ok: true, text: `${file.name} — read on this device. Its text is in the box above; edit it if you like.` })
      }
    } catch (err) {
      setFileNote({ ok: false, text: err instanceof JobFileRefused ? err.message : "Couldn't read that file. Paste the text instead." })
    } finally {
      setReading(false)
    }
  }

  const option = (id: Aim, heading: string, sub: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={aim === id}
      data-testid={`guided-aim-${id}`}
      onClick={() => {
        onAim(id)
        if (id !== "role" && tailoredRole) onClearRole()
        if (id === "role" && !tailoredRole && goalTarget) onPickRole(goalTarget)
      }}
      className={cn(CARD, aim === id ? "border-teal-600 bg-teal-50" : "hover:bg-muted/50")}
    >
      <span className="block font-medium">{heading}</span>
      <span className="block text-xs text-muted-foreground">{sub}</span>
    </button>
  )

  return (
    <div className="space-y-5" data-testid="guided-step-aim">
      <div>
        <h2 className="text-xl font-semibold">Which job is it for?</h2>
        <p className="text-sm text-muted-foreground">Aiming at one job gets the most callbacks. Choose one way:</p>
      </div>
      <div role="radiogroup" aria-label="Aim" className="space-y-2">
        {option("posting", "I have a job posting", "Describe the role, paste the posting, or read it from a file")}
        {careerFitRole
          ? option("role", "A role from Career Fit", `${tailoredRole ? "Chosen" : "Your goal"}: ${careerFitRole.title}`)
          : null}
        {option("general", "No specific job yet", "A general résumé for a type of work")}
      </div>

      {aim === "posting" ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="g-title">Job title</Label>
            <Input id="g-title" value={title} onChange={(e) => onTitle(e.target.value)} placeholder="e.g. Operations Manager" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="g-describe">Describe the role</Label>
            <Textarea
              id="g-describe"
              rows={5}
              value={roleText}
              onChange={(e) => onRoleText(e.target.value)}
              placeholder="Describe the role in your own words, or paste the posting — we'll match its wording where your résumé supports it."
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-dashed p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Read the job description from a file</p>
              <p className="text-xs text-muted-foreground">PDF, Word (.docx) or text (.txt), up to 10 MB.</p>
              <p className="text-xs text-muted-foreground" data-testid="guided-file-promise">
                {jobFile
                  ? "Read on your device, checked for viruses, and kept with your account for 90 days, then deleted. Programs and other file types are refused."
                  : "Read on your device — the file isn't uploaded or kept. Programs and other file types are refused."}
              </p>
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-teal-600 px-3 text-sm text-teal-700">
              {reading ? "Reading…" : "Choose file"}
              <input
                type="file"
                accept={JOB_FILE_ACCEPT}
                className="sr-only"
                data-testid="guided-job-file"
                onChange={(e) => {
                  void onFile(e.target.files?.[0])
                  e.target.value = ""
                }}
              />
            </label>
          </div>
          {jobFile?.loaded ? (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-teal-200 bg-teal-50 p-2 text-xs text-teal-900"
              data-testid="guided-job-loaded"
            >
              <span>
                {jobFile.loaded.status === "checking"
                  ? `Checking ${jobFile.loaded.name} for viruses…`
                  : `Loaded ${jobFile.loaded.name} — it will be used to aim your résumé.`}
                {jobFile.loaded.status === "loaded" && jobFile.both
                  ? ` Your description and ${jobFile.loaded.name} are both used${jobFile.truncated ? " (the file's text is shortened to fit)" : ""}.`
                  : ""}
              </span>
              <Button size="sm" variant="ghost" onClick={jobFile.onRemove} data-testid="guided-job-remove">
                Remove
              </Button>
            </div>
          ) : null}
          {jobFile?.note ? (
            <p role="alert" className="text-xs text-red-700" data-testid="guided-job-note">
              {jobFile.note}
            </p>
          ) : null}
          {jobFile && jobFile.saved.length && !jobFile.loaded ? (
            <div className="space-y-1" data-testid="guided-saved-jobs">
              <p className="text-xs font-medium text-muted-foreground">Use a saved job description</p>
              {jobFile.saved.map((sj) => (
                <button
                  key={sj.id}
                  type="button"
                  disabled={jobFile.openingSaved}
                  onClick={() => jobFile.onUseSaved(sj)}
                  className={cn(CARD, "flex items-center justify-between gap-2 hover:bg-muted/50")}
                >
                  <span className="min-w-0 break-words">{sj.filename}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{deletesOnLabel(sj.expiresAt) ?? ""}</span>
                </button>
              ))}
            </div>
          ) : null}
          {fileNote ? (
            <p
              role={fileNote.ok ? "status" : "alert"}
              className={cn("text-xs", fileNote.ok ? "text-teal-700" : "text-red-700")}
              data-testid="guided-file-note"
            >
              {fileNote.text}
            </p>
          ) : null}
        </div>
      ) : null}

      {aim === "role" && tailoredRole ? (
        <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm" data-testid="guided-role">
          <Target className="h-4 w-4 text-teal-700" aria-hidden="true" />
          {tailoredRole.title}
          {tailoredRole.department ? <span className="text-xs text-muted-foreground">· {tailoredRole.department}</span> : null}
        </div>
      ) : null}

      {aim === "general" ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="g-role">The kind of job you want (optional)</Label>
            <Input id="g-role" value={title} onChange={(e) => onTitle(e.target.value)} placeholder="e.g. Warehouse supervisor" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="g-area">Career area (optional)</Label>
            <Input id="g-area" value={area} onChange={(e) => onArea(e.target.value)} placeholder="e.g. Logistics" />
          </div>
        </div>
      ) : null}

      {styles.length ? (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">More options: how bullets are written</summary>
          <div className="mt-2 space-y-1">
            {styles.map((s) => (
              <label key={s.id} className="flex items-start gap-2 text-sm">
                <input type="radio" name="g-style" checked={s.id === styleId} onChange={() => onStyle(s.id)} />
                <span>
                  {s.name} <span className="text-xs text-muted-foreground">— {s.structure}</span>
                </span>
              </label>
            ))}
          </div>
        </details>
      ) : null}

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" data-testid="guided-cost">
        Writing a draft uses 1 of your {left} draft{left === 1 ? "" : "s"} left today (of {limit}). The questions and the
        assistant&apos;s answers are free.
      </p>
    </div>
  )
}
