// GRANT UI-1 — intake step descriptors.
//
// Each step maps one conversational question to one field on the AidIntakeProfile
// contract. The five "trigger" steps come first (they unlock the ranked search);
// "enrichment" steps follow and are all skippable — they only re-rank matches.

import type { AidIntakeProfile } from "@/types/grant/intake"
import {
  ENROLLMENT_STATUS,
  FAFSA_STATUS,
  INCOME_RANGE,
  INSTITUTION_TYPE,
} from "@/types/grant/intake"

export type IntakePhase = "trigger" | "enrichment"

export type Option = { value: string; label: string }

type BaseStep = {
  field: keyof AidIntakeProfile
  phase: IntakePhase
  /** Meridian-style question shown in the assistant bubble. */
  question: string
  /** Optional supporting line under the question. */
  helper?: string
}

export type SelectStep = BaseStep & { kind: "select" | "state"; options: Option[] }
export type NumberStep = BaseStep & { kind: "number"; placeholder?: string; suffix?: string }
export type TextStep = BaseStep & { kind: "text"; placeholder?: string }
export type BoolStep = BaseStep & { kind: "bool" }

export type IntakeStep = SelectStep | NumberStep | TextStep | BoolStep

// Enum-value → friendly label (persist the value, show the label).
const enrollmentOptions: Option[] = [
  { value: ENROLLMENT_STATUS[0], label: "Planning to enroll" },
  { value: ENROLLMENT_STATUS[1], label: "Currently enrolled" },
  { value: ENROLLMENT_STATUS[2], label: "Transferring schools" },
  { value: ENROLLMENT_STATUS[3], label: "Returning adult learner" },
]

const institutionOptions: Option[] = [
  { value: INSTITUTION_TYPE[0], label: "Community college" },
  { value: INSTITUTION_TYPE[1], label: "Four-year college / university" },
  { value: INSTITUTION_TYPE[2], label: "Trade or vocational school" },
  { value: INSTITUTION_TYPE[3], label: "Graduate school" },
]

const incomeOptions: Option[] = [
  { value: INCOME_RANGE[0], label: "Under $30,000" },
  { value: INCOME_RANGE[1], label: "$30,000 – $60,000" },
  { value: INCOME_RANGE[2], label: "$60,000 – $100,000" },
  { value: INCOME_RANGE[3], label: "$100,000 – $150,000" },
  { value: INCOME_RANGE[4], label: "Over $150,000" },
]

const fafsaOptions: Option[] = [
  { value: FAFSA_STATUS[0], label: "Not started" },
  { value: FAFSA_STATUS[1], label: "In progress" },
  { value: FAFSA_STATUS[2], label: "Submitted" },
]

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
    field: "student_age",
    phase: "trigger",
    kind: "number",
    question: "First — how old are you?",
    helper: "Age decides which awards you're eligible for. Under-18 awards are handled for you.",
    placeholder: "e.g. 17",
    suffix: "years",
  },
  {
    field: "enrollment_status",
    phase: "trigger",
    kind: "select",
    question: "Where are you in your education journey?",
    options: enrollmentOptions,
  },
  {
    field: "state_of_residence",
    phase: "trigger",
    kind: "state",
    question: "Which state do you live in?",
    helper: "Unlocks state-specific grants and scholarships.",
    options: US_STATES,
  },
  {
    field: "institution_type",
    phase: "trigger",
    kind: "select",
    question: "What kind of school are you headed to?",
    options: institutionOptions,
  },
  {
    field: "household_income_range",
    phase: "trigger",
    kind: "select",
    question: "Roughly, what's your household's yearly income?",
    helper: "Used only to match need-based aid — a range is all we need, and it's never shared.",
    options: incomeOptions,
  },
  // ── Enrichment (optional — sharpen matches) ────────────────────────────────
  {
    field: "intended_field",
    phase: "enrichment",
    kind: "text",
    question: "What do you plan to study?",
    helper: "Opens up field-specific scholarships.",
    placeholder: "e.g. Nursing, Computer Science",
  },
  {
    field: "first_generation",
    phase: "enrichment",
    kind: "bool",
    question: "Will you be the first in your family to attend college?",
    helper: "Many awards are set aside for first-generation students.",
  },
  {
    field: "city_or_county",
    phase: "enrichment",
    kind: "text",
    question: "Which city or county are you in?",
    helper: "Surfaces hyper-local awards from community foundations.",
    placeholder: "e.g. Alameda County",
  },
  {
    field: "gpa",
    phase: "enrichment",
    kind: "number",
    question: "What's your GPA?",
    helper: "Optional — average grades still qualify for the vast majority of aid.",
    placeholder: "e.g. 3.4",
  },
  {
    field: "household_size",
    phase: "enrichment",
    kind: "number",
    question: "How many people are in your household?",
    placeholder: "e.g. 4",
    suffix: "people",
  },
  {
    field: "fafsa_status",
    phase: "enrichment",
    kind: "select",
    question: "Have you started your FAFSA?",
    helper: "We'll tailor your next steps to where you are.",
    options: fafsaOptions,
  },
]

/** Human-readable answer for the transcript chips. */
export function labelForAnswer(step: IntakeStep, value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  if (step.kind === "bool") return value ? "Yes" : "No"
  if (step.kind === "select" || step.kind === "state") {
    return step.options.find((o) => o.value === value)?.label ?? String(value)
  }
  if (step.kind === "number" && step.suffix) return `${value} ${step.suffix}`
  return String(value)
}
