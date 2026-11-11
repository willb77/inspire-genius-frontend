/** JF-9 — the Career Pathway v2 words, shared by the page, its parts and tests. */

export const V2_SECTION_TITLES = {
  adjacent: "Jobs you can quickly move into",
  nextLevel: "Roles you're developing toward",
  newJobs: "New jobs to consider",
} as const

export const V2_SECTION_HINTS = {
  adjacent: "A close blueprint at the same or a lower job level — no new credential expected.",
  nextLevel: "A higher level in the same job family.",
  newJobs: "Other jobs your profile is growing toward.",
} as const

/** Every "Training and credentials" part says why when it has nothing. */
export const CREDENTIAL_TEXT = {
  noCode:
    "No occupation code is linked to this job yet, so its education, training and licences can't be looked up.",
  educationError: "Education data couldn't be loaded just now.",
  educationNone: "O*NET has no education data for this occupation yet.",
  localOff: "Local listings aren't switched on yet — they appear here once CareerOneStop is connected.",
  localEmpty: "None found.",
  localUnavailable: "CareerOneStop couldn't be reached just now.",
  programsHidden: "School programme listings aren't available to you.",
  programsError: "School programmes couldn't be loaded just now.",
  programsNone: "No published school programme leads to this job yet.",
} as const
