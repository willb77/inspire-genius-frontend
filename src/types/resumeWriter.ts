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
  /** RW2 — present only while the server's `resume_writer_tailored` switch is on. */
  tailoredEnabled?: boolean
  /** RW2 — the role a `?jobId=` names, as the server's org-scoped read returns it. */
  targetRole?: TargetRoleView | null
  targetRoleStatus?: "ok" | "not_found"
  /**
   * RW2 follow-up — with no `?jobId=`, the role the person set as their goal
   * target, as the server's org-scoped read returns it. Absent when there is
   * none, it is not visible, or either switch is off. A suggestion only.
   */
  goalTarget?: TargetRoleView
}

/** RW2 — a Career Fit role, as the Résumé Writer may show it. */
export type TargetRoleView = {
  jobId: string
  title: string
  department: string | null
}

export type ResumeWriterRequest = {
  role?: string
  careerArea?: string
  positionText?: string
  documentIds?: string[]
  /** RW2 — the Career Fit role to aim at. Ignored by the server while its switch is off. */
  jobId?: string
}

/** RW2 — one line the fabrication check took out, because the source does not show it. */
export type RemovedLine = {
  section: string
  reason: "employer" | "title" | "dates" | "education" | "certification" | "number" | "activity" | string
  text: string
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
  /** RW2 — present on a résumé aimed at a chosen role. */
  tailored?: boolean
  targetRole?: TargetRoleView
  /** The role's critical activities the draft reflects. */
  emphasised?: string[]
  /** The role's critical activities the résumé does not show — advice, never written in. */
  notEvidenced?: string[]
  /** What the fabrication check took out. Always shown to the person. */
  removed?: RemovedLine[]
}

export type ResumeWriterDisabled = { disabled: true }

/** RW2 — `POST /v1/agents/resume-writer/me/jobs` (202). */
export type ResumeJobStarted = { jobId: string; status: string; tailored?: boolean }

/** RW2 — `GET /v1/agents/resume-writer/me/jobs/{jobId}`. */
export type ResumeJobState = {
  jobId: string
  status: "queued" | "running" | "complete" | "error" | "expired"
  result: GeneratedResume | null
  error: string | null
}

export type ResumeWriterResult = GeneratedResume | ResumeWriterDisabled

export function isResumeWriterDisabled(r: ResumeWriterResult | undefined): r is ResumeWriterDisabled {
  return !!r && (r as ResumeWriterDisabled).disabled === true
}

export type ResumeWriterApiResponse<T> = { status: boolean; data: T }
