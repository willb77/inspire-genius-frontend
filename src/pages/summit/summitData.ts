/**
 * Summit — Goal Setting surface: mock domain data.
 *
 * Ported from the delivered clickable wireframe
 * (verticals/goal-setting/wireframe/summit.html). Used by the Summit pages
 * until the goal store + document-writer endpoints land (Phase 3). The
 * Meridian chat panel is wired to the live Agent Engine now.
 */

export type PrismDim = { dim: string; score: number; hue: string };
export type Quad = {
  key: string;
  name: string;
  sub: string;
  score: number;
  hue: string;
  dominant?: boolean;
  desc: string;
};
export type MapRow = { name: string; sub: string; val: number; hue: string };
export type CategoryStatus = "explored" | "active" | "todo";
export type Category = {
  n: number;
  key: string;
  label: string;
  status: CategoryStatus;
  goals: number;
  insight: string;
  summary: string;
};
export type GoalAlign = "lever" | "stretch" | "counter";
export type GoalStatus = "confirmed" | "progress" | "proposed";
export type Goal = {
  title: string;
  cat: string;
  status: GoalStatus;
  why: string;
  prism: string;
  align: GoalAlign;
  alignLabel: string;
  style: string;
  metric: string;
  coach: string;
};
export type Coach = {
  role: string;
  agents: string;
  count: number;
  icon: string;
  focus: string;
};
export type Writer = {
  key: string;
  name: string;
  icon: string;
  len: string;
  desc: string;
  pulls: string;
};
export type LadderRung = { role: string; body: string; cls: "q" | "a" | "root" };
export type Milestone = { done: boolean; txt: string; goal: string };
export type Delta = { when: string; text: string; tone: string };

// Teal / navy / gold Summit palette (matches the wireframe).
export const HUES = {
  teal: "#127A8A",
  tealDeep: "#0E5F6B",
  gold: "#C88B1B",
  sage: "#5B8A72",
  rose: "#C2614F",
  ink: "#13294B",
  mist: "#7C93B5",
  qGold: "#C88B1B",
  qGreen: "#5B8A72",
  qBlue: "#1D3A66",
  qRed: "#C2614F",
} as const;

export const USER = { name: "Daniel Reyes", initials: "DR", role: "Operations Analyst · 4 yrs" };

export const PRISM: PrismDim[] = [
  { dim: "Delivering", score: 78, hue: HUES.qRed },
  { dim: "Focusing", score: 71, hue: HUES.qRed },
  { dim: "Initiating", score: 52, hue: HUES.qGreen },
  { dim: "Innovating", score: 63, hue: HUES.qGreen },
  { dim: "Supporting", score: 84, hue: HUES.qBlue },
  { dim: "Co-Ordinating", score: 80, hue: HUES.qBlue },
  { dim: "Evaluating", score: 88, hue: HUES.qGold },
  { dim: "Finishing", score: 86, hue: HUES.qGold },
];

export const QUADS: Quad[] = [
  { key: "gold", name: "Gold", sub: "Finishing + Evaluating", score: 87, hue: HUES.qGold, dominant: true, desc: "Stability, harmony, process. Frame goals as steady, step-by-step milestones on a predictable cadence." },
  { key: "blue", name: "Blue", sub: "Supporting + Co-Ordinating", score: 82, hue: HUES.qBlue, desc: "Logical, precise, supportive. Frame goals around measurable, realistic metrics and clear evidence." },
  { key: "red", name: "Red", sub: "Focusing + Delivering", score: 74, hue: HUES.qRed, desc: "Results-oriented, fast. Frame stretch goals as quick wins with visible, tangible outcomes." },
  { key: "green", name: "Green", sub: "Innovating + Initiating", score: 58, hue: HUES.qGreen, desc: "Big-picture, imaginative. A non-preference — access it deliberately for vision work, don't force it." },
];

export const MAPS: MapRow[] = [
  { name: "Underlying", sub: "natural self", val: 64, hue: HUES.sage },
  { name: "Adapted", sub: "role-shaped", val: 83, hue: HUES.gold },
  { name: "Consistent", sub: "actual", val: 74, hue: HUES.teal },
];

export const CATEGORIES: Category[] = [
  { n: 1, key: "history", label: "Career History", status: "explored", goals: 1, insight: "Studied finance, pivoted to operations by opportunity — a consistent thread of 'making messy systems run cleanly.'", summary: "3 sessions" },
  { n: 2, key: "job", label: "Current Job Situation", status: "explored", goals: 2, insight: "A typical day is 60% firefighting. Energized by process design, drained by ad-hoc status chasing. Wants to 'work smarter.'", summary: "job description uploaded" },
  { n: 3, key: "workplace", label: "Workplace Situation", status: "active", goals: 1, insight: "High-churn reorg underway. Gold-dominant profile in a fast-changing org — a stress signal we're actively exploring.", summary: "in progress" },
  { n: 4, key: "ambitions", label: "Career Ambitions", status: "todo", goals: 0, insight: "Not yet explored. Next session: next-role clarity, timeline, and the earning target.", summary: "not started" },
  { n: 5, key: "personal", label: "Personal Goals", status: "todo", goals: 0, insight: "Not yet explored. Coaches youth basketball — likely transferable leadership signal to surface.", summary: "not started" },
];

