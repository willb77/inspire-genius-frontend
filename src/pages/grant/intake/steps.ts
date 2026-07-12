// GRANT — intake step descriptors (the externalized question bank).
//
// Each step maps one conversational question to one field on the AidIntakeProfile
// contract. Order: five "trigger" steps (unlock the ranked search) → universal
// "enrichment" → the Sec 1.8 "screener" (yes/no flags) → conditional "module"
// steps that appear only when their screener flag is Yes. This array + the enums
// in types/grant/intake.ts are the single source of truth the flow renders from
// (P2-A) — adding a question is a config edit, not a component change.

import type { AidIntakeProfile } from "@/types/grant/intake"
import {
  CITIZENSHIP_STATUS,
  CREDENTIAL_SOUGHT,
  DEPENDENCY_STATUS,
  DISABILITY_CATEGORY,
  ENROLLMENT_STATUS,
  FAFSA_STATUS,
  GI_BILL_CHAPTER,
  INCOME_RANGE,
  INSTITUTION_TYPE,
  JUSTICE_STATUS,
  MILITARY_AFFILIATION,
} from "@/types/grant/intake"

export type IntakePhase = "trigger" | "enrichment" | "screener" | "module"

export type Option = { value: string; label: string }

type BaseStep = {
  field: keyof AidIntakeProfile
  phase: IntakePhase
  /** Meridian-style question shown in the assistant bubble. */
  question: string
  /** Optional supporting line under the question. */
  helper?: string
  /** Module steps only: the sc_* screener field that must be true to show this. */
  gate?: keyof AidIntakeProfile
}

export type SelectStep = BaseStep & { kind: "select" | "state"; options: Option[] }
export type MultiSelectStep = BaseStep & { kind: "multiselect"; options: Option[] }
export type NumberStep = BaseStep & { kind: "number"; placeholder?: string; suffix?: string }
export type TextStep = BaseStep & { kind: "text"; placeholder?: string }
export type BoolStep = BaseStep & { kind: "bool" }

export type IntakeStep = SelectStep | MultiSelectStep | NumberStep | TextStep | BoolStep

const opt = (values: readonly string[], labels: string[]): Option[] =>
  values.map((value, i) => ({ value, label: labels[i] }))

// Enum-value → friendly label (persist the value, show the label).
const enrollmentOptions = opt(ENROLLMENT_STATUS, [
  "Planning to enroll", "Currently enrolled", "Transferring schools", "Returning adult learner",
])
const institutionOptions = opt(INSTITUTION_TYPE, [
  "Community college", "Four-year college / university", "Trade or vocational school", "Graduate school",
])
const incomeOptions = opt(INCOME_RANGE, [
  "Under $30,000", "$30,000 – $60,000", "$60,000 – $100,000", "$100,000 – $150,000", "Over $150,000",
])
const fafsaOptions = opt(FAFSA_STATUS, ["Not started", "In progress", "Submitted"])
const citizenshipOptions = opt(CITIZENSHIP_STATUS, [
  "U.S. citizen", "Permanent resident", "Eligible non-citizen", "Refugee / asylee",
  "DACA", "Undocumented", "International student",
])
const dependencyOptions = opt(DEPENDENCY_STATUS, ["Dependent", "Independent", "Not sure yet"])
const credentialOptions = opt(CREDENTIAL_SOUGHT, [
  "Certificate", "License", "Associate degree", "Bachelor's degree",
  "Master's degree", "Doctoral degree", "Vocational / trade",
])
const militaryAffiliationOptions = opt(MILITARY_AFFILIATION, [
  "My own — active duty", "My own — veteran", "My own — Reserve / National Guard",
  "A spouse's service", "A parent's service (I'm their child)", "Survivor / dependent benefits",
])
const giBillOptions = opt(GI_BILL_CHAPTER, [
  "Post-9/11 (Ch. 33)", "Montgomery (Ch. 30)", "Selected Reserve (Ch. 1606)", "Dependents (DEA Ch. 35)",
])
const justiceStatusOptions = opt(JUSTICE_STATUS, [
  "Currently incarcerated", "On parole or probation", "Released",
])
const disabilityCategoryOptions = opt(DISABILITY_CATEGORY, [
  "Physical", "Sensory (vision / hearing)", "Learning", "Mental health", "Chronic illness",
])

export const US_STATES: Option[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
].map(([value, label]) => ({ value, label }))

