// The Honor Foundation — Coach Workbench: TYPED MOCK fixtures (Phase 0 scaffold).
//
// These back the Honor coach hooks so the reskinned surface renders real-looking
// data before each screen is flipped live onto the EXISTING Core endpoints it
// reuses (Simplified Vertical Model — see coach.service.ts: GRANT-style coach
// roster, Meridian async-jobs, PRISM, documents). Each hook references
// `USE_HONOR_MOCKS`; flip it to `false` (per screen) to go live. Ported from the
// delivered THF wireframe's in-JS mock model.
//
// NOTE: mock data only — do NOT ship as production truth.

import type {
  CoachActivityRow,
  CoachHome,
  CoachRecord,
  CompareMetric,
  EvaluateAnswer,
  HonorFellow,
  HonorResume,
  ScheduleEvent,
  TeamRecord,
  TransitionGoal,
} from "@/types/honor"

/** Master switch for the Honor mock-data layer (Phase 0 = fixtures). */
export const USE_HONOR_MOCKS = true

/**
 * PR B live-wiring flags — flip individual surfaces onto the now-real Core.
 *
 * ROSTER_LIVE: caseload / member / dashboard read the live coach roster
 *   (GET /v1/agents/honor/coach/students — the PR A agent-engine delta).
 * EVAL_LIVE: the Evaluate chat uses the live Meridian async-jobs transport
 *   (POST /v1/agents/chat/async, context.surface="honor"), with a graceful
 *   fallback to the seeded canned answers on error so the surface never breaks.
 * ACTIVITY_LIVE: the Activity feed reads the live conversation/audit history
 *   (GET /v1/chat/history), scoped to the signed-in coach's JWT.
 * Schedule / Administration stay on fixtures — Schedule's calendar sync is an
 * explicit Phase-2 stub in the wireframe, and Administration's coach-of-coaches
 * management has no dedicated Core endpoint yet.
 */
export const USE_HONOR_ROSTER_LIVE = true
export const USE_HONOR_EVAL_LIVE = true
export const USE_HONOR_ACTIVITY_LIVE = true

/**
 * Phase 3 — the deterministic evaluate route (POST …/{fellow_id}/evaluate).
 * When on, the Evaluate surface runs the config-weighted fit scorer server-side
 * and renders the cited, ranked sections; Meridian narration (EVAL_LIVE) becomes
 * an optional prose layer on top. Off → the surface stays chat-only.
 */
export const USE_HONOR_EVAL_DETERMINISTIC = true

/**
 * Phase 4 — email delivery of the branded report/résumé PDF. **Ships OFF.**
 * Branded PDF export + print + download are always live; emailing a Fellow's
 * confidential evaluation is gated behind this flag AND the server-side
 * `honor_report_email` flag AND an in-UI confirm (email is always-confirm, and
 * SES identity verification + the Phase-0 confidential-email authorization must
 * land first). Flip to `true` only once those gates clear.
 */
export const USE_HONOR_REPORT_EMAIL = false

/**
 * Phase 5 — generative résumé writer. The SURFACE is always live (navigable,
 * exportable); "Generate" calls the server route, which ships **dark** behind the
 * server `honor_resume` flag (returns `{ disabled: true }`) until the Phase-0
 * safe-translation SME sign-off lands. While disabled the surface renders a
 * clearly-labeled {@link MOCK_RESUME} sample so the layout + branded PDF export
 * stay demoable. This flag only forces the sample path in tests/Storybook.
 */
export const USE_HONOR_RESUME_SAMPLE = false

/** The signed-in coach persona shown in the wireframe. */
export const MOCK_COACH = {
  name: "S. Carter",
  title: "Transition Mentor",
  initials: "SC",
}

