/**
 * Résumé Writer — the person's own résumé (2026-10-19).
 *
 * Mirrors the agent-engine contract at `/v1/agents/resume-writer/me`. The
 * caller is always the subject: there is no member id anywhere in it.
 */

/** One of the caller's own personal documents the draft may be grounded on. */
export type ResumeWriterDocument = {
  id: string
  filename: string
  docKind: string
}

/** `GET /v1/agents/resume-writer/me`. */
export type ResumeWriterSources = {
  /** Server switch. False → generation is off for everyone right now. */
  enabled: boolean
  dailyLimit: number
  usedToday: number
  sources: {
    resume: boolean
    bio: boolean
    /** Assessment frameworks on file, e.g. "PRISM". */
    assessments: string[]
  }
  documents: ResumeWriterDocument[]
}

export type ResumeWriterRequest = {
  role?: string
  careerArea?: string
  positionText?: string
  documentIds?: string[]
}

export type ResumeExperience = {
  title: string
  organization: string
  dates: string
  bullets: string[]
}

/** The drafted résumé — the content only; the page owns the layout. */
export type GeneratedResume = {
  target: string
  headline: string
  summary: string
  competencies: string[]
  experience: ResumeExperience[]
  education: string[]
  certifications: string[]
  sources: string[]
  grounded: boolean
  disclaimer: string
  usedToday: number
  dailyLimit: number
}

export type ResumeWriterDisabled = { disabled: true }

export type ResumeWriterResult = GeneratedResume | ResumeWriterDisabled

export function isResumeWriterDisabled(r: ResumeWriterResult | undefined): r is ResumeWriterDisabled {
  return !!r && (r as ResumeWriterDisabled).disabled === true
}

export type ResumeWriterApiResponse<T> = { status: boolean; data: T }
