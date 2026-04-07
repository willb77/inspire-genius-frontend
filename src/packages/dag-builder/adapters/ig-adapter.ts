/**
 * Inspire Genius ecosystem adapter.
 *
 * Serializes to/from the IG backend's TemplateCreateIn/TemplateOut format
 * at services/agent-engine/app/routes/templates.py.
 */

import type { EcosystemAdapter, AgentDefinition, EcosystemConfig } from "../types/ecosystem";
import type { DagTemplate, DagNode } from "../types/dag";
import { autoLayout, deriveEdges } from "../lib/layout";

// ─── Agent Roster (14 IG Agents) with full descriptions ─────────

export const IG_AGENTS: AgentDefinition[] = [
  // Personal Development
  {
    id: "Meridian", name: "Meridian", displayName: "Meridian",
    description: "Unified persona — synthesizes all agent outputs",
    fullDescription: "Meridian is the primary AI coaching persona and the unified entry point for the Inspire Genius platform. When multiple specialist agents contribute to a response, Meridian weaves their outputs into a single, coherent, warm, and natural reply. Users experience Meridian as their personal coach — they never see the individual agents behind the scenes. Meridian speaks in an encouraging, conversational US English voice and organizes information logically, leading with the most important insights.",
    capabilities: ["Multi-agent output synthesis", "Conversational coaching dialogue", "Goal setting and progress tracking", "Reflective questioning", "Session continuity across interactions", "Personality-aware communication style"],
    modelTier: "claude-sonnet", domain: "Personal Development", color: "#6366f1",
  },
  {
    id: "Aura", name: "Aura", displayName: "Aura",
    description: "PRISM profiling — behavioral preferences, profile interpretation",
    fullDescription: "Aura is the PRISM personality profiling specialist. It interprets users' PRISM Brain Mapping results across four behavioral quadrants (Gold, Green, Blue, Orange) to provide deep insight into temperament, communication style, strengths, and development areas. Aura contextualizes coaching conversations with behavioral data, helping other agents tailor their advice to the individual's natural preferences.",
    capabilities: ["PRISM Brain Map interpretation", "Behavioral quadrant analysis (Gold/Green/Blue/Orange)", "Temperament-based coaching adaptation", "Team profile distribution analysis", "Strength and development area identification", "Profile comparison across team members"],
    modelTier: "claude-sonnet", domain: "Personal Development", color: "#6366f1",
  },
  {
    id: "Anchor", name: "Anchor", displayName: "Anchor",
    description: "Grounding & emotional regulation",
    fullDescription: "Anchor provides grounding and emotional regulation support. When users are stressed, overwhelmed, or emotionally reactive, Anchor helps them center themselves before engaging in productive coaching. It uses evidence-based techniques for mindfulness, stress management, and emotional awareness to create a stable foundation for personal development work.",
    capabilities: ["Mindfulness and grounding exercises", "Stress management techniques", "Emotional awareness coaching", "Pre-session centering", "Resilience building strategies", "Prompt template management"],
    modelTier: "claude-sonnet", domain: "Personal Development", color: "#6366f1",
  },
  {
    id: "Echo", name: "Echo", displayName: "Echo",
    description: "Memory & pattern recognition",
    fullDescription: "Echo manages conversational memory and recognizes behavioral patterns across sessions. It retrieves relevant context from past interactions — goals discussed, progress made, commitments given, recurring themes — and surfaces them at the right moment. Echo ensures coaching conversations build on prior work rather than starting fresh each time.",
    capabilities: ["Cross-session memory retrieval", "Behavioral pattern detection", "Progress tracking across sessions", "Commitment and follow-up tracking", "Recurring theme identification", "Feedback collection and satisfaction analysis"],
    modelTier: "claude-haiku", domain: "Personal Development", color: "#6366f1",
  },
  {
    id: "Forge", name: "Forge", displayName: "Forge",
    description: "Action & accountability coaching",
    fullDescription: "Forge drives action and accountability. After insights are generated and plans are formed, Forge ensures they translate into concrete, measurable action items with deadlines and follow-up mechanisms. It also handles new user onboarding — guiding users through platform setup, PRISM assessment introduction, and initial goal setting.",
    capabilities: ["Action item creation with deadlines", "Accountability check-ins", "New user onboarding flow", "Platform setup guidance", "PRISM assessment introduction", "Goal milestone tracking"],
    modelTier: "claude-haiku", domain: "Personal Development", color: "#6366f1",
  },
  // Career & Talent
  {
    id: "Nova", name: "Nova", displayName: "Nova",
    description: "Career pathway & talent development",
    fullDescription: "Nova focuses on career pathways and talent development. It helps users explore career trajectories, identify skill gaps relative to target roles, and build development plans. Nova integrates PRISM profile data with industry benchmarks to provide personalized career guidance grounded in both behavioral preferences and market reality.",
    capabilities: ["Career trajectory exploration", "Skill gap analysis", "Development plan creation", "Session scheduling and management", "Role-fit assessment", "Industry benchmark comparison"],
    modelTier: "claude-haiku", domain: "Career & Talent", color: "#f59e0b",
  },
  {
    id: "James", name: "James", displayName: "James",
    description: "Job matching & market intelligence",
    fullDescription: "James provides job matching and market intelligence. It analyzes job requirements, compares candidate profiles, and identifies the best fits based on skills, temperament, and organizational culture. James also handles administrative tasks — user management, team configuration, billing, and organizational settings.",
    capabilities: ["Job-candidate matching", "Market intelligence and trends", "Administrative user management", "Team configuration", "Billing and org settings", "Role permission management"],
    modelTier: "claude-sonnet", domain: "Career & Talent", color: "#f59e0b",
  },
  {
    id: "Sage", name: "Sage", displayName: "Sage",
    description: "Learning & skill development",
    fullDescription: "Sage manages learning pathways and skill development. It recommends training resources, tracks learning progress, and adapts recommendations based on the user's PRISM profile and career goals. Sage also handles document management — searching, organizing, and retrieving documents relevant to the user's development journey.",
    capabilities: ["Learning pathway recommendations", "Skill development tracking", "Training resource curation", "Document search and retrieval", "Document organization", "Progress-based adaptation"],
    modelTier: "claude-sonnet", domain: "Career & Talent", color: "#f59e0b",
  },
  {
    id: "Bridge", name: "Bridge", displayName: "Bridge",
    description: "Communication & relationship coaching",
    fullDescription: "Bridge specializes in communication and relationship coaching. It helps users improve interpersonal skills, navigate difficult conversations, build stronger professional relationships, and adapt their communication style based on their PRISM profile and the profiles of people they interact with. Bridge also manages notification preferences and alert channels.",
    capabilities: ["Communication style coaching", "Conflict resolution guidance", "Relationship building strategies", "PRISM-informed interaction tips", "Notification preference management", "Cross-profile communication adaptation"],
    modelTier: "claude-haiku", domain: "Career & Talent", color: "#f59e0b",
  },
  // Org & Enterprise
  {
    id: "Atlas", name: "Atlas", displayName: "Atlas",
    description: "Organization mapping & structure analytics",
    fullDescription: "Atlas provides organization mapping and analytics. It aggregates team performance data, engagement metrics, session completion rates, and PRISM profile distributions to give leaders a data-driven view of their organization. Atlas powers dashboards, charts, KPIs, and trend analysis across all organizational levels.",
    capabilities: ["Team performance analytics", "Engagement metric tracking", "Dashboard and chart generation", "KPI monitoring", "Period-over-period trend analysis", "Organizational structure mapping"],
    modelTier: "claude-haiku", domain: "Org & Enterprise", color: "#10b981",
  },
  {
    id: "Ascend", name: "Ascend", displayName: "Ascend",
    description: "Performance & growth orchestration",
    fullDescription: "Ascend orchestrates performance reviews and growth planning. It compiles individual performance data, contextualizes it with PRISM insights, and creates forward-looking development plans with specific skill targets, learning activities, and career milestone goals. Ascend bridges the gap between data and actionable growth strategies.",
    capabilities: ["Performance review compilation", "PRISM-contextualized performance analysis", "Development plan creation", "Skill target setting", "Career milestone planning", "Growth trajectory projection"],
    modelTier: "claude-haiku", domain: "Org & Enterprise", color: "#10b981",
  },
  {
    id: "Sentinel", name: "Sentinel", displayName: "Sentinel",
    description: "Risk, compliance & decision rules",
    fullDescription: "Sentinel handles risk assessment, compliance verification, and decision rule enforcement. Before any significant action (hiring decision, tool usage, data access), Sentinel verifies that it complies with organizational policies, regulatory requirements, and configured decision rules. It maintains an audit trail for all compliance-related decisions.",
    capabilities: ["Compliance policy verification", "Decision rule enforcement (allow/deny/confirm)", "Audit trail generation", "Risk assessment for hiring and operational decisions", "Regulatory requirement checking", "Policy documentation and tracking"],
    modelTier: "claude-haiku", domain: "Org & Enterprise", color: "#10b981",
  },
  {
    id: "Nexus", name: "Nexus", displayName: "Nexus",
    description: "Org context, culture & knowledge",
    fullDescription: "Nexus manages organizational context, culture data, and institutional knowledge. It provides agents with the broader organizational backdrop — company values, team dynamics, cultural norms, and institutional memory — so coaching advice is grounded in the reality of the user's workplace. Nexus also manages the RLHF training pipeline for continuous model improvement.",
    capabilities: ["Organizational context provision", "Company culture and values data", "Institutional knowledge management", "Team dynamics and norms", "RLHF training pipeline management", "Model evaluation and registry"],
    modelTier: "claude-haiku", domain: "Org & Enterprise", color: "#10b981",
  },
];

