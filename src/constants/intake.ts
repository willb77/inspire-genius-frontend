import { ROUTES } from "@/constants/routes"
import type { IntakeRole, SegmentContext, SegmentStatus } from "@/types/intake"

/**
 * Intake — labels and the saved views the left menu opens.
 *
 * The four saved views (HR, Recruiters, Companies, Coaches) open the Reports
 * tab (IN-7) pre-filtered by how people describe themselves on the public
 * form. They are links with a query string, so the URL is the filter: the page
 * reads it, and a bookmark or a shared link opens the same view. The
 * Registrations tab reads the same `role` / `segment_context` keys, so
 * switching to it from a preset shows the same people as a list.
 */

export const ROLE_LABELS: Record<IntakeRole, string> = {
  practitioner: "Practitioner",
  distributor: "Distributor",
  career_coach: "Career coach",
  education_coach: "Education coach",
  mentor: "Mentor",
  hr: "HR",
  recruiter: "Recruiter",
  company: "Company",
  other: "Other",
}

export const SEGMENT_STATUS_LABELS: Record<SegmentStatus, string> = {
  inspiresgenius: "InspiresGenius",
  non_inspiresgenius: "Non-InspiresGenius",
}

export const SEGMENT_CONTEXT_LABELS: Record<SegmentContext, string> = {
  individual: "Individual",
  company: "Company",
  education: "Education",
  other: "Other",
}

export type IntakePresetKey = "hr" | "recruiters" | "companies" | "coaches"

export type IntakePreset = {
  key: IntakePresetKey
  label: string
  role?: IntakeRole[]
  segment_context?: SegmentContext
}

/** The menu's saved views. Order is the menu's order. */
export const INTAKE_PRESETS: readonly IntakePreset[] = [
  { key: "hr", label: "HR", role: ["hr"] },
  { key: "recruiters", label: "Recruiters", role: ["recruiter"] },
  { key: "companies", label: "Companies", segment_context: "company" },
  { key: "coaches", label: "Coaches", role: ["career_coach", "education_coach"] },
]

/** `/super-admin/intake?tab=reports&role=hr` — the Reports tab, pre-filtered. */
export function intakePresetHref(preset: IntakePreset): string {
  const p = new URLSearchParams()
  p.set("tab", "reports")
  for (const role of preset.role ?? []) p.append("role", role)
  if (preset.segment_context) p.set("segment_context", preset.segment_context)
  return `${ROUTES.SUPER_ADMIN.INTAKE}?${p.toString()}`
}
