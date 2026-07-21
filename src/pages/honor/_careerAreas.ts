// Curated private-sector career areas for transitioning U.S. Special Operations
// veterans. Used to populate the "target career area" select on the Honor résumé
// writer (and any other Honor career surface where the coach picks a direction).
//
// These are free-form hints handed to the résumé writer — NOT the backend
// fit_config archetype keys used by the deterministic Evaluate scorer (those stay
// in HonorEvaluate's own constrained list). Keep this list human-readable; the
// label is both the value and the display text. A free-text "Other" path lets the
// coach type anything not covered here, so nothing is lost.

export const HONOR_CAREER_AREAS: readonly string[] = [
  "Program & Operations Management",
  "Project Management",
  "Product Management",
  "Consulting & Advisory",
  "Sales & Business Development",
  "Cybersecurity",
  "IT & Systems",
  "Data & Analytics",
  "Logistics & Supply Chain",
  "Manufacturing & Industrial Operations",
  "Security & Risk Management",
  "Risk, Compliance & Governance",
  "Law Enforcement & Public Safety",
  "Emergency Management",
  "Intelligence & Investigations",
  "Aerospace & Defense",
  "Energy & Utilities",
  "Construction & Facilities Management",
  "Transportation & Fleet Management",
  "Healthcare Administration",
  "Finance & Banking",
  "Human Resources & Talent",
  "Training, Learning & Development",
  "Education & Instruction",
  "Marketing & Communications",
  "Customer Success & Support",
  "Quality Assurance & Process Improvement",
  "Real Estate & Property Management",
  "Government & Public Administration",
  "Nonprofit & Veteran Services",
  "Entrepreneurship & Small Business",
] as const

/** Sentinel value for the "Other (specify)" option in a career-area select. */
export const HONOR_CAREER_AREA_OTHER = "__other__"
