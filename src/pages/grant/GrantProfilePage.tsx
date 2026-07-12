import { UserRound } from "lucide-react"
import { useAidIntake } from "@/hooks/grant/useAidIntake"
import {
  activeModuleIds,
  triggerProgress,
  TRIGGER_FIELDS,
  type PartialAidIntake,
} from "@/types/grant/intake"
import { GrantCard, GrantMeter, GrantPill } from "./_shared"
import GrantIntakeFlow from "./intake/GrantIntakeFlow"

/** Friendly labels for the population modules an intake screener activates. */
const MODULE_LABELS: Record<string, string> = {
  military: "Military / Veteran",
  justice: "Justice-impacted",
  disability: "Disability",
  adult: "Returning adult",
  first_time: "First-time student",
  foster: "Foster care",
  undocumented: "Undocumented / DACA",
  homeless: "Housing insecure",
  caregiver: "Caregiver",
  field: "Field-specific",
  tribal: "Tribal",
}

const ENROLLMENT_LABELS: Record<string, string> = {
  prospective: "Prospective",
  enrolled: "Enrolled",
  transferring: "Transferring",
  returning_adult: "Returning adult",
}
const INSTITUTION_LABELS: Record<string, string> = {
  community_college: "Community college",
  four_year: "Four-year",
  trade_vocational: "Trade / vocational",
  grad: "Graduate",
}
const INCOME_LABELS: Record<string, string> = {
  under_30k: "Under $30k",
  "30k_60k": "$30k–$60k",
  "60k_100k": "$60k–$100k",
  "100k_150k": "$100k–$150k",
  over_150k: "Over $150k",
}

/** Build the short "answered so far" summary rows from the saved intake. */
function summaryFields(intake: PartialAidIntake): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []
  if (intake.student_age !== undefined) rows.push({ label: "Age", value: String(intake.student_age) })
  if (intake.enrollment_status) {
    rows.push({ label: "Enrollment", value: ENROLLMENT_LABELS[intake.enrollment_status] })
  }
  if (intake.state_of_residence) rows.push({ label: "State", value: intake.state_of_residence })
  if (intake.institution_type) {
    rows.push({ label: "School type", value: INSTITUTION_LABELS[intake.institution_type] })
  }
  if (intake.household_income_range) {
    rows.push({ label: "Household income", value: INCOME_LABELS[intake.household_income_range] })
  }
  if (intake.intended_field) rows.push({ label: "Intended field", value: intake.intended_field })
  if (intake.first_generation) rows.push({ label: "First-generation", value: "Yes" })
  return rows
}

/**
 * Financial Profile = a light "profile at a glance" summary header on top of the
 * interactive aid-intake flow (UI-1). The summary shows completeness, the key
 * answered fields, and active-population chips; the questionnaire below collects
 * the five trigger fields (plus enrichment) the Targeted Search Module needs and
 * is rendered exactly as before.
 */
export default function GrantProfilePage() {
  const { data: intake } = useAidIntake()
  const profile = intake ?? {}

  const answered = triggerProgress(profile)
  const completionPct = Math.round((answered / TRIGGER_FIELDS.length) * 100)
  const fields = summaryFields(profile)
  const modules = activeModuleIds(profile)

  return (
    <div className="max-w-3xl">
      <GrantCard className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(59,91,255,0.1)]">
              <UserRound className="h-5 w-5 text-[#3B5BFF]" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#1f2937]">Your aid profile at a glance</h2>
              <p className="text-xs text-[#6b7280]">
                {answered === TRIGGER_FIELDS.length
                  ? "Essentials complete — refine anytime below."
                  : "Answer the essentials below to unlock your matches."}
              </p>
            </div>
          </div>
          <GrantPill tone={answered === TRIGGER_FIELDS.length ? "green" : "blue"}>
            {answered}/{TRIGGER_FIELDS.length} essentials
          </GrantPill>
        </div>

        <GrantMeter
          value={completionPct}
          tone={answered === TRIGGER_FIELDS.length ? "green" : "blue"}
          label="Profile completeness"
          right={`${completionPct}%`}
          className="mb-4"
        />

        {fields.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-[#9ca3af]">{f.label}</dt>
                <dd className="text-sm font-medium text-[#1f2937]">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-[#6b7280]">
            Nothing saved yet — the conversation below walks you through it in a few minutes.
          </p>
        )}

        {modules.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e5e7eb] pt-4">
            {modules.map((id) => (
              <GrantPill key={id} tone="teal">
                {MODULE_LABELS[id] ?? id}
              </GrantPill>
            ))}
          </div>
        )}
      </GrantCard>

      <GrantIntakeFlow />
    </div>
  )
}
