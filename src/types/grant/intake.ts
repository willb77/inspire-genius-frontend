// GRANT vertical — Aid Intake contract (branching interview).
//
// Mirrors the backend IntakeProfile in
// services/agent-engine/app/tools/grant/intake.py — the five REQUIRED_TO_SEARCH
// trigger fields, the universal-core enrichment, the Sec 1.8 screener, and the
// per-population module questions (Sec 2–3). Enum string values must stay in
// sync with the Python enums (models.py / aid_profile.py); the UI shows friendly
// labels but persists these values.
//
// The form is intentionally FLAT (simple RHF); `toIntakePayload` reshapes it
// into the backend's nested { screener, modules, tool_inputs } shape + the
// top-level search-driving mirrors on save. The legacy flat 11-field payload is
// a strict subset, so old saves round-trip unchanged.

import { z } from "zod"

// ── Enums (values must match the Python enums) ───────────────────────────────

export const ENROLLMENT_STATUS = ["prospective", "enrolled", "transferring", "returning_adult"] as const
export const INSTITUTION_TYPE = ["community_college", "four_year", "trade_vocational", "grad"] as const
export const INCOME_RANGE = ["under_30k", "30k_60k", "60k_100k", "100k_150k", "over_150k"] as const
export const FAFSA_STATUS = ["not_started", "in_progress", "submitted"] as const

export const CITIZENSHIP_STATUS = [
  "us_citizen", "permanent_resident", "eligible_noncitizen", "refugee_asylee",
  "daca", "undocumented", "international",
] as const
export const DEPENDENCY_STATUS = ["dependent", "independent", "unknown"] as const
export const CREDENTIAL_SOUGHT = [
  "certificate", "license", "associate", "bachelor", "master", "doctoral", "vocational",
] as const
export const MILITARY_AFFILIATION = [
  "self_active", "self_veteran", "self_reserve_guard", "spouse", "dependent_child", "survivor",
] as const
export const JUSTICE_STATUS = ["incarcerated", "parole_probation", "released"] as const
export const DISABILITY_CATEGORY = ["physical", "sensory", "learning", "mental_health", "chronic_illness"] as const
export const GI_BILL_CHAPTER = ["ch33", "ch30", "ch1606", "ch35"] as const

export type EnrollmentStatusValue = (typeof ENROLLMENT_STATUS)[number]
export type InstitutionTypeValue = (typeof INSTITUTION_TYPE)[number]
export type IncomeRangeValue = (typeof INCOME_RANGE)[number]
export type FafsaStatusValue = (typeof FAFSA_STATUS)[number]

/** Income bands that flag a profile as need-based (mirrors NEED_BASED_BANDS). */
export const NEED_BASED_BANDS: readonly IncomeRangeValue[] = ["under_30k", "30k_60k", "60k_100k"]

// ── Screener flags (Sec 1.8) — each gates a population module ─────────────────

export const SCREENER_FLAGS = [
  "military", "justice", "disability", "returning_adult", "first_time",
  "foster_care", "undocumented_daca", "homeless", "caregiver", "field_specific", "tribal",
] as const
export type ScreenerFlag = (typeof SCREENER_FLAGS)[number]

/** Screener flag → backend module id it activates (Sec 5 routing). */
export const SCREENER_ROUTING: Record<ScreenerFlag, string> = {
  military: "military",
  justice: "justice",
  disability: "disability",
  returning_adult: "adult",
  first_time: "first_time",
  foster_care: "foster",
  undocumented_daca: "undocumented",
  homeless: "homeless",
  caregiver: "caregiver",
  field_specific: "field",
  tribal: "tribal",
}

