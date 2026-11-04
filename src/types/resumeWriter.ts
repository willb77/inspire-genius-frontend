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
  /** RWO-1/RWO-2 — present only while the server's `resume_writer_options` switch is on. */
  optionsEnabled?: boolean
  options?: ResumeOptionView[]
  bulletStyles?: BulletStyleView[]
  defaultOption?: string
  defaultBulletStyle?: string
  /**
   * RWO-8 — present (true) only while the server's `resume_writer_guided` switch is
   * on. Absent, the page is today's, whatever else the response says.
   */
  guidedEnabled?: boolean
}

/** RWO-2 — one résumé format, as the server describes it (the copy, never the prompt). */
export type ResumeOptionView = {
  id: string
  number: number
  name: string
  atsRating: string
  pages: string
  /** Render order for the page and the file. */
  sections: string[]
  requiredInputs: string[]
  recommendedInputs: string[]
  useWhen: string
  avoidWhen: string
  expect: string
  takesDisclosure: boolean
  /** RWO-3 — present (true) only for Federal: the page asks for hours and series/grade. */
  takesFederalDetails?: boolean
  /** RWO-3 — a hard page limit the page warns against (Federal: 2). */
  pageLimit?: number
}

/** RWO-2 — one bullet-writing style. */
export type BulletStyleView = {
  id: string
  name: string
  structure: string
  bestFor: string
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
  /** RWO-2 — sent only while `optionsEnabled`. */
  option?: string
  bulletStyle?: string
  /** Re-Entry only: how the person wants a gap or program described. Used for this draft; never stored. */
  disclosure?: string
  /** RWO-3 — Federal only: hours per week, series/grade, clearance. Used for this draft; never stored. */
  federalDetails?: string
  /**
   * RWO-8 — the person's direction from the assistant ("Apply to my draft"): changes
   * emphasis and wording only, never facts. Read only while `guidedEnabled`. Never stored.
   */
  instruction?: string
  /** RWO-8 — the person's answers to the résumé interview. Their facts, for this draft only. */
  answers?: InterviewAnswer[]
}

/** RWO-8 — one question from the résumé interview. */
export type InterviewQuestion = {
  id: string
  text: string
  /** One sentence: what the job asks for, or which line has no result. */
  why: string
  /** The job's words, or the résumé line, the question is about. */
  requirement: string
}

/** RWO-8 — an answered question. Only answered ones are ever sent. */
export type InterviewAnswer = { question: string; answer: string }

/** RWO-8 — `POST /v1/agents/resume-writer/me/questions`. */
export type ResumeQuestionsRequest = {
  role?: string
  careerArea?: string
  positionText?: string
  documentIds?: string[]
  jobId?: string
  option?: string
  /** True for the follow-ups on the review step, with the draft's lines. */
  afterDraft?: boolean
  weakBullets?: string[]
}

/** RWO-8 — the 202 (or, with nothing to ask after a draft, the empty answer at once). */
export type ResumeQuestionsStarted = { jobId: string | null; status: string; questions?: InterviewQuestion[] }

/** RWO-8 — `GET /v1/agents/resume-writer/me/questions/{jobId}`. */
export type ResumeQuestionsState = {
  jobId: string
  status: "queued" | "running" | "complete" | "error" | "expired"
  questions: InterviewQuestion[] | null
  error: string | null
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
  /** RWO-1 — the format and bullet style the draft was written in. */
  option?: string
  bulletStyle?: string
  /** RWO-1 — a format's extra sections. Present only for the format that returns them. */
  selected_achievements?: string[]
  training?: string[]
  /** Interview advice for the person: shown on the page, never written into a file. */
  talking_points?: string[]
  projects?: ResumeProject[]
  activities?: string[]
  technical_skills?: SkillGroup[]
  /** RWO-3 — Federal: hours per week and series/grade for each job, matched by title and organization. */
  federal_roles?: FederalRole[]
  /** RWO-3 — Federal: clearance, languages, affiliations, publications, special programs. */
  federal_optional?: string[]
  /** RWO-3 — Federal: the announcement's requirements and the bullet that shows each. Page only. */
  qualifications_crosswalk?: CrosswalkRow[]
}

export type FederalRole = { title: string; organization: string; hours_per_week: string; series_grade: string }
export type CrosswalkRow = { requirement: string; evidence: string }

export type ResumeProject = { name: string; problem: string; stack: string; role: string; outcome: string }
export type SkillGroup = { category: string; skills: string[] }

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