export const IG_DOMAIN_GROUPS: Record<string, string[]> = {
  "Personal Development": ["Meridian", "Aura", "Anchor", "Echo", "Forge"],
  "Career & Talent": ["Nova", "James", "Sage", "Bridge"],
  "Org & Enterprise": ["Atlas", "Ascend", "Sentinel", "Nexus"],
};

// ─── API Format Types ───────────────────────────────────────────

type IGStep = {
  agent_name: string;
  task_description: string;
  depends_on: string[];
  timeout_seconds: number;
};

type IGTemplateCreateIn = {
  name: string;
  description: string;
  trigger_keywords: string[];
  steps: IGStep[];
  org_id?: string;
  metadata?: Record<string, unknown>;
};

type IGTemplateOut = {
  id: string;
  name: string;
  description: string;
  trigger_keywords: string[];
  steps: IGStep[];
  is_active: boolean;
  org_id: string | null;
  created_at?: string;
  updated_at?: string;
};

// ─── Adapter ────────────────────────────────────────────────────

export const igAdapter: EcosystemAdapter = {
  name: "inspire-genius",
  agents: [...IG_AGENTS],
  domainGroups: { ...IG_DOMAIN_GROUPS },

  toApiFormat(template: DagTemplate): IGTemplateCreateIn {
    const nodeOrder = template.nodes.map((n) => n.id);
    const idToIndex = new Map(nodeOrder.map((id, i) => [id, String(i)]));

    const steps: IGStep[] = template.nodes.map((node) => ({
      agent_name: node.agentId,
      task_description: node.description,
      depends_on: node.dependsOn
        .map((dep) => idToIndex.get(dep))
        .filter((v): v is string => v !== undefined),
      timeout_seconds: (node.config?.timeout as number) ?? 30,
    }));

    return {
      name: template.name,
      description: template.description,
      trigger_keywords: template.triggerKeywords,
      steps,
    };
  },

  fromApiFormat(data: unknown): DagTemplate {
    const d = data as IGTemplateOut;
    const nodes: DagNode[] = d.steps.map((step, i) => ({
      id: `step_${i}`,
      agentId: step.agent_name,
      label: IG_AGENTS.find((a) => a.id === step.agent_name)?.displayName ?? step.agent_name,
      description: step.task_description,
      dependsOn: step.depends_on.map((idx) => `step_${idx}`),
      config: { timeout: step.timeout_seconds },
      position: { x: 0, y: 0 },
    }));

    const edges = deriveEdges(nodes);
    const laid = autoLayout(nodes, edges);

    return {
      id: d.id ?? "",
      name: d.name,
      description: d.description,
      version: 1,
      triggerKeywords: d.trigger_keywords ?? [],
      nodes: laid,
      edges: deriveEdges(laid),
      metadata: {},
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  },
};

export function createIGConfig(apiBaseUrl: string, orgId?: string): EcosystemConfig {
  return {
    adapter: igAdapter,
    apiBaseUrl,
    roleMinimum: "company-admin",
    orgId,
  };
}