// ── Zod schema (flat form shape) ─────────────────────────────────────────────

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

  // universal-core enrichment (optional — sharpen ranking, never block search)
  intended_field: z.string().max(120).optional(),
  city_or_county: z.string().max(120).optional(),
  first_generation: z.boolean().optional(),
  gpa: z.number().min(0).max(5).optional(),
  household_size: z.number().int().min(1).max(20).optional(),
  fafsa_status: z.enum(FAFSA_STATUS).optional(),
  citizenship_status: z.enum(CITIZENSHIP_STATUS).optional(),
  dependency_status: z.enum(DEPENDENCY_STATUS).optional(),
  credential_sought: z.enum(CREDENTIAL_SOUGHT).optional(),

  // Sec 1.8 screener flags (each reveals a module)
  sc_military: z.boolean().optional(),
  sc_justice: z.boolean().optional(),
  sc_disability: z.boolean().optional(),
  sc_returning_adult: z.boolean().optional(),
  sc_first_time: z.boolean().optional(),
  sc_foster_care: z.boolean().optional(),
  sc_undocumented_daca: z.boolean().optional(),
  sc_homeless: z.boolean().optional(),
  sc_caregiver: z.boolean().optional(),
  sc_field_specific: z.boolean().optional(),
  sc_tribal: z.boolean().optional(),

  // Sec 2.3 military module
  m_mil_affiliation: z.enum(MILITARY_AFFILIATION).optional(),
  m_mil_gi_bill: z.enum(GI_BILL_CHAPTER).optional(),
  m_mil_rating: z.number().int().min(0).max(100).optional(),
  m_mil_yellow_ribbon: z.boolean().optional(),
  // Sec 2.4 justice module
  m_jus_status: z.enum(JUSTICE_STATUS).optional(),
  m_jus_reentry: z.boolean().optional(),
  // Sec 2.5 disability module
  m_dis_categories: z.array(z.enum(DISABILITY_CATEGORY)).optional(),
  m_dis_vr_client: z.boolean().optional(),
  // Sec 2.2 adult module
  m_adl_employer_benefit: z.boolean().optional(),
  m_adl_dislocated: z.boolean().optional(),
  m_adl_wioa: z.boolean().optional(),
  // Sec 2.1 first-time module
  m_ft_hs_grad_year: z.number().int().min(1980).max(2100).optional(),
  m_ft_access_programs: z.boolean().optional(),
  // Sec 3.1 foster / 3.2 undocumented / 3.3 homeless / 3.4 caregiver / 3.6 tribal
  m_fos_chafee: z.boolean().optional(),
  m_und_has_ssn: z.boolean().optional(),
  m_hom_emergency: z.boolean().optional(),
  m_car_childcare: z.boolean().optional(),
  m_trb_tribe: z.string().max(120).optional(),
  // Sec 3.5 field module
  m_fld_teaching: z.boolean().optional(),
  m_fld_nursing: z.boolean().optional(),
  m_fld_stem: z.boolean().optional(),
  m_fld_public_service: z.boolean().optional(),
})

/** The full aid-intake profile the UI collects. */
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

const isPresent = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)

/** True once all five trigger fields are present (mirrors ready_to_search). */
export function readyToSearch(profile: PartialAidIntake): boolean {
  return TRIGGER_FIELDS.every((f) => isPresent(profile[f]))
}

/** How many of the five trigger fields are answered (for the progress bar). */
export function triggerProgress(profile: PartialAidIntake): number {
  return TRIGGER_FIELDS.filter((f) => isPresent(profile[f])).length
}

// ── Active-module routing (Sec 5) ────────────────────────────────────────────

/** The screener → sc_* form field for each flag. */
const SCREENER_FIELD: Record<ScreenerFlag, keyof AidIntakeProfile> = {
  military: "sc_military",
  justice: "sc_justice",
  disability: "sc_disability",
  returning_adult: "sc_returning_adult",
  first_time: "sc_first_time",
  foster_care: "sc_foster_care",
  undocumented_daca: "sc_undocumented_daca",
  homeless: "sc_homeless",
  caregiver: "sc_caregiver",
  field_specific: "sc_field_specific",
  tribal: "sc_tribal",
}

