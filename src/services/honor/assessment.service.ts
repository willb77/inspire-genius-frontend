import { agentApi } from "@/lib/agentApi"
import type { HonorApiResponse } from "@/types/honor"

/**
 * Honor Coach Workbench — coach-scoped assessment import.
 *
 * REUSE, NOT RECREATE: the agent-engine already parses every framework
 * (PRISM, DISC, MBTI, BIG_FIVE, CLIFTON, HOGAN, ENNEAGRAM) with the shipped
 * `app/profile/adapters/*` and writes the canonical `assessments` /
 * `assessment_scores` platform (see "Assessments & Personalization — State &
 * Remaining Work", §4.0-§4.1). The self path is `POST /v1/profile/me/
 * assessments/import`; this module hits the COACH-scoped mirror on the Honor
 * router, which resolves the SUBJECT = the fellow (member) rather than the
 * calling coach, gated by the honor roster ownership link.
 *
 *   POST /v1/agents/honor/coach/students/{fellowId}/assessments/import
 *   POST /v1/agents/honor/coach/students/{fellowId}/assessments/import/preview
 *
 * The fellow must already be INVITED (have an IG user to attach scores to) —
 * a still-managed fellow returns 409, which the onboarding flow avoids by
 * inviting before importing.
 */

/** Frameworks the agent-engine adapters parse. PRISM is the source of truth. */
export const HONOR_FRAMEWORKS = [
  "PRISM",
  "DISC",
  "CLIFTON",
  "BIG_FIVE",
  "MBTI",
  "HOGAN",
] as const

export type HonorFramework = (typeof HONOR_FRAMEWORKS)[number]

/** Human labels for the framework selector (wireframe terminology). */
export const HONOR_FRAMEWORK_LABELS: Record<HonorFramework, string> = {
  PRISM: "PRISM (source of truth)",
  DISC: "DISC",
  CLIFTON: "CliftonStrengths (StrengthsFinder)",
  BIG_FIVE: "The Big Five (OCEAN)",
  MBTI: "Myers-Briggs (MBTI)",
  HOGAN: "Hogan",
}

export type ImportedAssessment = {
  id: string
  framework: string
  subjectUserId: string
  fellowId: string
  source: string
  scoreCount: number
  typingCount?: number
  assessedAt?: string
}

export type AssessmentPreview = {
  framework: string
  subjectUserId?: string
  scores: Array<Record<string, unknown>>
  confidence: number | null
}

const base = (fellowId: string) =>
  `/v1/agents/honor/coach/students/${encodeURIComponent(fellowId)}/assessments/import`

/** Parse a report file for a fellow WITHOUT persisting — lets the UI confirm. */
export async function previewFellowAssessment(
  fellowId: string,
  framework: HonorFramework,
  file: File,
): Promise<AssessmentPreview> {
  const form = new FormData()
  form.append("framework", framework)
  form.append("file", file)
  const { data } = await agentApi.post<HonorApiResponse<AssessmentPreview>>(
    `${base(fellowId)}/preview`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  )
  return (data.data ?? (data as unknown as AssessmentPreview)) as AssessmentPreview
}

/** Import (parse + persist) a report file as the fellow's OWN structured scores. */
export async function importFellowAssessment(
  fellowId: string,
  framework: HonorFramework,
  file: File,
): Promise<ImportedAssessment> {
  const form = new FormData()
  form.append("framework", framework)
  form.append("file", file)
  const { data } = await agentApi.post<HonorApiResponse<ImportedAssessment>>(
    base(fellowId),
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  )
  return (data.data ?? (data as unknown as ImportedAssessment)) as ImportedAssessment
}