export const INTAKE_STEPS: IntakeStep[] = [
  // ── Trigger (required to search) ───────────────────────────────────────────
  {
    field: "student_age", phase: "trigger", kind: "number",
    question: "First — how old are you?",
    helper: "Age decides which awards you're eligible for. Under-18 awards are handled for you.",
    placeholder: "e.g. 17", suffix: "years",
  },
  {
    field: "enrollment_status", phase: "trigger", kind: "select",
    question: "Where are you in your education journey?", options: enrollmentOptions,
  },
  {
    field: "state_of_residence", phase: "trigger", kind: "state",
    question: "Which state do you live in?",
    helper: "Unlocks state-specific grants and scholarships.", options: US_STATES,
  },
  {
    field: "institution_type", phase: "trigger", kind: "select",
    question: "What kind of school are you headed to?", options: institutionOptions,
  },
  {
    field: "household_income_range", phase: "trigger", kind: "select",
    question: "Roughly, what's your household's yearly income?",
    helper: "Used only to match need-based aid — a range is all we need, and it's never shared.",
    options: incomeOptions,
  },

  // ── Enrichment (optional — sharpen matches) ────────────────────────────────
  {
    field: "citizenship_status", phase: "enrichment", kind: "select",
    question: "What's your citizenship or immigration status?",
    helper: "The biggest factor in which federal and state aid you can get — and we'll find awards for every status.",
    options: citizenshipOptions,
  },
  {
    field: "intended_field", phase: "enrichment", kind: "text",
    question: "What do you plan to study?",
    helper: "Opens up field-specific scholarships.", placeholder: "e.g. Nursing, Computer Science",
  },
  {
    field: "credential_sought", phase: "enrichment", kind: "select",
    question: "What credential are you going for?", options: credentialOptions,
  },
  {
    field: "first_generation", phase: "enrichment", kind: "bool",
    question: "Will you be the first in your family to attend college?",
    helper: "Many awards are set aside for first-generation students.",
  },
  {
    field: "dependency_status", phase: "enrichment", kind: "select",
    question: "For federal aid, are you a dependent or independent student?",
    helper: "Independent students often qualify for more need-based aid. Not sure? That's fine.",
    options: dependencyOptions,
  },
  {
    field: "city_or_county", phase: "enrichment", kind: "text",
    question: "Which city or county are you in?",
    helper: "Surfaces hyper-local awards from community foundations.", placeholder: "e.g. Alameda County",
  },
  {
    field: "gpa", phase: "enrichment", kind: "number",
    question: "What's your GPA?",
    helper: "Optional — average grades still qualify for the vast majority of aid.", placeholder: "e.g. 3.4",
  },
  {
    field: "household_size", phase: "enrichment", kind: "number",
    question: "How many people are in your household?", placeholder: "e.g. 4", suffix: "people",
  },
  {
    field: "fafsa_status", phase: "enrichment", kind: "select",
    question: "Have you started your FAFSA?",
    helper: "We'll tailor your next steps to where you are.", options: fafsaOptions,
  },

  // ── Screener (Sec 1.8 — each Yes reveals a module) ─────────────────────────
  {
    field: "sc_military", phase: "screener", kind: "bool",
    question: "Have you, a parent, or a spouse served in the military?",
    helper: "Military benefits are the richest source of education funding — worth a look.",
  },
  {
    field: "sc_returning_adult", phase: "screener", kind: "bool",
    question: "Are you an adult returning to school or changing careers?",
    helper: "Opens employer, workforce, and short-term-Pell funding.",
  },
  {
    field: "sc_disability", phase: "screener", kind: "bool",
    question: "Do you have a disability or ongoing health condition?",
    helper: "Can unlock state Vocational Rehab tuition funding and disability scholarships.",
  },
  {
    field: "sc_first_time", phase: "screener", kind: "bool",
    question: "Are you in high school or heading to college for the first time?",
  },
  {
    field: "sc_justice", phase: "screener", kind: "bool",
    question: "Have you ever been involved with the justice system?",
    helper: "Recent law changes restored broad aid access — most people are surprised they now qualify.",
  },
  {
    field: "sc_foster_care", phase: "screener", kind: "bool",
    question: "Were you ever in foster care or a ward of the court?",
  },
  {
    field: "sc_undocumented_daca", phase: "screener", kind: "bool",
    question: "Would you describe your immigration status as undocumented or DACA?",
  },
  {
    field: "sc_homeless", phase: "screener", kind: "bool",
    question: "In the last few years, have you lacked stable housing?",
  },
  {
    field: "sc_caregiver", phase: "screener", kind: "bool",
    question: "Are you a parent or primary caregiver?",
  },
  {
    field: "sc_field_specific", phase: "screener", kind: "bool",
    question: "Is your field nursing, teaching, STEM, or public service?",
  },
  {
    field: "sc_tribal", phase: "screener", kind: "bool",
    question: "Are you an enrolled member of a Tribe or of Native American / Alaska Native descent?",
  },

  // ── Modules (Sec 2–3 — shown only when the gate flag is Yes) ────────────────
  // Military (2.3)
  {
    field: "m_mil_affiliation", phase: "module", gate: "sc_military", kind: "select",
    question: "What's the military connection?",
    helper: "This decides whether you use your own benefits or transferred/dependent benefits.",
    options: militaryAffiliationOptions,
  },
  {
    field: "m_mil_gi_bill", phase: "module", gate: "sc_military", kind: "select",
    question: "Which GI Bill do you have?", options: giBillOptions,
  },
  {
    field: "m_mil_rating", phase: "module", gate: "sc_military", kind: "number",
    question: "Do you have a service-connected disability rating?",
    helper: "A rating can open VR&E (Ch. 31), which sometimes exceeds the GI Bill.", placeholder: "e.g. 30", suffix: "%",
  },
  {
    field: "m_mil_yellow_ribbon", phase: "module", gate: "sc_military", kind: "bool",
    question: "Is your school in the Yellow Ribbon program?",
  },
  // Adults returning (2.2)
  {
    field: "m_adl_employer_benefit", phase: "module", gate: "sc_returning_adult", kind: "bool",
    question: "Does your employer offer tuition assistance or reimbursement?",
    helper: "Often the single largest source for working adults.",
  },
  {
    field: "m_adl_dislocated", phase: "module", gate: "sc_returning_adult", kind: "bool",
    question: "Were you laid off, or is your industry declining?",
    helper: "Opens dislocated-worker (WIOA) and trade-adjustment funds.",
  },
  {
    field: "m_adl_wioa", phase: "module", gate: "sc_returning_adult", kind: "bool",
    question: "Have you visited an American Job Center or been assessed for WIOA?",
  },
  // Disability (2.5)
  {
    field: "m_dis_categories", phase: "module", gate: "sc_disability", kind: "multiselect",
    question: "What kind of disability or condition? (select all that apply)",
    options: disabilityCategoryOptions,
  },
  {
    field: "m_dis_vr_client", phase: "module", gate: "sc_disability", kind: "bool",
    question: "Are you a client of your state Vocational Rehabilitation agency?",
    helper: "VR can fund tuition, books, and assistive tech — a major, often-missed source.",
  },
  // First-time (2.1)
  {
    field: "m_ft_hs_grad_year", phase: "module", gate: "sc_first_time", kind: "number",
    question: "What year do you graduate high school (or complete your GED)?", placeholder: "e.g. 2027",
  },
  {
    field: "m_ft_access_programs", phase: "module", gate: "sc_first_time", kind: "bool",
    question: "Are you in TRIO, Upward Bound, or a college-access program?",
  },
  // Justice-involved (2.4)
  {
    field: "m_jus_status", phase: "module", gate: "sc_justice", kind: "select",
    question: "Where are you now?",
    helper: "The FAFSA drug-conviction bar was removed and Second Chance Pell is now permanent.",
    options: justiceStatusOptions,
  },
  {
    field: "m_jus_reentry", phase: "module", gate: "sc_justice", kind: "bool",
    question: "Are you in — or able to join — a prison-education or reentry program?",
  },
  // Foster youth (3.1)
  {
    field: "m_fos_chafee", phase: "module", gate: "sc_foster_care", kind: "bool",
    question: "Have you used the Chafee Education & Training Voucher (ETV)?",
    helper: "Up to ~$5,000/yr for former foster youth — plus many states waive tuition.",
  },
  // Undocumented / DACA (3.2)
  {
    field: "m_und_has_ssn", phase: "module", gate: "sc_undocumented_daca", kind: "bool",
    question: "Do you have a Social Security number and work authorization (DACA)?",
    helper: "Either way, we'll focus on state aid and scholarships that don't require citizenship.",
  },
  // Homeless / housing-insecure (3.3)
  {
    field: "m_hom_emergency", phase: "module", gate: "sc_homeless", kind: "bool",
    question: "Do you need emergency funds for basics right now?",
  },
  // Caregiver (3.4)
  {
    field: "m_car_childcare", phase: "module", gate: "sc_caregiver", kind: "bool",
    question: "Do you need childcare to attend?",
    helper: "Opens CCAMPIS campus childcare grants.",
  },
  // Field-specific (3.5)
  {
    field: "m_fld_teaching", phase: "module", gate: "sc_field_specific", kind: "bool",
    question: "Is your field teaching?", helper: "TEACH Grant + teacher-service forgiveness.",
  },
  {
    field: "m_fld_nursing", phase: "module", gate: "sc_field_specific", kind: "bool",
    question: "Is it nursing or healthcare?", helper: "Nurse Corps / HRSA scholarships + loan repayment.",
  },
  {
    field: "m_fld_stem", phase: "module", gate: "sc_field_specific", kind: "bool",
    question: "Is it STEM or defense-relevant?",
  },
  {
    field: "m_fld_public_service", phase: "module", gate: "sc_field_specific", kind: "bool",
    question: "Is it public service or government?", helper: "We'll flag PSLF early to shape any borrowing.",
  },
  // Tribal / Native (3.6)
  {
    field: "m_trb_tribe", phase: "module", gate: "sc_tribal", kind: "text",
    question: "Which Tribe are you enrolled in (or descended from)?",
    helper: "Unlocks Tribal higher-ed grants, BIE funding, and Native scholarships.", placeholder: "e.g. Navajo Nation",
  },
]

/** Human-readable answer for the transcript chips. */
export function labelForAnswer(step: IntakeStep, value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  if (step.kind === "bool") return value ? "Yes" : "No"
  if (step.kind === "multiselect") {
    const vals = Array.isArray(value) ? value : []
    if (vals.length === 0) return ""
    return vals.map((v) => step.options.find((o) => o.value === v)?.label ?? String(v)).join(", ")
  }
  if (step.kind === "select" || step.kind === "state") {
    return step.options.find((o) => o.value === value)?.label ?? String(value)
  }
  if (step.kind === "number" && step.suffix) return `${value} ${step.suffix}`
  return String(value)
}
