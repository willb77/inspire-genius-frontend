/**
 * Summit — Career Document Writer service.
 *
 * Generates career documents (résumé, CV, bio, job history, wikipedia article,
 * LinkedIn profile) from the user's goal-setting + PRISM data.
 *
 * NOTE: the backend endpoint `POST /v1/documents/generate` is Phase 3b (not yet
 * built). Until it lands, this returns structured local drafts so the Documents
 * UI is fully functional. When the endpoint exists, swap the body of
 * `generateDocuments` for the agentApi call — the return shape already matches.
 */

export type DocType =
  | "resume"
  | "cv"
  | "bio"
  | "history"
  | "wikipedia"
  | "linkedin";

export type GeneratedDoc = { type: DocType; content: string; editable: true };

const DRAFTS: Record<DocType, string> = {
  resume: `DANIEL REYES
Operations Analyst · Process & Reporting
daniel.reyes@meridian-ops.com · linkedin.com/in/danielreyes

SUMMARY
Operations analyst (4 yrs) who turns messy, manual workflows into clean, reliable
systems. Quality-first and detail-driven (PRISM: high Evaluating + Finishing),
with a record of replacing ad-hoc reporting with automated, trusted dashboards.

EXPERIENCE
Operations Analyst — Meridian Ops (2022–present)
  • Redesigning the ops-reporting stack: 4 manual reports → 1 automated dashboard (Q3 target).
  • Owns recurring-incident triage; authoring a prevention playbook from the top 5 failure modes.
  • Partner to finance and delivery on process design and coordination.
Financial Analyst (2020–2022)
  • Pivoted from finance to operations, carrying a systems-thinking lens into workflow design.

SKILLS
Process design · Reporting automation · Data analysis · Stakeholder coordination · SOP authoring

EDUCATION
B.S. Finance`,
  cv: `CURRICULUM VITAE — Daniel Reyes
Operations Analyst · Process & Reporting

PROFILE
Operations professional (4 yrs) specializing in reporting automation and process
design. Quality-first, systems-thinking operator with a finance foundation.

PROFESSIONAL EXPERIENCE
Operations Analyst — Meridian Ops (2022–present)
  • Ops-reporting redesign: consolidating 4 manual reports into 1 automated dashboard.
  • Incident-prevention playbook authored from the 5 most common recurring failures.
  • Cross-functional coordination across finance, delivery, and leadership.
Financial Analyst (2020–2022)
  • Financial reporting and analysis; transitioned into operations.

EDUCATION
  B.S. Finance

SELECTED PROJECTS
  • Automated Operations Dashboard (in progress) — replaces manual reporting.
  • Recurring-Incident Prevention SOP — standardizes triage and prevention.

STRENGTHS (PRISM)
  Evaluating (88) · Finishing (86) · Supporting (84) · Co-Ordinating (80)`,
  bio: `SHORT
Daniel Reyes is an operations analyst who turns messy, manual workflows into clean
systems people trust — and is growing from analyst into operations leadership.

MEDIUM
Daniel Reyes is an operations analyst with four years turning ad-hoc, manual
processes into reliable, automated systems. A quality-first, detail-driven operator
(a high-Evaluating, high-Finishing PRISM profile), he is currently replacing his
team's manual reporting with a single automated dashboard and mapping a deliberate
path into an Operations Manager role. Outside work he coaches youth basketball —
the same "make the system run, then step back" instinct he brings to the office.`,
  history: `WORK HISTORY — Daniel Reyes

2022 – Present   Operations Analyst · Meridian Ops
                 Reporting, process design, incident triage & prevention.

2020 – 2022      Financial Analyst
                 Financial reporting; began pivot toward operations.

Education        B.S. Finance`,
  wikipedia: `Daniel Reyes (operations analyst)

Daniel Reyes is an operations analyst known for process-reporting automation
within mid-market operations teams.[1]

Career
Reyes began his career as a financial analyst (2020–2022) before pivoting to
operations, where he focused on converting manual reporting workflows into
automated systems.[2] As of 2026 he leads an ops-reporting redesign consolidating
multiple manual reports into a single automated dashboard.[3]

Approach
Reyes is associated with a "make the system run, then step back" philosophy,
emphasizing prevention playbooks over ad-hoc firefighting.

Infobox
  • Occupation: Operations Analyst
  • Known for: Reporting automation, process design
  • Education: B.S. Finance

Note: Wikipedia has notability standards; this draft is a formatting demo only.`,
  linkedin: `HEADLINE
Operations Analyst → building the systems (and the team) that make ops run without
me in the room

ABOUT
I make messy systems run cleanly. Four years in, my signature move is taking the
reports everyone chases by hand and turning them into automation people actually
trust. I'm strongest where quality and follow-through matter (PRISM: high
Evaluating + Finishing), and I'm deliberately growing into leading through
ambiguity as my org scales.

Right now: (1) replacing 4 manual reports with one automated dashboard, and
(2) mapping my path from analyst to Ops Manager.

EXPERIENCE
Operations Analyst · Meridian Ops · 2022–present
Reporting redesign · incident-prevention playbooks · cross-team process design.`,
};

/**
 * Generate the requested documents. Local structured drafts for now; the return
 * shape matches the planned `POST /v1/documents/generate` response so the
 * caller does not change when the endpoint ships.
 */
export async function generateDocuments(types: DocType[]): Promise<GeneratedDoc[]> {
  // Simulate the round-trip so the UI shows its building state realistically.
  await new Promise((r) => setTimeout(r, 450));
  return types.map((type) => ({ type, content: DRAFTS[type], editable: true as const }));
}
