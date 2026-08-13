export const ROUTES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  OTP: "/otp",
  RESET: "/reset-password",
  HOME: "/home",
  /** Permanent escape hatch — always renders the original Home regardless of the new_user_surfaces flag. */
  HOME_CLASSIC: "/home/classic",
  DASHBOARD: "/dashboard",
  COACHES: "/coaches",
  DOCUMENTS: "/documents",
  INTERVIEW_PRACTICE: "/interview-practice",
  /** Public per-occupation Interview Practice role guides (index + `/interview-practice/:slug`). */
  INTERVIEW_PRACTICE_ROLES: "/interview-practice/roles",
  /** Surveys — build questionnaires and select one to take (browser-local). */
  SURVEYS: "/surveys",
  PROFILE: "/profile",
  USER: {
    PROFILE: "/profile",
  },
  SETTINGS: "/settings",
  SETTINGS_PRIVACY: "/settings/privacy",
  HELP: "/help",
  SUPPORT: "/support",
  FEEDBACK: "/feedback",
  ANALYTICS: "/analytics",
  MERIDIAN_CHAT: "/meridian/chat",
  /** Bio Capture — the Chronicle life-narrative surface. */
  BIO_CAPTURE: "/bio",
  PRISM_ASSESSMENT: "/prism-assessment",
  SUMMIT: {
    BASE: "/summit",
    DASHBOARD: "/summit",
    DISCOVERY: "/summit/discovery",
    PRISM: "/summit/prism",
    GOALS: "/summit/goals",
    COACHES: "/summit/coaches",
    DOCUMENTS: "/summit/documents",
    PROGRESS: "/summit/progress",
  },
  /** @deprecated Wave 2 Lane 2.A (P7.1) — moved under super-admin as `SUPER_ADMIN.AGENT_TRACE_CONSOLE`. The old path now redirects to the new one. */
  DIAGNOSTIC_CHAT: "/diagnostic-chat",
  SUPER_ADMIN: {
    BASE: "/super-admin",
    DASHBOARD: "/super-admin/dashboard",
    ORGANIZATIONS: "/super-admin/organizations",
    USERS: "/super-admin/users",
    USER_MEMORY: "/super-admin/users/:userId/memory",
    SETTINGS: "/super-admin/settings",
    PROJECT_LOG: "/super-admin/project-log",
    RLHF_TRAINING: "/super-admin/rlhf-training",
    /** @deprecated Wave 2 Lane 2.B (P2.1 / D3) — redirects to MentorManagement → Prompt tab. */
    PROMPT_BUILDER: "/super-admin/prompt-builder",
    ANALYTICS: "/super-admin/analytics",
    /** @deprecated Wave 2 Lane 2.B (P2.3 / D7) — redirects to MentorManagement → Voice tab. */
    VOICE_SETTINGS: "/super-admin/voice-settings",
    PROCESS_BUILDER: "/super-admin/process-builder",
    AGENT_TRAINER: "/super-admin/agent-trainer",
    BULK_IMPORT: "/super-admin/bulk-import",
    OBSERVABILITY: "/super-admin/observability",
    /** @deprecated Wave 2 Lane 2.B (P2.2 / D4) — redirects to MentorManagement → Protocol tab. */
    INTERACTION_PROTOCOL: "/super-admin/interaction-protocol",
    MENTOR_MANAGEMENT: "/super-admin/mentor-management",
    COST_ANALYSIS: "/super-admin/cost-analysis",
    KNOWLEDGE_BASE: "/super-admin/knowledge-base",
    KNOWLEDGE_BASE_CULTURAL: "/super-admin/knowledge-base?domain=cultural",
    /** @deprecated Wave 0.E (P5.1) — redirects to `KNOWLEDGE_BASE` with `?domain=cultural`. Prefer `KNOWLEDGE_BASE_CULTURAL`. */
    CULTURAL_CONTENT: "/super-admin/cultural-content",
    PRISM_MANAGEMENT: "/super-admin/prism-management",
    PRIVACY_COMPLIANCE: "/super-admin/privacy-compliance",
    RESEARCH: "/super-admin/research",
    RESEARCH_LIBRARY: "/super-admin/research-library",
    EXPLAINABILITY: "/super-admin/explainability",
    DEV_TRAFFIC_REPORT: "/super-admin/dev-traffic-report",
    EXPLAINABILITY_CONVERSATION: "/super-admin/explainability/c/:sessionId",
    EXPLAINABILITY_TURN: "/super-admin/explainability/c/:sessionId/t/:turnId",
    /** Wave 2 Lane 2.A (P7.1) — formerly top-level `/diagnostic-chat`; renamed and moved under super-admin. */
    AGENT_TRACE_CONSOLE: "/super-admin/agent-trace-console",
    /** Platform alert broadcasting — allowlist-gated (owner: willb77@3pp.com). */
    BROADCAST_ALERT: "/super-admin/broadcast-alert",
    /** Interview Studio — custom / topic-generated scored interview. */
    INTERVIEW_STUDIO: "/super-admin/interview-studio",
    /**
     * Live Interview — the fixed STAR-bank scored interview of a candidate.
     * Added 2026-08-12; manager and practitioner already had one, super-admin
     * did not, so the Tools menu had no super-admin target to link to.
     */
    INTERVIEW_LIVE: "/super-admin/interview-live",
  },
  MANAGER: {
    BASE: "/manager",
    DASHBOARD: "/manager/dashboard",
    TEAM: "/manager/team",
    HIRING: "/manager/hiring",
    CANDIDATES: "/manager/candidates",
    INTERVIEWS: "/manager/interviews",
    JOB_DNA: "/manager/job-dna",
    TRAINING: "/manager/training",
    CAREER_MGMT: "/manager/career-mgmt",
    TEAM_BUILDING: "/manager/team-building",
    LEADERSHIP: "/manager/leadership",
    PRISM_TEAM: "/manager/prism-team",
    ANALYTICS: "/manager/analytics",
    BULK_IMPORT: "/manager/bulk-import",
    SETTINGS: "/manager/settings",
    JOB_BLUEPRINT: "/manager/job-blueprint",
    INTERVIEW_PREP: "/manager/interview-prep",
    /** Live Scored Candidate Interview — Phase 3. The candidate is NOT the signed-in user. */
    INTERVIEW_LIVE: "/manager/interview-live",
    /** Interview Studio — custom / topic-generated scored interview (career discovery, values, etc.). */
    INTERVIEW_STUDIO: "/manager/interview-studio",
    TEAM_COMPOSITION: "/manager/team-composition",
    // Team Development Studio (behind VITE_FEATURE_TEAM_DEVELOPMENT)
    DEVELOPMENT: "/manager/development",
    DEVELOPMENT_MEMBER: "/manager/development/:memberId",
  },
  COMPANY_ADMIN: {
    BASE: "/company-admin",
    DASHBOARD: "/company-admin/dashboard",
    USERS: "/company-admin/users",
    ORGANIZATION: "/company-admin/organization",
    COSTS: "/company-admin/costs",
    PRISM_OVERVIEW: "/company-admin/prism-overview",
    ANALYTICS: "/company-admin/analytics",
    SETTINGS: "/company-admin/settings",
    BULK_IMPORT: "/company-admin/bulk-import",
    OBSERVABILITY: "/company-admin/observability",
    CULTURE: "/company-admin/culture",
  },
  PRACTITIONER: {
    BASE: "/practitioner",
    // Phase 2 (Practitioner page wireframes) — Home is the new landing surface
    // (My Workspace tile theme) and the practitioner Meridian chat is a
    // duplicate of the user "Chat with Meridian". Schedule + Meeting are
    // clickable placeholders for later phases.
    HOME: "/practitioner/home",
    MERIDIAN_CHAT: "/practitioner/meridian-chat",
    SCHEDULE: "/practitioner/schedule",
    MEETING: "/practitioner/meeting",
    DASHBOARD: "/practitioner/dashboard",
    CLIENTS: "/practitioner/clients",
    CLIENT_DETAIL: "/practitioner/clients/:clientId",
    CREDITS: "/practitioner/credits",
    PRISM_CLIENTS: "/practitioner/prism-clients",
    ANALYTICS: "/practitioner/analytics",
    SETTINGS: "/practitioner/settings",
    // Wave 4 Lane 4.D (P7.2) — task-agent forms mirrored from manager.
    JOB_BLUEPRINT: "/practitioner/job-blueprint",
    INTERVIEW_PREP: "/practitioner/interview-prep",
    /** Live Scored Candidate Interview — Phase 3. The candidate is NOT the signed-in user. */
    INTERVIEW_LIVE: "/practitioner/interview-live",
    /** Interview Studio — custom / topic-generated scored interview. */
    INTERVIEW_STUDIO: "/practitioner/interview-studio",
    TEAM_COMPOSITION: "/practitioner/team-composition",
  },
  DISTRIBUTOR: {
    BASE: "/distributor",
    DASHBOARD: "/distributor/dashboard",
    NETWORK: "/distributor/network",
    PRACTITIONERS: "/distributor/practitioners",
    CREDITS: "/distributor/credits",
    TERRITORY: "/distributor/territory",
    ANALYTICS: "/distributor/analytics",
    SETTINGS: "/distributor/settings",
  },
  // GRANT financial-aid vertical (flag-gated by user_preferences.enabled_verticals)
  GRANT: {
    BASE: "/vertical/grant",
    DASHBOARD: "/vertical/grant/dashboard",
    PROFILE: "/vertical/grant/profile",
    FEDERAL: "/vertical/grant/federal",
    SCHOLARSHIPS: "/vertical/grant/scholarships",
    INSTITUTIONS: "/vertical/grant/institutions",
    APPLICATIONS: "/vertical/grant/applications",
    COMPARE: "/vertical/grant/compare",
    LOANS: "/vertical/grant/loans",
    PLAN: "/vertical/grant/plan",
    // Coach surface — a practitioner/coach/super-admin managing a student roster.
    COACH_STUDENTS: "/vertical/grant/coach/students",
    /** Route pattern for the per-student intake (matched by <Route path>). */
    COACH_STUDENT_INTAKE: "/vertical/grant/coach/students/:studentId",
    /** Build the per-student intake path for a concrete student id. */
    coachStudentIntake: (studentId: string) =>
      `/vertical/grant/coach/students/${studentId}`,
  },
  // Job DNA / Job Blueprint authoring vertical
  // (flag-gated by user_preferences.enabled_verticals: "job-blueprint").
  JOB_DNA: {
    BASE: "/vertical/job-blueprint",
    DASHBOARD: "/vertical/job-blueprint/dashboard",
    AUTHORING: "/vertical/job-blueprint/authoring",
    /** Route pattern for a single Job DNA detail (matched by <Route path>). */
    DNA_DETAIL: "/vertical/job-blueprint/dna/:id",
    /** Build the detail path for a concrete Job DNA id. */
    dnaDetail: (id: string) => `/vertical/job-blueprint/dna/${id}`,
    CANDIDATES: "/vertical/job-blueprint/candidates",
    PIPELINE: "/vertical/job-blueprint/pipeline",
    SCORECARDS: "/vertical/job-blueprint/scorecards",
    ANALYTICS: "/vertical/job-blueprint/analytics",
  },
  // The Honor Foundation — Coach Workbench vertical
  // (entitlement-gated by enabled_verticals: "honor").
  HONOR: {
    BASE: "/vertical/honor",
    DASHBOARD: "/vertical/honor/dashboard",
    CASELOAD: "/vertical/honor/caseload",
    ONBOARD: "/vertical/honor/onboard",
    EVALUATE: "/vertical/honor/evaluate",
    RESUME: "/vertical/honor/resume",
    ACTIVITY: "/vertical/honor/activity",
    SCHEDULE: "/vertical/honor/schedule",
    ADMINISTRATION: "/vertical/honor/administration",
    /** Member workspace base — redirects to the first assigned member. */
    MEMBER: "/vertical/honor/member",
    /** Route pattern for a member workspace (matched by <Route path>). */
    MEMBER_DETAIL: "/vertical/honor/member/:memberId",
    /** Build the member-workspace path for a concrete member id. */
    memberWorkspace: (memberId: string) =>
      `/vertical/honor/member/${memberId}`,
  },
  // Job-Fit vertical — person-side profile↔role matching
  // (entitlement-gated by enabled_verticals: "job-fit").
  JOB_FIT: {
    BASE: "/vertical/job-fit",
    MATCHES: "/vertical/job-fit/matches",
    GAPS: "/vertical/job-fit/gaps",
    PATHWAY: "/vertical/job-fit/pathway",
    BLUEPRINT: "/vertical/job-fit/blueprint",
    COACH: "/vertical/job-fit/coach",
    /** Neutral D7 target service consumer — preview the target for a pasted JD. */
    TARGET: "/vertical/job-fit/target",
    /** Route pattern for a single role's fit detail (matched by <Route path>). */
    DETAIL: "/vertical/job-fit/fit/:jobId",
    /** Build the fit-detail path for a concrete role id. */
    detail: (jobId: string) => `/vertical/job-fit/fit/${jobId}`,
  },
  // Knowledge Continuity vertical (flag-gated by user_preferences.enabled_verticals)
  KNOWLEDGE_CONTINUITY: {
    BASE: "/vertical/knowledge-continuity",
    DASHBOARD: "/vertical/knowledge-continuity/dashboard",
    BLUEPRINT: "/vertical/knowledge-continuity/blueprint",
    CAPTURE: "/vertical/knowledge-continuity/capture",
    REVIEW: "/vertical/knowledge-continuity/review",
    CURRICULUM: "/vertical/knowledge-continuity/curriculum",
  },
  // Lumen — B2C personal diagnostics + just-in-time coaching
  // (entitlement-gated by enabled_verticals: "lumen"). Self-Portrait and
  // Moments routes land with their surfaces.
  LUMEN: {
    BASE: "/vertical/lumen",
    DASHBOARD: "/vertical/lumen/dashboard",
    SELF_PORTRAIT: "/vertical/lumen/self-portrait",
    MOMENTS: "/vertical/lumen/moments",
    // COACHING removed 2026-08-12 — page, hook and question bank deleted. The
    // path itself still resolves in routes.tsx, but only as a redirect to the
    // dashboard for old bookmarks, so there is nothing here to link to.
    SETTINGS: "/vertical/lumen/settings",
    ONBOARDING: "/vertical/lumen/onboarding",
  },
  // Direction Setting — the guided path from jobless to employed
  // (entitlement-gated by enabled_verticals: "direction-setting"). The journey
  // map is the home surface; every other route is one stage of it, reachable
  // from the map or directly, because the journey is resumed over weeks and
  // nobody re-walks it from the top.
  DIRECTION_SETTING: {
    BASE: "/vertical/direction-setting",
    JOURNEY: "/vertical/direction-setting/journey",
    ESTABLISH: "/vertical/direction-setting/establish",
    PORTRAIT: "/vertical/direction-setting/portrait",
    CAREERS: "/vertical/direction-setting/careers",
    SALARY: "/vertical/direction-setting/salary",
    GOALS: "/vertical/direction-setting/goals",
    ALIGNMENT: "/vertical/direction-setting/alignment",
    MATCHES: "/vertical/direction-setting/matches",
    PLAN: "/vertical/direction-setting/plan",
    INTERVIEW: "/vertical/direction-setting/interview",
    REHEARSE: "/vertical/direction-setting/rehearse",
  },
  ONBOARDING: {
    ONE: "/onboarding/one",
    TWO: "/onboarding/two",
    THREE: "/onboarding/three",
    FOUR: "/onboarding/four",
    FIVE: "/onboarding/five",
    WIZARD: "/onboarding/wizard",
  },
  ONBOARDING_DETAILS: {
    ONE: "/onboarding/details/one",
    TWO: "/onboarding/details/two",
  },
} as const;