export const MOCK_FELLOWS: HonorFellow[] = [
  {
    id: "2201",
    firstName: "Marcus",
    lastName: "Reyes",
    email: "marcus.reyes@honor.org",
    background: "Naval Special Warfare",
    target: "Program Management",
    prism: { label: "Gold-Green", quads: ["G", "N"] },
    disc: "DC",
    cliftonStrengths: ["Achiever", "Discipline", "Focus"],
    status: "assessed",
    cohort: "Cohort 2026-A",
    docs: [
      { id: "d-2201-1", name: "Reyes_Resume.pdf", kind: "resume", uploadedAt: "2026-07-02" },
      { id: "d-2201-2", name: "Mission_Narrative.docx", kind: "bio", uploadedAt: "2026-07-02" },
    ],
  },
  {
    id: "2202",
    firstName: "Dana",
    lastName: "Whitfield",
    email: "dana.whitfield@honor.org",
    background: "Special Forces (18-series)",
    target: "Cybersecurity",
    prism: { label: "Blue-Gold", quads: ["B", "G"] },
    disc: "CD",
    cliftonStrengths: ["Analytical", "Learner", "Deliberative"],
    status: "assessed",
    cohort: "Cohort 2026-A",
    docs: [{ id: "d-2202-1", name: "Whitfield_Resume.pdf", kind: "resume", uploadedAt: "2026-07-03" }],
  },
  {
    id: "2203",
    firstName: "Aiko",
    lastName: "Nakamura",
    email: "aiko.nakamura@honor.org",
    background: "SOF Intelligence",
    target: "Product / Strategy",
    prism: { label: "Blue-Green", quads: ["B", "N"] },
    disc: "SC",
    cliftonStrengths: ["Strategic", "Ideation", "Input"],
    status: "assessed",
    cohort: "Cohort 2026-A",
    docs: [],
  },
  {
    id: "2204",
    firstName: "Jesse",
    lastName: "Calloway",
    email: "jesse.calloway@honor.org",
    background: "Pararescue (PJ)",
    target: "Healthcare Operations",
    prism: { label: "Green-Gold", quads: ["N", "G"] },
    disc: null,
    cliftonStrengths: [],
    status: "intake-pending",
    cohort: "Cohort 2026-B",
    docs: [],
  },
  {
    id: "2205",
    firstName: "Theo",
    lastName: "Okonkwo",
    email: "theo.okonkwo@honor.org",
    background: "Naval Special Warfare",
    target: "Finance / PE",
    prism: { label: "Gold-Orange", quads: ["G", "O"] },
    disc: "D",
    cliftonStrengths: ["Competition", "Significance", "Focus"],
    status: "assessed",
    cohort: "Cohort 2026-B",
    docs: [{ id: "d-2205-1", name: "Okonkwo_Resume.pdf", kind: "resume", uploadedAt: "2026-07-05" }],
  },
  {
    id: "2206",
    firstName: "Rosa",
    lastName: "Delgado",
    email: "rosa.delgado@honor.org",
    background: "MARSOC",
    target: "Sales Leadership",
    prism: { label: "Orange-Green", quads: ["O", "N"] },
    disc: null,
    cliftonStrengths: [],
    status: "intake-pending",
    cohort: "Cohort 2026-B",
    docs: [],
  },
]

/** Caseload stat pills (kept separate from the visible sample, per the wireframe). */
export const MOCK_CASELOAD_COUNTS = { assigned: 28, assessed: 21, intakePending: 7 }

export const MOCK_COACH_HOME: CoachHome = {
  coachName: MOCK_COACH.name,
  coachTitle: MOCK_COACH.title,
  counts: MOCK_CASELOAD_COUNTS,
  recentActivity: [],
  upcomingEvents: [],
}

/** Compare-matrix metrics (0–100 per fellow) shown on the Evaluate surface. */
export const MOCK_COMPARE_METRICS: CompareMetric[] = [
  { label: "Leadership readiness", scores: { "2201": 82, "2202": 68, "2203": 74, "2205": 88 } },
  { label: "Client-facing fit", scores: { "2201": 76, "2202": 55, "2203": 71, "2205": 84 } },
  { label: "Adaptability to ambiguity", scores: { "2201": 80, "2202": 72, "2203": 86, "2205": 70 } },
  { label: "Onboarding structure needed", scores: { "2201": 40, "2202": 65, "2203": 48, "2205": 35 } },
]

/** Seeded prompt chips on the Evaluate chat. */
export const MOCK_EVAL_PROMPTS = [
  "What careers is this member a fit for?",
  "Where will they struggle in a corporate role?",
  "Best fit for a client-facing leadership role",
  "Complementary pairing for a two-person pod",
]

