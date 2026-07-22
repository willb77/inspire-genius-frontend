import { useRef, useState } from "react"
import { toast } from "sonner"
import { UserPlus, Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import { HonorCard, HonorPageHeader, HonorSectionTitle } from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY } from "./_format"
import { FileDrop } from "./_FileDrop"
import { useHonorOnboard, type OptionalFrameworkKey } from "@/hooks/honor/useHonorOnboard"
import { HONOR_FRAMEWORK_LABELS } from "@/services/honor/assessment.service"
import { useCohorts } from "@/hooks/honor/useHonorAdmin"
import { HONOR_CAREER_AREAS } from "./_careerAreas"

/** File types accepted for the résumé / Bio / Additional-Information uploads. */
const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx"

/** Map a failed step's error detail to a short, actionable fix hint. */
function fixHint(detail?: string): string | null {
  if (!detail) return null
  if (/\b404\b|not found/i.test(detail))
    return "The fellow id changed after invite — retry the import."
  if (/\b409\b|already/i.test(detail))
    return "This file was already imported for this fellow."
  if (/\b422\b|unprocessable|format/i.test(detail))
    return "File format not recognized — export a supported PRISM/framework file."
  if (/\b403\b|forbidden|access/i.test(detail))
    return "You don't have access to this fellow."
  return null
}

/**
 * Honor Coach Workbench — Onboard a Fellow (wired to the IG Core process).
 *
 * The submit handler runs {@link useHonorOnboard}: create → invite → import the
 * mandatory PRISM CSV + any optional framework reports (DiSC / CliftonStrengths /
 * Big Five / MBTI / Hogan) into the shipped `assessments`/`assessment_scores`
 * platform (subject = the member), then push résumé/bio into the document RAG.
 * No new backend tables — every write reuses an existing Core endpoint.
 */

const OPTIONAL_FRAMEWORKS: OptionalFrameworkKey[] = [
  "DISC",
  "CLIFTON",
]

const IG_ROLES = ["Fellow", "Coach", "Manager", "Company Admin"] as const