export const GOALS: Goal[] = [
  { title: "Lead the ops-reporting redesign end to end", cat: "Current Job", status: "confirmed", why: "Not 'get visibility' — Daniel wants to stop being the human status-API so his team trusts the numbers without him in the room.", prism: "Evaluating 88 · Finishing 86", align: "lever", alignLabel: "Leverages strength", style: "Gold · stepwise", metric: "Automated dashboard replaces 4 manual reports by Q3", coach: "Job Mentor · Echo" },
  { title: "Build comfort leading through ambiguity", cat: "Workplace", status: "progress", why: "The reorg keeps changing the ground. Root: he fears 'looking like he doesn't have it together' in front of a team that counts on him.", prism: "Green 58 (non-preference)", align: "stretch", alignLabel: "Requires stretch", style: "Red · quick wins", metric: "Run 3 'decide-with-70%-info' calls without escalating", coach: "PRISM Coach · Aura" },
  { title: "Map the path to an Ops Manager role", cat: "Current Job", status: "proposed", why: "He's led projects but never people formally. Root: wants proof his way of 'making systems run' scales beyond his own desk.", prism: "Supporting 84 · Co-Ordinating 80", align: "lever", alignLabel: "Leverages strength", style: "Blue · measurable", metric: "Define the 4 capability gaps + a 12-mo close plan", coach: "Career Coach · Nova" },
  { title: "Turn firefighting into a coachable playbook", cat: "Career History", status: "proposed", why: "His pivot superpower is 'cleaning up messy systems.' Root: he wants that to be recognized as a discipline, not luck.", prism: "Finishing 86 · Delivering 78", align: "counter", alignLabel: "Counterbalance", style: "Gold · stepwise", metric: "Document 5 recurring fires + prevention SOP", coach: "Job Mentor · Forge" },
];

export const COACHES: Coach[] = [
  { role: "Job Mentor", agents: "Echo · Forge", count: 2, icon: "briefcase", focus: "Current-role excellence — performance, team dynamics, job-specific skills, day-to-day productivity." },
  { role: "Career Coach", agents: "Nova · Ascend · Bridge", count: 1, icon: "trend", focus: "Strategic advancement — next-role prep, pivots, leadership development, positioning, long-term trajectory." },
  { role: "PRISM Coach", agents: "Aura", count: 1, icon: "brain", focus: "Behavioral effectiveness — stress, adaptability, communication style, conflict, emotional intelligence." },
];

export const LADDER: LadderRung[] = [
  { role: "Stated goal", body: "“I want to get better at leading through change.”", cls: "a" },
  { role: "Summit asks", body: "Why does that feel important right now?", cls: "q" },
  { role: "Daniel", body: "The reorg keeps shifting and my team looks to me for answers.", cls: "a" },
  { role: "Summit asks", body: "What makes having the answers matter so much to you?", cls: "q" },
  { role: "Daniel", body: "If I hesitate, they'll think I don't have it together.", cls: "a" },
  { role: "Summit asks", body: "And why is that particular thing hard to sit with?", cls: "q" },
  { role: "True motivation", body: "He's not chasing a skill — he's protecting how his team sees him under pressure. That's what the reframe hooks onto.", cls: "root" },
];

export const MILESTONES: Milestone[] = [
  { done: true, txt: "PRISM report reviewed with Aura", goal: "precondition" },
  { done: true, txt: "Career History + Current Job categories explored", goal: "Discovery" },
  { done: true, txt: "First goal confirmed: ops-reporting redesign", goal: "Goal 1" },
  { done: false, txt: "Finish Workplace Situation category", goal: "Goal 2 in progress" },
  { done: false, txt: "Explore Ambitions + Personal categories", goal: "next session" },
];

export const DELTAS: Delta[] = [
  { when: "v3 · today", text: "Workplace category surfaced a Gold-in-churn stress signal. Added the 'leading through ambiguity' goal and routed it to Aura.", tone: HUES.teal },
  { when: "v2 · 4 days ago", text: "WHY ladder on 'better leadership' reached its true root (protecting team perception). Goal reframed from skill-gap to reward.", tone: HUES.gold },
  { when: "v1 · created", text: "Initial goal set drafted from PRISM profile + Career History and Current Job discovery.", tone: HUES.mist },
];

export const WRITERS: Writer[] = [
  { key: "resume", name: "Résumé", icon: "file", len: "1 page · ATS-ready", desc: "A tight, achievement-first résumé tuned to your target Ops Manager role.", pulls: "Career History · Current Job · Skills · Ambitions" },
  { key: "cv", name: "CV", icon: "penLine", len: "2–3 pages · comprehensive", desc: "A full curriculum vitae — complete history, education, projects, credentials.", pulls: "Career History · Current Job · Education · Projects" },
  { key: "bio", name: "Professional Bio", icon: "idCard", len: "short · medium · long", desc: "A first- or third-person narrative bio, PRISM-informed for tone.", pulls: "PRISM profile · Ambitions · Personal Goals" },
  { key: "history", name: "Job History", icon: "history", len: "chronological", desc: "A clean, structured work-history record for any application form.", pulls: "Career History · Current Job" },
  { key: "wikipedia", name: "Wikipedia Article", icon: "book", len: "encyclopedic · cited", desc: "A neutral, third-person encyclopedic article with an infobox and sections.", pulls: "Career History · notable work · public roles" },
  { key: "linkedin", name: "LinkedIn Profile", icon: "linkedin", len: "headline + About + roles", desc: "A LinkedIn headline, About section, and experience blurbs tuned for search.", pulls: "Current Job · Ambitions · PRISM strengths · Skills" },
];

export const SUMMIT_QUICK_PROMPTS = [
  "Where am I in goal-setting?",
  "Why these goals?",
  "What does my PRISM say?",
];