/** Canned Meridian replies (with agent traces) for the Evaluate chat. */
export const MOCK_EVAL_ANSWERS: EvaluateAnswer[] = [
  {
    key: "fit",
    question: "What careers is this member a fit for?",
    trace: ["Aura", "James", "Nova", "Meridian"],
    html: "<p><strong>Program &amp; Operations Management</strong> is the strongest fit. The Gold-Green PRISM pattern plus Achiever/Discipline/Focus points to structured, outcome-owning roles. Their mission-planning cycle maps cleanly to program management — scoping, sequencing, and driving cross-functional execution.</p><p>Adjacent fits: Operations Lead, Technical Program Manager, Chief of Staff.</p>",
  },
  {
    key: "struggle",
    question: "Where will they struggle in a corporate role?",
    trace: ["Aura", "Nova", "Meridian"],
    html: "<p>Early friction is most likely around <strong>ambiguous ownership and slow consensus cultures</strong>. Coming from a high-clarity chain of command, they may over-index on decisiveness before organizational trust is built. Coach toward stakeholder mapping and patience with matrixed decision-making.</p>",
  },
  {
    key: "insight",
    question: "Best fit for a client-facing leadership role",
    trace: ["Aura", "James", "Meridian"],
    html: "<p>Viable with support. The Gold energy carries executive presence; the growth edge is translating <em>directive</em> communication into <em>consultative</em> client language. Pair with a mock-interview cycle (Maven) before placing in a quota-carrying seat.</p>",
  },
  {
    key: "plan",
    question: "Complementary pairing for a two-person pod",
    trace: ["Aura", "James", "Nova", "Meridian"],
    html: "<p>Pair <strong>Marcus Reyes (Gold-Green)</strong> with <strong>Aiko Nakamura (Blue-Green)</strong>: Marcus drives execution and pace while Aiko brings strategic framing and analytical depth. The shared Green dimension keeps collaboration cohesive; the Gold/Blue contrast covers both delivery and strategy.</p>",
  },
]

export const MOCK_GOALS: TransitionGoal[] = [
  { id: "g1", fellowId: "2201", title: "Translate one SOF mission story into STAR résumé format", progress: 70 },
  { id: "g2", fellowId: "2201", title: "Complete PMP certification prep (35 contact hours)", progress: 25 },
]

/** Ascend-suggested goals (not yet accepted). */
export const MOCK_SUGGESTED_GOALS: TransitionGoal[] = [
  { id: "sg1", fellowId: "2201", title: "Run 3 informational interviews with corporate PMs", progress: 0, suggested: true },
  { id: "sg2", fellowId: "2201", title: "Draft a 90-day transition plan with Meridian", progress: 0, suggested: true },
]

export const MOCK_ACTIVITY: CoachActivityRow[] = [
  { id: "a1", actor: "S. Carter", email: "s.carter@honor.org", event: "Ran evaluation on Marcus Reyes — 'career fit'", when: "2026-07-13 09:42", eventId: "evt_9f3a", conversationId: "conv_7c21" },
  { id: "a2", actor: "Marcus Reyes", email: "marcus.reyes@honor.org", event: "Completed PRISM questionnaire (Part 1A)", when: "2026-07-13 09:05", eventId: "evt_9e11", conversationId: "conv_7b98" },
  { id: "a3", actor: "S. Carter", email: "s.carter@honor.org", event: "Imported cohort cohort_2026.csv (12 fellows)", when: "2026-07-12 16:20", eventId: "evt_9d02", conversationId: "conv_7a55" },
  { id: "a4", actor: "Meridian AI (agent trace)", email: "system@inspiresgenius.com", event: "Generated 90-day transition plan for Marcus Reyes", when: "2026-07-12 16:22", eventId: "evt_9d09", conversationId: "conv_7a55" },
  { id: "a5", actor: "S. Carter", email: "s.carter@honor.org", event: "Set goal for Marcus Reyes (PMP prep)", when: "2026-07-12 15:58", eventId: "evt_9c77", conversationId: "conv_79f0" },
  { id: "a6", actor: "Dana Whitfield", email: "dana.whitfield@honor.org", event: "Uploaded résumé (Whitfield_Resume.pdf)", when: "2026-07-11 11:14", eventId: "evt_9b31", conversationId: "conv_7822" },
  { id: "a7", actor: "Rosa Delgado", email: "rosa.delgado@honor.org", event: "Accepted magic-link invite — account activated", when: "2026-07-11 08:40", eventId: "evt_9a08", conversationId: "conv_7710" },
  { id: "a8", actor: "S. Carter", email: "s.carter@honor.org", event: "Attempted to open member #4471 — 403 denied", when: "2026-07-10 14:03", eventId: "evt_98f4", conversationId: "conv_75c9" },
  { id: "a9", actor: "S. Carter", email: "s.carter@honor.org", event: "Evaluated Theo Okonkwo — 'client-facing fit'", when: "2026-07-10 10:31", eventId: "evt_9822", conversationId: "conv_7480" },
]

