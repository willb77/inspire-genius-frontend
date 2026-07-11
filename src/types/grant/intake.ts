// GRANT vertical — Aid Intake contract (UI-1).
//
// Mirrors the backend Targeted Search Module (§5) contract in
// services/agent-engine/app/tools/_shared/aid_profile.py 1:1 — the five
// REQUIRED_TO_SEARCH trigger fields plus the enrichment fields — so the
// interactive intake produces exactly what ig_student_profile_update stores
// and scholarship_search filters on. Keep the enum string values in sync with
// the Python enums; the UI shows friendly labels but persists these values.

import { z } from "zod"

// ── Enums (values must match aid_profile.py) ─────────────────────────────────

export const ENROLLMENT_STATUS = ["prospective", "enrolled", "transferring", "returning_adult"] as const
export const INSTITUTION_TYPE = ["community_college", "four_year", "trade_vocational", "grad"] as const
export const INCOME_RANGE = ["under_30k", "30k_60k", "60k_100k", "100k_150k", "over_150k"] as const
export const FAFSA_STATUS = ["not_started", "in_progress", "submitted"] as const

export type EnrollmentStatusValue = (typeof ENROLLMENT_STATUS)[number]
export type InstitutionTypeValue = (typeof INSTITUTION_TYPE)[number]
export type IncomeRangeValue = (typeof INCOME_RANGE)[number]
export type FafsaStatusValue = (typeof FAFSA_STATUS)[number]

/** Income bands that flag a profile as need-based (mirrors NEED_BASED_BANDS). */
export const NEED_BASED_BANDS: readonly IncomeRangeValue[] = ["under_30k", "30k_60k", "60k_100k"]

// ── Zod schema ───────────────────────────────────────────────────────────────

export const aidIntakeSchema = z.object({
  // minimum-viable trigger fields (REQUIRED_TO_SEARCH)
  student_age: z
    .number({ message: "Enter your age" })
    .int("Enter a whole number")
    .min(10, "Age looks too low")
    .max(100, "Age looks too high"),
  enrollment_status: z.enum(ENROLLMENT_STATUS, { message: "Pick your enrollment status" }),
  state_of_residence: z.string().min(2, "Choose your state"),
  institution_type: z.enum(INSTITUTION_TYPE, { message: "Pick the kind of school" }),
  household_income_range: z.enum(INCOME_RANGE, { message: "Pick your household income range" }),
  // enrichment fields (optional — sharpen ranking, never block search)
  intended_field: z.string().max(120).optional(),
  city_or_county: z.string().max(120).optional(),
  first_generation: z.boolean().optional(),
  gpa: z.number().min(0).max(5).optional(),
  household_size: z.number().int().min(1).max(20).optional(),
  fafsa_status: z.enum(FAFSA_STATUS).optional(),
})

/** The full aid-intake profile the UI collects and persists. */
export type AidIntakeProfile = z.infer<typeof aidIntakeSchema>

/** Partial profile held mid-flow before all fields are answered. */
export type PartialAidIntake = Partial<AidIntakeProfile>

// ── Trigger logic (mirrors ready_to_search) ──────────────────────────────────

/** The five fields that must be present before a first ranked search. */
export const TRIGGER_FIELDS = [
  "student_age",
  "enrollment_status",
  "state_of_residence",
  "institution_type",
  "household_income_range",
] as const satisfies readonly (keyof AidIntakeProfile)[]

export type TriggerField = (typeof TRIGGER_FIELDS)[number]

const isPresent = (v: unknown): boolean => v !== undefined && v !== null && v !== ""

/** True once all five trigger fields are present (mirrors ready_to_search). */
export function readyToSearch(profile: PartialAidIntake): boolean {
  return TRIGGER_FIELDS.every((f) => isPresent(profile[f]))
}

/** How many of the five trigger fields are answered (for the progress bar). */
export function triggerProgress(profile: PartialAidIntake): number {
  return TRIGGER_FIELDS.filter((f) => isPresent(profile[f])).length
}
