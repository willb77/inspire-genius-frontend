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
  PROFILE: "/profile",
  USER: {
    PROFILE: "/profile",
  },
  SETTINGS: "/settings",
  SETTINGS_PRIVACY: "/settings/privacy",
  HELP: "/help",
  FEEDBACK: "/feedback",
  ANALYTICS: "/analytics",
  MERIDIAN_CHAT: "/meridian/chat",
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
    DASHBOARD: "/practitioner/dashboard",
    CLIENTS: "/practitioner/clients",
    CREDITS: "/practitioner/credits",
    PRISM_CLIENTS: "/practitioner/prism-clients",
    ANALYTICS: "/practitioner/analytics",
    SETTINGS: "/practitioner/settings",
    // Wave 4 Lane 4.D (P7.2) — task-agent forms mirrored from manager.
    JOB_BLUEPRINT: "/practitioner/job-blueprint",
    INTERVIEW_PREP: "/practitioner/interview-prep",
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
  // Knowledge Continuity vertical (flag-gated by user_preferences.enabled_verticals)
  KNOWLEDGE_CONTINUITY: {
    BASE: "/vertical/knowledge-continuity",
    DASHBOARD: "/vertical/knowledge-continuity/dashboard",
    REVIEW: "/vertical/knowledge-continuity/review",
    CURRICULUM: "/vertical/knowledge-continuity/curriculum",
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