export const NEXT_STEPS = {
  VERIFY_MFA: "verify_mfa",
  CREATE_PROFILE: "create_profile",
  VERIFY_EMAIL: "verify_email",
  RESEND_OTP: "resend_otp",
} as const;

export const ROUTES_MAGIC = {
  MAGIC_LOGIN: "/magic-login",
  MAGIC_VERIFY: "/magic-verify",
} as const;

export const ROLES = {
  USER: "user",
  MANAGER: "manager",
  COMPANY_ADMIN: "company-admin",
  PRACTITIONER: "practitioner",
  DISTRIBUTOR: "distributor",
  SUPER_ADMIN: "super-admin",
  /** @deprecated kept for backward compatibility with existing data */
  ADMIN: "admin",
  /** @deprecated kept for backward compatibility with existing data */
  MANAGER_ADMIN: "manager-admin",
} as const;

export const PATHS = {
  SUPER_ADMIN_PREFIX: "/super-admin",
  MANAGER_PREFIX: "/manager",
  COMPANY_ADMIN_PREFIX: "/company-admin",
  PRACTITIONER_PREFIX: "/practitioner",
  DISTRIBUTOR_PREFIX: "/distributor",
} as const;

export const STORAGE_KEYS = {
  USER_TOKEN: "auth_token",
  USER_EMAIL: "user_email",
  USER_OBJ: "auth_user_obj",
  USER_REFRESH_TOKEN: "auth_refresh_token",
  USER_ROLE: "auth_role",
  USER_ONBOARDING: "auth_onboarding_done",
  USER_PASSWORD: "user_password",
  USER_SESSION: "auth_session",
  USER_NEXT_STEP: "auth_next_step",
  UI_SIDEBAR_OPEN: "ui_sidebar_open",
  UI_ALEX_FLOATING_OPEN: "ui_alex_floating_open",
} as const;
