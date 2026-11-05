import { z } from "zod"
import {
  INTAKE_CONTEXTS,
  INTAKE_PRISM_ACCREDITED,
  INTAKE_ROLES,
  type IntakeConsent,
  type IntakeConsentPurpose,
  type IntakeContext,
  type IntakePrismAccredited,
  type IntakeRole,
  type PublicRegistrationPayload,
} from "@/types/intake"

/**
 * IN-2c — client-side rules for `/join`. They mirror the intake service's
 * `RegistrationIn` (lengths, vocabularies, and the three cross-field rules) so a
 * visitor sees a problem before submitting. The server stays the authority: its
 * 422 list is mapped back onto these same fields.
 */

export const JOIN_FORM_VERSION = "join-v1"

export const ROLE_LABELS: Record<IntakeRole, string> = {
  practitioner: "PRISM practitioner",
  distributor: "PRISM distributor",
  career_coach: "Career coach",
  education_coach: "Education coach",
  mentor: "Mentor",
  hr: "HR professional",
  recruiter: "Recruiter",
  company: "Company leader or manager",
  other: "Other",
}

export const PRISM_LABELS: Record<IntakePrismAccredited, string> = {
  yes: "Yes",
  no: "No",
  not_sure: "Not sure",
}

export const CONTEXT_LABELS: Record<IntakeContext, string> = {
  individual: "As an individual",
  company: "In a company",
  education: "In education",
  other: "Other",
}

export const CONSENT_WORDING: Record<IntakeConsentPurpose, string> = {
  webinar_email: "Email me when an Inspires Genius webinar session is scheduled.",
  mailing_list: "Add me to the Inspires Genius mailing list for occasional news.",
}

const ORG_REQUIRED: ReadonlySet<IntakeContext> = new Set<IntakeContext>(["company", "education"])

const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`)

const optional = (label: string, max: number) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`)

const choice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z
    .string()
    .refine((v): v is T[number] => (values as readonly string[]).includes(v), { message })

export const joinSchema = z
  .object({
    first_name: required("First name", 200),
    last_name: required("Last name", 200),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .max(320, "Email must be 320 characters or fewer")
      .email("Enter a valid email address"),
    phone: optional("Phone", 64),
    organisation: optional("Organisation", 300),
    role: choice(INTAKE_ROLES, "Choose the option that best describes you"),
    role_other: optional("Role", 200),
    prism_accredited: choice(INTAKE_PRISM_ACCREDITED, "Tell us whether you are PRISM accredited"),
    site_id: optional("PRISM site ID", 100),
    context: choice(INTAKE_CONTEXTS, "Choose where you would use Inspires Genius"),
    context_other: optional("Setting", 200),
    region: required("Region", 100),
    country: required("Country", 100),
    heard_from: optional("This answer", 300),
    consent_webinar_email: z.boolean(),
    consent_mailing_list: z.boolean(),
    website: z.string().max(1000),
  })
  .superRefine((v, ctx) => {
    if (ORG_REQUIRED.has(v.context as IntakeContext) && !v.organisation) {
      ctx.addIssue({ code: "custom", path: ["organisation"], message: "Organisation is required for a company or education setting" })
    }
    if (v.role === "other" && !v.role_other) {
      ctx.addIssue({ code: "custom", path: ["role_other"], message: "Please describe your role" })
    }
    if (v.context === "other" && !v.context_other) {
      ctx.addIssue({ code: "custom", path: ["context_other"], message: "Please describe the setting" })
    }
  })

export type JoinFormValues = z.input<typeof joinSchema>

export const JOIN_DEFAULTS: JoinFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  organisation: "",
  role: "",
  role_other: "",
  prism_accredited: "",
  site_id: "",
  context: "",
  context_other: "",
  region: "",
  country: "",
  heard_from: "",
  consent_webinar_email: false,
  consent_mailing_list: false,
  website: "",
}

const orNull = (v: string | undefined): string | null => {
  const t = (v ?? "").trim()
  return t ? t : null
}

/** Form values → the browser-mode body. No `client_ip`; `webinar_id` is always null. */
export function toPayload(v: JoinFormValues): PublicRegistrationPayload {
  const role = v.role as IntakeRole
  const context = v.context as IntakeContext
  const prism = v.prism_accredited as IntakePrismAccredited
  const consent = (purpose: IntakeConsentPurpose, granted: boolean): IntakeConsent => ({
    purpose,
    granted,
    wording: CONSENT_WORDING[purpose],
    form_version: JOIN_FORM_VERSION,
  })
  return {
    first_name: v.first_name.trim(),
    last_name: v.last_name.trim(),
    email: v.email.trim(),
    phone: orNull(v.phone),
    organisation: orNull(v.organisation),
    role,
    role_other: role === "other" ? orNull(v.role_other) : null,
    prism_accredited: prism,
    site_id: prism === "yes" ? orNull(v.site_id) : null,
    context,
    context_other: context === "other" ? orNull(v.context_other) : null,
    region: v.region.trim(),
    country: v.country.trim(),
    heard_from: orNull(v.heard_from),
    webinar_id: null,
    consents: [
      consent("webinar_email", v.consent_webinar_email),
      consent("mailing_list", v.consent_mailing_list),
    ],
    website: v.website ? v.website : null,
  }
}

/** The form fields a server problem can land on. Anything else is shown at form level. */
export const MAPPABLE_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "organisation",
  "role",
  "role_other",
  "prism_accredited",
  "site_id",
  "context",
  "context_other",
  "region",
  "country",
  "heard_from",
] as const
export type MappableField = (typeof MAPPABLE_FIELDS)[number]

/**
 * `consents.0.granted` → `consents`; `email` → `email`. Returns null when the
 * field is not one the form shows (e.g. `webinar_id`, `body`).
 */
export function formFieldFor(serverField: string): MappableField | "consents" | null {
  const head = serverField.split(".")[0]
  if (head === "consents") return "consents"
  return (MAPPABLE_FIELDS as readonly string[]).includes(head) ? (head as MappableField) : null
}