/** Which module ids are active given the screener answers (mirrors Sec 5). */
export function activeModuleIds(profile: PartialAidIntake): string[] {
  return SCREENER_FLAGS.filter((flag) => profile[SCREENER_FIELD[flag]] === true).map(
    (flag) => SCREENER_ROUTING[flag],
  )
}

// ── Payload mapper (flat form → nested backend IntakeProfile) ─────────────────

function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out as Partial<T>
}

/**
 * Reshape the flat form values into the backend IntakeProfile payload:
 * universal-core fields verbatim, a nested `screener` object, per-population
 * `modules`, and the top-level search-driving mirrors (military_affiliation,
 * justice_status, disability_categories, returning_adult, foster_care …) the
 * scholarship filters read. Empty answers are dropped so a PATCH only writes
 * what was actually answered.
 */
export function toIntakePayload(v: PartialAidIntake): Record<string, unknown> {
  const core = omitEmpty({
    student_age: v.student_age,
    enrollment_status: v.enrollment_status,
    state_of_residence: v.state_of_residence,
    institution_type: v.institution_type,
    household_income_range: v.household_income_range,
    intended_field: v.intended_field,
    city_or_county: v.city_or_county,
    first_generation: v.first_generation,
    gpa: v.gpa,
    household_size: v.household_size,
    fafsa_status: v.fafsa_status,
    citizenship_status: v.citizenship_status,
    dependency_status: v.dependency_status,
    credential_sought: v.credential_sought,
  })

  // top-level search-driving mirrors
  const mirrors = omitEmpty({
    military_affiliation: v.m_mil_affiliation,
    justice_status: v.m_jus_status,
    disability_categories: v.m_dis_categories,
    returning_adult: v.sc_returning_adult || undefined,
    foster_care: v.sc_foster_care || undefined,
    undocumented_daca: v.sc_undocumented_daca || undefined,
    homeless_status: v.sc_homeless || undefined,
    caregiver: v.sc_caregiver || undefined,
    tribal_enrollment: v.sc_tribal || undefined,
  })

  const screener = omitEmpty({
    military: v.sc_military,
    justice: v.sc_justice,
    disability: v.sc_disability,
    returning_adult: v.sc_returning_adult,
    first_time: v.sc_first_time,
    foster_care: v.sc_foster_care,
    undocumented_daca: v.sc_undocumented_daca,
    homeless: v.sc_homeless,
    caregiver: v.sc_caregiver,
    field_specific: v.sc_field_specific,
    tribal: v.sc_tribal,
  })

  const moduleDefs: Record<string, Record<string, unknown>> = {
    military: {
      military_affiliation: v.m_mil_affiliation,
      gi_bill_chapter: v.m_mil_gi_bill,
      service_connected_rating: v.m_mil_rating,
      yellow_ribbon: v.m_mil_yellow_ribbon,
    },
    justice: { justice_status: v.m_jus_status, reentry_program: v.m_jus_reentry },
    disability: { disability_categories: v.m_dis_categories, vr_client: v.m_dis_vr_client },
    adult: {
      employer_tuition_benefit: v.m_adl_employer_benefit,
      dislocated_worker: v.m_adl_dislocated,
      wioa_status: v.m_adl_wioa,
    },
    first_time: { hs_grad_year: v.m_ft_hs_grad_year, access_programs: v.m_ft_access_programs },
    foster: { foster_care: v.sc_foster_care || undefined, chafee_etv: v.m_fos_chafee },
    undocumented: { has_ssn_work_auth: v.m_und_has_ssn },
    homeless: { homeless_status: v.sc_homeless || undefined, emergency_need: v.m_hom_emergency },
    caregiver: { childcare_need: v.m_car_childcare },
    field: {
      teaching: v.m_fld_teaching,
      nursing_health: v.m_fld_nursing,
      stem: v.m_fld_stem,
      public_service: v.m_fld_public_service,
    },
    tribal: { tribal_enrollment: v.sc_tribal || undefined, tribe: v.m_trb_tribe },
  }

  const modules: Record<string, Record<string, unknown>> = {}
  for (const [id, payload] of Object.entries(moduleDefs)) {
    const cleaned = omitEmpty(payload)
    if (Object.keys(cleaned).length > 0) modules[id] = cleaned
  }

  const out: Record<string, unknown> = { ...core, ...mirrors }
  if (Object.keys(screener).length > 0) out.screener = screener
  if (Object.keys(modules).length > 0) out.modules = modules
  return out
}