export const MOCK_SCHEDULE: ScheduleEvent[] = [
  { id: "e1", date: "2026-07-13", time: "09:00", title: "PRISM debrief", fellow: "Marcus Reyes" },
  { id: "e2", date: "2026-07-13", time: "11:30", title: "Goal review", fellow: "Theo Okonkwo" },
  { id: "e3", date: "2026-07-13", time: "14:00", title: "Cohort 2026-A check-in" },
  { id: "e4", date: "2026-07-15", time: "10:00", title: "Mock interview (Maven)", fellow: "Aiko Nakamura" },
  { id: "e5", date: "2026-07-16", time: "13:00", title: "Funding / SkillBridge session", fellow: "Dana Whitfield" },
  { id: "e6", date: "2026-07-18", time: "09:30", title: "90-day plan checkpoint", fellow: "Marcus Reyes" },
  { id: "e7", date: "2026-07-21", time: "15:00", title: "New cohort onboarding kickoff" },
]

export const MOCK_COACHES: CoachRecord[] = [
  { id: "c1", name: "S. Carter", email: "s.carter@honor.org", title: "Transition Mentor", teams: ["Cohort 2026-A"] },
  { id: "c2", name: "J. Morales", email: "j.morales@honor.org", title: "Career Coach", teams: ["Cohort 2026-B"] },
  { id: "c3", name: "T. Bishop", email: "t.bishop@honor.org", title: "Transition Mentor", teams: ["SOF Transition Pod"] },
]

export const MOCK_TEAMS: TeamRecord[] = [
  { id: "t1", name: "Cohort 2026-A", memberCount: 28 },
  { id: "t2", name: "Cohort 2026-B", memberCount: 19 },
  { id: "t3", name: "SOF Transition Pod", memberCount: 11 },
]

/**
 * Sample résumé shown on the Evaluate/Résumé surface while live generation is
 * dark (server `honor_resume` off). Clearly a demo layout — safe-translated,
 * grounded in no real Fellow. Mirrors the backend `HonorResume` shape.
 */
export const MOCK_RESUME: HonorResume = {
  fellow_id: "2201",
  target: "Operations & Program Management",
  headline: "Operations & Program Management Leader",
  summary:
    "Disciplined operations leader who translates a decade of elite team leadership into "
    + "measurable private-sector results. Trusted to plan complex programs, make high-stakes "
    + "risk decisions, and develop high-performing teams under pressure.",
  competencies: [
    "Program & project management",
    "Cross-functional team leadership",
    "Risk assessment & mitigation",
    "Operational planning",
    "Stakeholder communication",
    "Budget & resource stewardship",
    "Training & mentorship",
    "Crisis decision-making",
  ],
  experience: [
    {
      title: "Operations Team Lead",
      organization: "U.S. Naval Special Warfare",
      dates: "2016 – 2024",
      bullets: [
        "Led a 12-person team delivering complex, time-critical operations on schedule.",
        "Owned planning and risk decisions for multi-million-dollar equipment and assets.",
        "Built and mentored teams that consistently exceeded readiness and performance standards.",
      ],
    },
    {
      title: "Team Member / Specialist",
      organization: "U.S. Navy",
      dates: "2012 – 2016",
      bullets: [
        "Executed demanding assignments requiring precision, discipline, and adaptability.",
        "Trained peers on procedures, safety, and mission-critical systems.",
      ],
    },
  ],
  education: ["B.S., Organizational Leadership (in progress)"],
  certifications: ["Project Management Professional (PMP) — pursuing"],
  frameworks: ["PRISM"],
  sources: ["Sample data — not a real Fellow"],
  grounded: false,
  disclaimer:
    "Sample layout shown while résumé generation is pending activation. Live drafts are "
    + "written from the Fellow's own profile and documents, framed by THF safe-translation rules, "
    + "and must be reviewed by the coach before use.",
}
