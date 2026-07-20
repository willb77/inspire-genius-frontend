/**
 * Team Development Studio — centralized copy + display config.
 *
 * All user-facing strings for the Studio live here so they can be routed
 * through `useFrontendText` overrides (Phase 7). `useDevelopmentText` overlays
 * any server-provided `dev.*` keys on top of these defaults; components read
 * strings via that hook, falling back to these constants.
 *
 * Enum→label maps and cross-framework mappings (Clifton→PRISM, DISC→PRISM)
 * also live here to keep panels consistent and colour-config-driven.
 */
import type {
  ConfidenceLevel,
  FitClassification,
  GapSeverity,
  GoalCategory,
  GoalHorizon,
  LearningItemStatus,
  MilestoneHorizon,
  MilestoneStatus,
  PlanStatus,
  PrismAlignmentKind,
  PrismQuadrantId,
} from "@/types/development"

/**
 * The single most important guardrail: PRISM/behavioral output is a
 * development input, never a selection/hiring decision. Shown on the Gap
 * Analysis and Career Match tabs.
 */
export const DEVELOPMENT_INPUT_DISCLAIMER =
  "This is a development input, not a selection decision. Fit signals describe " +
  "behavioral tendencies to inform coaching conversations — a human makes any " +
  "hiring, promotion, or placement decision."

export const DEV_TEXT: Record<string, string> = {
  "dev.studio.title": "Team Development Studio",
  "dev.studio.subtitle":
    "Per-member PRISM, CliftonStrengths & DISC — reconciled into goals, gaps, learning and career matches.",
  "dev.studio.search.placeholder": "Search team members…",
  "dev.studio.empty.title": "No team members yet",
  "dev.studio.empty.body":
    "Invite your team to build their development dossiers. Start by importing your roster.",
  "dev.studio.empty.cta": "Import your team",
  "dev.studio.invitePrism": "Invite to complete PRISM",
  "dev.studio.filter.coverage": "Coverage",
  "dev.studio.filter.plan": "Plan status",
  "dev.studio.filter.department": "Department",
  "dev.studio.sort.readiness": "Readiness",
  "dev.studio.sort.activity": "Last activity",
  "dev.studio.error": "Couldn't load the team roster. Try again.",

  "dev.workspace.refresh": "Refresh dossier",
  "dev.workspace.share": "Share with member",
  "dev.workspace.export": "Export PDF",
  "dev.workspace.startConversation": "Start growth conversation",
  "dev.workspace.error": "Couldn't load this member's dossier.",
  "dev.workspace.notFound": "Member not found.",

  "dev.tab.profile": "Behavioral Profile",
  "dev.tab.goals": "Goals",
  "dev.tab.gaps": "Gap Analysis",
  "dev.tab.learning": "Learning & Training",
  "dev.tab.careers": "Career & Job Matches",
  "dev.tab.roadmap": "Roadmap",

  "dev.profile.radarTitle": "PRISM behavioral map",
  "dev.profile.radarTableCaption": "PRISM 8-dimension scores (text equivalent of the radar).",
  "dev.profile.clifton": "CliftonStrengths",
  "dev.profile.disc": "DISC",
  "dev.profile.reconciliation": "Aura reconciliation",
  "dev.profile.inviteToAdd": "Invite to add",

  "dev.goals.prismNeeded.title": "PRISM needed",
  "dev.goals.prismNeeded.body": "Set this member up with Aura to map their PRISM profile before goal discovery.",
  "dev.goals.prismNeeded.cta": "Set up with Aura",
  "dev.goals.pending.title": "No goals discovered yet",
  "dev.goals.pending.body": "Invite this member to a Summit discovery session to formalize their goals.",
  "dev.goals.invite": "Invite to Summit session",
  "dev.goals.resume": "Resume session",
  "dev.goals.ratify": "Co-ratify",
  "dev.goals.comment": "Comment",

  "dev.gaps.selectTarget": "Target role",
  "dev.gaps.empty": "No gaps identified against this target.",
  "dev.gaps.closeGap": "Close this gap",

  "dev.learning.empty": "No learning items yet. Close a gap to seed one.",
  "dev.learning.assign": "Assign",

  "dev.careers.internal": "Internal",
  "dev.careers.external": "External",
  "dev.careers.setTarget": "Set as target",
  "dev.careers.viewGaps": "View gaps to this role",
  "dev.careers.draftPath": "Draft a path",

  "dev.roadmap.empty": "No milestones planned yet.",
  "dev.roadmap.share": "Share plan",

  "dev.meridian.title": "Meridian",
  "dev.meridian.subtitle": "Development assistant",
  "dev.meridian.placeholder": "Ask about this member…",
  "dev.meridian.staged": "Meridian proposed an action — review before applying.",
}

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence",
}

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  no_plan: "No plan",
  draft: "Draft",
  active: "Active",
  on_track: "On track",
  at_risk: "At risk",
}

