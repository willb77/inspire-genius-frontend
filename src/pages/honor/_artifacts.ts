// The Honor Foundation — Coach Workbench: the 10 canonical fellow artifacts.
//
// Config + pure helpers split from _ArtifactUploader.tsx (component-only) so the
// react-refresh only-export-components rule stays satisfied.

import type { HonorFramework } from "@/services/honor/assessment.service"
import type { HonorDocKind } from "@/services/honor/artifact.service"
import type { HonorFellowSources } from "@/types/honor"

export type ArtifactKind = "assessment" | "doc" | "goals"

export type ArtifactConfig = {
  /** Stable id. */
  key: string
  /** Display label. */
  label: string
  /** Short label for the compact status row (avoids long badges). */
  abbr: string
  kind: ArtifactKind
  /** Set when kind === "assessment". */
  framework?: HonorFramework
  /** Set when kind === "doc". */
  docKind?: HonorDocKind
  /** Accepted file types (assessment / doc kinds). */
  accept: string
}

const ASSESSMENT_ACCEPT = ".csv,.xlsx,.pdf,.doc,.docx"
const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx"

/** The 10 canonical artifacts, in the order they should be presented. */
export const ARTIFACTS: ArtifactConfig[] = [
  { key: "prism", label: "PRISM", abbr: "PRSM", kind: "assessment", framework: "PRISM", accept: ".csv,.xlsx,.pdf" },
  { key: "disc", label: "DISC", abbr: "DISC", kind: "assessment", framework: "DISC", accept: ASSESSMENT_ACCEPT },
  { key: "clifton", label: "CliftonStrengths", abbr: "CLIF", kind: "assessment", framework: "CLIFTON", accept: ASSESSMENT_ACCEPT },
  { key: "mbti", label: "MyersBriggs", abbr: "MBTI", kind: "assessment", framework: "MBTI", accept: ASSESSMENT_ACCEPT },
  { key: "big_five", label: "Big Five", abbr: "BIG5", kind: "assessment", framework: "BIG_FIVE", accept: ASSESSMENT_ACCEPT },
  { key: "hogan", label: "Hogan", abbr: "HGN", kind: "assessment", framework: "HOGAN", accept: ASSESSMENT_ACCEPT },
  { key: "resume", label: "Résumé", abbr: "CV", kind: "doc", docKind: "resume", accept: DOC_ACCEPT },
  { key: "bio", label: "Bio", abbr: "BIO", kind: "doc", docKind: "bio", accept: DOC_ACCEPT },
  { key: "additional", label: "Additional info", abbr: "INFO", kind: "doc", docKind: "personal", accept: DOC_ACCEPT },
  { key: "goals", label: "Goals", abbr: "GOALS", kind: "goals", accept: "" },
]

/** Is a given artifact present in the fellow's sources? */
export function artifactPresent(
  sources: HonorFellowSources | undefined,
  artifact: ArtifactConfig,
): boolean {
  if (!sources) return false
  switch (artifact.kind) {
    case "assessment":
      return sources.assessments.some((a) => a.framework === artifact.framework)
    case "goals":
      return sources.goals
    case "doc":
      if (artifact.docKind === "resume") return sources.resume
      if (artifact.docKind === "bio") return sources.bio
      return sources.additionalInfo // "personal"
    default:
      return false
  }
}
