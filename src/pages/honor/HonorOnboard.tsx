import { useState } from "react"
import { toast } from "sonner"
import { UserPlus, Upload, FileText } from "lucide-react"
import { HonorCard, HonorPageHeader, HonorSectionTitle } from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY } from "./_format"

/**
 * Honor Coach Workbench — Onboard a Team.
 *
 * Wiring target (net-new `roster_import.py` + user/invitation services):
 *   - form fields → `users` / `user_profiles`
 *   - résumé + bio → `documents` (S3 + pgvector RAG for Aura & Nova)
 *   - PRISM / DISC / CliftonStrengths → `prism_results` / `external_assessments`
 *   - creates a `coach_member_assignments` row; invite via invitation-service (SES magic-link)
 * Bulk CSV import reuses the coach roster CSV mapping flow. Phase-0 scaffold: the
 * submit handlers are stubs that toast the intended backend effect.
 */

type Framework = "PRISM" | "DISC" | "CliftonStrengths" | "None yet"

export default function HonorOnboard() {
  const [framework, setFramework] = useState<Framework>("PRISM")
  const [resumeName, setResumeName] = useState<string | null>(null)

  function onAdd(e: React.FormEvent) {
    e.preventDefault()
    toast.success("Fellow added to roster — coach_member_assignments row created (scaffold stub)")
  }

  const resultPlaceholder: Record<Framework, string> = {
    PRISM: "e.g. Gold-Green dominant",
    DISC: "e.g. DC",
    CliftonStrengths: "e.g. Achiever, Discipline, Focus",
    "None yet": "Queued for intake",
  }

  return (
    <div>
      <HonorPageHeader
        icon={UserPlus}
        title="Onboard a Team"
        description="Add a single Honor fellow or import a whole cohort. New members are invited via a secure magic link."
      />

      {/* Add a fellow */}
      <HonorCard className="mb-6">
        <HonorSectionTitle>Add a fellow</HonorSectionTitle>
        <form onSubmit={onAdd} className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <input required className={inputCls} placeholder="Marcus" />
          </Field>
          <Field label="Last name" required>
            <input required className={inputCls} placeholder="Reyes" />
          </Field>
          <Field label="Email" required hint="A magic-link intake invite is sent here.">
            <input required type="email" className={inputCls} placeholder="marcus.reyes@honor.org" />
          </Field>
          <Field label="Prior service background">
            <input className={inputCls} placeholder="e.g. Naval Special Warfare" />
          </Field>
          <Field label="Target career">
            <input className={inputCls} placeholder="e.g. Program Management" />
          </Field>
          <Field label="Behavioral assessment framework">
            <select
              className={inputCls}
              value={framework}
              onChange={(e) => setFramework(e.target.value as Framework)}
            >
              <option value="PRISM">PRISM (source of truth)</option>
              <option value="DISC">DISC</option>
              <option value="CliftonStrengths">CliftonStrengths</option>
              <option value="None yet">None yet — queue for intake</option>
            </select>
          </Field>

          <Field label="Résumé (PDF / DOCX)">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#c6cdd9] bg-[#f6f7f9] px-3 py-2.5 text-sm text-[#5b6678] hover:border-[#E8792B]">
              <Upload className="h-4 w-4" />
              {resumeName ?? "Drag & drop or browse"}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </Field>
          <Field label={framework === "None yet" ? "Assessment status" : "Result value"}>
            <input className={inputCls} placeholder={resultPlaceholder[framework]} disabled={framework === "None yet"} />
          </Field>

          <Field label="Bio / narrative" full>
            <textarea
              className={`${inputCls} min-h-[90px] resize-y`}
              placeholder="Short mission narrative — feeds the RAG context for Aura & Nova."
            />
          </Field>

          <div className="flex items-center gap-2 sm:col-span-2">
            <button type="submit" className={HONOR_BTN_PRIMARY}>
              <UserPlus className="h-4 w-4" /> Add to my roster
            </button>
            <button type="button" className={HONOR_BTN_OUTLINE}>
              Save &amp; add another
            </button>
          </div>
        </form>
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
                Upload a roster; columns are auto-mapped and deduplicated, then each fellow is queued
                for PRISM intake.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={HONOR_BTN_OUTLINE}
            onClick={() => toast.info("CSV import — column mapping + dedupe (scaffold stub)")}
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