export const GAP_SEVERITY_LABEL: Record<GapSeverity, string> = {
  critical: "Critical",
  moderate: "Moderate",
  minor: "Minor",
}

export const FIT_CLASSIFICATION_LABEL: Record<FitClassification, string> = {
  strong_fit: "Strong fit",
  potential_fit: "Potential fit",
  misalignment: "Misalignment",
}

export const GOAL_CATEGORY_LABEL: Record<GoalCategory, string> = {
  career_history: "Career history",
  current_job: "Current job",
  workplace_situation: "Workplace situation",
  career_ambitions: "Career ambitions",
  personal_goals: "Personal goals",
}

export const GOAL_HORIZON_LABEL: Record<GoalHorizon, string> = {
  short: "Short term",
  medium: "Medium term",
  long: "Long term",
}

export const PRISM_ALIGNMENT_LABEL: Record<PrismAlignmentKind, string> = {
  leverages: "Leverages",
  stretch: "Stretch",
  counterbalance: "Counterbalance",
}

export const LEARNING_STATUS_LABEL: Record<LearningItemStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
}

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
}

export const MILESTONE_HORIZON_LABEL: Record<MilestoneHorizon, string> = {
  d30: "30 days",
  d60: "60 days",
  d90: "90 days",
  q: "Quarters",
  y_plus: "12 months+",
}

/** Ordered lanes for the roadmap timeline. */
export const MILESTONE_HORIZON_ORDER: MilestoneHorizon[] = ["d30", "d60", "d90", "q", "y_plus"]

/** CliftonStrengths domain → display + PRISM quadrant mapping (for reconciliation). */
export const CLIFTON_DOMAIN_CONFIG: Record<
  "executing" | "influencing" | "relationship_building" | "strategic_thinking",
  { label: string; prismQuadrant: PrismQuadrantId }
> = {
  // Gold (4) — structured execution
  executing: { label: "Executing", prismQuadrant: 4 },
  // Red (3) — drive / assertiveness
  influencing: { label: "Influencing", prismQuadrant: 3 },
  // Green (1) — people / harmony
  relationship_building: { label: "Relationship Building", prismQuadrant: 1 },
  // Blue (2) — analysis / ideas
  strategic_thinking: { label: "Strategic Thinking", prismQuadrant: 2 },
}

/** DISC letter → label + PRISM quadrant legend. */
export const DISC_LEGEND: Record<"d" | "i" | "s" | "c", { label: string; prismQuadrant: PrismQuadrantId }> = {
  d: { label: "Dominance", prismQuadrant: 3 }, // Red
  i: { label: "Influence", prismQuadrant: 1 }, // Green (people-forward)
  s: { label: "Steadiness", prismQuadrant: 1 }, // Green
  c: { label: "Conscientiousness", prismQuadrant: 2 }, // Blue
}

/** shadcn Badge variant per confidence level. */
export const CONFIDENCE_BADGE_VARIANT: Record<ConfidenceLevel, "default" | "secondary" | "destructive" | "outline"> = {
  high: "default",
  moderate: "secondary",
  low: "outline",
}