export default function HonorOnboard() {
  const onboard = useHonorOnboard()
  // Live cohorts + career areas power the pickers; both fall back to free text
  // (a <datalist>) so a coach can still type anything, and nothing breaks if the
  // super-admin-gated cohorts query is unavailable for this user.
  const { data: cohorts = [] } = useCohorts()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<string>("Fellow")
  const [background, setBackground] = useState("")
  const [target, setTarget] = useState("")
  const [cohort, setCohort] = useState("")
  const [bio, setBio] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [goals, setGoals] = useState("")
  const [sendInvitation, setSendInvitation] = useState(true)

  const [prismFile, setPrismFile] = useState<File | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [bioFile, setBioFile] = useState<File | null>(null)
  const [additionalInfoFile, setAdditionalInfoFile] = useState<File | null>(null)
  const [goalsFile, setGoalsFile] = useState<File | null>(null)
  const [frameworkFiles, setFrameworkFiles] = useState<
    Partial<Record<OptionalFrameworkKey, File>>
  >({})

  /** Missing required fields surfaced inline on a blocked submit. */
  const [missing, setMissing] = useState<string[]>([])

  const formRef = useRef<HTMLFormElement>(null)

  function reset() {
    setFirstName("")
    setLastName("")
    setEmail("")
    setRole("Fellow")
    setBackground("")
    setTarget("")
    setCohort("")
    setBio("")
    setAdditionalInfo("")
    setGoals("")
    setPrismFile(null)
    setResumeFile(null)
    setBioFile(null)
    setAdditionalInfoFile(null)
    setGoalsFile(null)
    setFrameworkFiles({})
    setMissing([])
    formRef.current?.reset()
  }

  /** Full pre-submit check — returns the human labels of every missing requirement. */
  function requiredMissing(): string[] {
    const out: string[] = []
    if (!firstName.trim()) out.push("First name")
    if (!lastName.trim()) out.push("Last name")
    if (!email.trim()) out.push("Email")
    if (!role.trim()) out.push("Role")
    if (!prismFile) out.push("PRISM assessment file")
    return out
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Block the mutation until every required field is present; list exactly
    // what's missing inline rather than firing partial requests.
    const gaps = requiredMissing()
    if (gaps.length > 0) {
      setMissing(gaps)
      toast.error("Some required details are missing — see the list below.")
      return
    }
    setMissing([])
    await onboard.mutateAsync({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      role,
      background: background.trim() || undefined,
      target: target.trim() || undefined,
      cohort: cohort.trim() || undefined,
      prismFile: prismFile as File,
      frameworkFiles,
      resumeFile,
      bio: bio.trim() || undefined,
      additionalInfo: additionalInfo.trim() || undefined,
      goals: goals.trim() || undefined,
      bioFile,
      additionalInfoFile,
      goalsFile,
      sendInvitation,
    })
  }

  const busy = onboard.isPending
  const result = onboard.data

  return (
    <div>
      <HonorPageHeader
        icon={UserPlus}
        title="Onboard a Fellow"
        description="Add a single Honor fellow. Their PRISM export and any behavioral reports feed the same personalization platform the whole app reads; résumé & bio ride the document RAG. New fellows are invited via a secure magic link."
      />

      {/* Add a member */}
      <HonorCard className="mb-6">
        <HonorSectionTitle>Fellow details</HonorSectionTitle>
        <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <input required className={inputCls} placeholder="Marcus" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Last name" required>
            <input required className={inputCls} placeholder="Reyes" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
          <Field label="Email" required hint="A magic-link intake invite is sent here.">
            <input required type="email" className={inputCls} placeholder="marcus.reyes@honor.org" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Role" required hint="Provisioned on invite.">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {IG_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Prior service background">
            <input className={inputCls} placeholder="e.g. Naval Special Warfare" value={background} onChange={(e) => setBackground(e.target.value)} />
          </Field>
          <Field label="Target career" hint="Pick a career area or type your own.">
            <input
              className={inputCls}
              list="honor-onboard-career-areas"
              placeholder="e.g. Program & Operations Management"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <datalist id="honor-onboard-career-areas">
              {HONOR_CAREER_AREAS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Field>
          <Field label="Cohort" hint="Choose an existing cohort or type a new one.">
            <input
              className={inputCls}
              list="honor-onboard-cohorts"
              placeholder="e.g. Cohort 2026-A"
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
            />
            <datalist id="honor-onboard-cohorts">
              {cohorts.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </Field>

          {/* Mandatory PRISM */}
          <Field label="PRISM assessment (CSV)" required full hint="Source of truth — parsed into the member's structured scores.">
            <FileDrop
              accept=".csv,.xlsx,.pdf"
              file={prismFile}
              onFile={setPrismFile}
              placeholder="Drop the PRISM export (CSV / XLSX / PDF) or click to browse"
            />
          </Field>

          {/* Optional behavioral frameworks */}
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-semibold text-[#18202f]">
              Additional behavioral assessments <span className="font-normal text-[#9299a6]">(optional)</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {OPTIONAL_FRAMEWORKS.map((fw) => (
                <Field key={fw} label={HONOR_FRAMEWORK_LABELS[fw]}>
                  <FileDrop
                    accept=".csv,.xlsx,.pdf,.doc,.docx"
                    file={frameworkFiles[fw] ?? null}
                    onFile={(f) => setFrameworkFiles((prev) => ({ ...prev, [fw]: f ?? undefined }))}
                    placeholder="Drop report or browse"
                    compact
                  />
                </Field>
              ))}
            </div>
          </div>

          {/* Résumé — drag-and-drop or browse */}
          <Field label="Résumé (PDF / DOC / XLS)" hint="Drag-and-drop or click to browse.">
            <FileDrop
              accept={DOC_ACCEPT}
              file={resumeFile}
              onFile={setResumeFile}
              placeholder="Drop résumé or browse"
            />
          </Field>

          {/* Bio — text OR file upload */}
          <Field label="Bio / narrative" hint="Type a narrative, upload a file, or both — feeds Aura & Nova via RAG.">
            <textarea className={`${inputCls} min-h-[80px] resize-y`} placeholder="Short mission narrative — feeds Aura & Nova via RAG." value={bio} onChange={(e) => setBio(e.target.value)} />
            <FileDrop
              accept={DOC_ACCEPT}
              file={bioFile}
              onFile={setBioFile}
              placeholder="…or drop a Bio file (PDF / DOC / XLS) or browse"
              compact
            />
          </Field>

          {/* Additional information — text OR file upload */}
          <Field label="Additional information" full hint="Anything else the coaching agents should know — type it or upload a file (stored with the bio in RAG).">
            <textarea className={`${inputCls} min-h-[70px] resize-y`} placeholder="Anything else the coaching agents should know (stored with the bio in RAG)." value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} />
            <FileDrop
              accept={DOC_ACCEPT}
              file={additionalInfoFile}
              onFile={setAdditionalInfoFile}
              placeholder="…or drop an Additional-Information file (PDF / DOC / XLS) or browse"
              compact
            />
          </Field>

          {/* Goals & objectives — text OR file upload */}
          <Field label="Goals & objectives" full hint="What is this fellow working toward? Type it, upload a file, or both — the coaching agents score goals against the behavioral profile.">
            <textarea className={`${inputCls} min-h-[70px] resize-y`} placeholder="e.g. Move into an operations program-management role within 12 months." value={goals} onChange={(e) => setGoals(e.target.value)} />
            <FileDrop
              accept={DOC_ACCEPT}
              file={goalsFile}
              onFile={setGoalsFile}
              placeholder="…or drop a Goals file (PDF / DOC / XLS) or browse"
              compact
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151] sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#c6cdd9] accent-[#E8792B]"
              checked={sendInvitation}
              onChange={(e) => setSendInvitation(e.target.checked)}
            />
            <span>
              Send the magic-link invitation email now
              <span className="text-[#9299a6]"> — uncheck to create the account without notifying; you can send it later from My Fellows.</span>
            </span>
          </label>

          {missing.length > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-[#f0c39a] bg-[#fdf4ec] p-3 sm:col-span-2"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-[#a2531a]">
                <AlertTriangle className="h-4 w-4" />
                Please complete these required fields before onboarding:
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-8 text-sm text-[#8a4a1a]">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 sm:col-span-2">
            <button type="submit" className={HONOR_BTN_PRIMARY} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {busy ? "Onboarding…" : "Add to my roster"}
            </button>
            <button type="button" className={HONOR_BTN_OUTLINE} disabled={busy} onClick={reset}>
              Clear form
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-4 rounded-lg border border-[#e3e7ee] bg-[#f8fafc] p-3">
            <p className="mb-2 text-sm font-semibold text-[#18202f]">Onboarding results</p>
            <ul className="space-y-2">
              {result.steps.map((s) => {
                const hint = s.ok ? null : fixHint(s.detail)
                return (
                  <li key={s.step} className="text-sm">
                    <div className="flex items-start gap-2">
                      {s.ok ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1a9e5f]" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c0472b]" />
                      )}
                      <div>
                        <span className="font-medium capitalize">{s.step.replace(/-/g, " ")}</span>
                        <span className={s.ok ? "text-[#1a9e5f]" : "text-[#c0472b]"}>
                          {" "}
                          {s.ok ? "succeeded" : "failed"}
                        </span>
                        {s.detail && <span className="text-[#5b6678]"> — {s.detail}</span>}
                        {!s.ok && hint && (
                          <p className="mt-0.5 text-xs text-[#a2531a]">How to fix: {hint}</p>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </HonorCard>

      {/* Bulk import */}
      <HonorCard>
        <HonorSectionTitle>Import a cohort</HonorSectionTitle>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "rgba(232,121,43,0.12)" }}>
              <FileText className="h-5 w-5 text-[#c9631a]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#18202f]">Bulk cohort import (CSV)</p>
              <p className="text-sm text-[#5b6678]">
                Upload a roster; columns are auto-mapped and deduplicated. Each fellow is created and
                queued for PRISM intake — invite + per-member assessment import happen from the roster.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={HONOR_BTN_OUTLINE}
            onClick={() => toast.info("Bulk CSV import is available from the Caseload → Import CSV action.")}
          >
            <Upload className="h-4 w-4" /> Import CSV roster
          </button>
        </div>
      </HonorCard>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"

function Field({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label className="block text-sm font-medium text-[#374151]">
        {label}
        {required && <span className="ml-0.5 text-[#c0472b]">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#9299a6]">{hint}</p>}
    </div>
  )
}
