import type { TFunction } from "i18next"

/** JF-9 — the Career Pathway v2 words, shared by the page, its parts and tests. */

export type V2SectionId = "adjacent" | "nextLevel" | "newJobs"

export function v2SectionTitles(t: TFunction): Record<V2SectionId, string> {
  return {
    adjacent: t("pathway.titleAdjacent", "Jobs you can quickly move into"),
    nextLevel: t("pathway.titleNextLevel", "Roles you're developing toward"),
    newJobs: t("pathway.titleNewJobs", "New jobs to consider"),
  }
}

export function v2SectionHints(t: TFunction): Record<V2SectionId, string> {
  return {
    adjacent: t(
      "pathway.hintAdjacent",
      "A close blueprint at the same or a lower job level — no new credential expected.",
    ),
    nextLevel: t("pathway.hintNextLevel", "A higher level in the same job family."),
    newJobs: t("pathway.hintNewJobs", "Other jobs your profile is growing toward."),
  }
}

/**
 * The English of {@link credentialText}, kept as a plain constant because
 * `jf9-pathway-v2.test.tsx` compares rendered text with it. The page never reads
 * it: it renders `credentialText(t)`, and the tests fail if the two ever differ.
 */
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

/** Every "Training and credentials" part says why when it has nothing. */
export function credentialText(t: TFunction) {
  return {
    noCode: t(
      "pathway.credNoCode",
      "No occupation code is linked to this job yet, so its education, training and licences can't be looked up.",
    ),
    educationError: t("pathway.credEducationError", "Education data couldn't be loaded just now."),
    educationNone: t("pathway.credEducationNone", "O*NET has no education data for this occupation yet."),
    localOff: t(
      "pathway.credLocalOff",
      "Local listings aren't switched on yet — they appear here once CareerOneStop is connected.",
    ),
    localEmpty: t("pathway.credLocalEmpty", "None found."),
    localUnavailable: t("pathway.credLocalUnavailable", "CareerOneStop couldn't be reached just now."),
    programsHidden: t("pathway.credProgramsHidden", "School programme listings aren't available to you."),
    programsError: t("pathway.credProgramsError", "School programmes couldn't be loaded just now."),
    programsNone: t("pathway.credProgramsNone", "No published school programme leads to this job yet."),
  } as const
}