/** The nested payload shape the backend persists/returns. */
export type AidIntakePayload = Record<string, unknown>

/**
 * Reverse of `toIntakePayload`: rebuild the flat form values from the nested
 * backend IntakeProfile (so an existing profile repopulates the flow on reload).
 * Reads the universal-core fields verbatim, the `screener` object into sc_*
 * flags, and the `modules` object into m_* fields.
 */
export function fromIntakePayload(payload: AidIntakePayload): PartialAidIntake {
  if (!payload || typeof payload !== "object") return {}
  const p = payload as Record<string, unknown>
  const out: Record<string, unknown> = {}

  const CORE = [
    "student_age", "enrollment_status", "state_of_residence", "institution_type",
    "household_income_range", "intended_field", "city_or_county", "first_generation",
    "gpa", "household_size", "fafsa_status", "citizenship_status", "dependency_status",
    "credential_sought",
  ]
  for (const k of CORE) if (p[k] !== undefined) out[k] = p[k]

  const screener = (p.screener as Record<string, unknown>) ?? {}
  for (const flag of SCREENER_FLAGS) {
    if (screener[flag] !== undefined) out[SCREENER_FIELD[flag]] = screener[flag]
  }
  // top-level mirror booleans also imply their screener flag
  const mirrorFlag: Record<string, ScreenerFlag> = {
    returning_adult: "returning_adult", foster_care: "foster_care", caregiver: "caregiver",
    tribal_enrollment: "tribal", undocumented_daca: "undocumented_daca", homeless_status: "homeless",
  }
  for (const [key, flag] of Object.entries(mirrorFlag)) {
    if (p[key] === true && out[SCREENER_FIELD[flag]] === undefined) out[SCREENER_FIELD[flag]] = true
  }

  const modules = (p.modules as Record<string, Record<string, unknown>>) ?? {}
  const m = (id: string) => modules[id] ?? {}
  const set = (field: keyof AidIntakeProfile, val: unknown) => {
    if (val !== undefined && val !== null && val !== "") out[field] = val
  }
  set("m_mil_affiliation", m("military").military_affiliation ?? p.military_affiliation)
  set("m_mil_gi_bill", m("military").gi_bill_chapter)
  set("m_mil_rating", m("military").service_connected_rating)
  set("m_mil_yellow_ribbon", m("military").yellow_ribbon)
  set("m_jus_status", m("justice").justice_status ?? p.justice_status)
  set("m_jus_reentry", m("justice").reentry_program)
  set("m_dis_categories", m("disability").disability_categories ?? p.disability_categories)
  set("m_dis_vr_client", m("disability").vr_client)
  set("m_adl_employer_benefit", m("adult").employer_tuition_benefit)
  set("m_adl_dislocated", m("adult").dislocated_worker)
  set("m_adl_wioa", m("adult").wioa_status)
  set("m_ft_hs_grad_year", m("first_time").hs_grad_year)
  set("m_ft_access_programs", m("first_time").access_programs)
  set("m_fos_chafee", m("foster").chafee_etv)
  set("m_und_has_ssn", m("undocumented").has_ssn_work_auth)
  set("m_hom_emergency", m("homeless").emergency_need)
  set("m_car_childcare", m("caregiver").childcare_need)
  set("m_trb_tribe", m("tribal").tribe)
  set("m_fld_teaching", m("field").teaching)
  set("m_fld_nursing", m("field").nursing_health)
  set("m_fld_stem", m("field").stem)
  set("m_fld_public_service", m("field").public_service)

  return out as PartialAidIntake
}
