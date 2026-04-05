/**
 * Inspire Genius ecosystem adapter.
 *
 * Serializes to/from the IG backend's TemplateCreateIn/TemplateOut format
 * at services/agent-engine/app/routes/templates.py.
 */

import type { EcosystemAdapter, AgentDefinition, EcosystemConfig } from "../types/ecosystem";
import type { DagTemplate, DagNode, DagEdge } from "../types/dag";
import { autoLayout, deriveEdges } from "../lib/layout";

// ─── Agent Roster (14 IG Agents) ────────────────────────────────

export const IG_AGENTS: AgentDefinition[] = [
  // Personal Development
  { id: "Meridian", name: "Meridian", displayName: "Meridian", description: "Unified persona — synthesizes all agent outputs", domain: "Personal Development", color: "#6366f1" },
  { id: "Aura", name: "Aura", displayName: "Aura", description: "PRISM profiling — behavioral preferences, profile interpretation", domain: "Personal Development", color: "#6366f1" },
  { id: "Anchor", name: "Anchor", displayName: "Anchor", description: "Grounding & emotional regulation", domain: "Personal Development", color: "#6366f1" },
  { id: "Echo", name: "Echo", displayName: "Echo", description: "Memory & pattern recognition", domain: "Personal Development", color: "#6366f1" },
  { id: "Forge", name: "Forge", displayName: "Forge", description: "Action & accountability coaching", domain: "Personal Development", color: "#6366f1" },
  // Career & Talent
  { id: "Nova", name: "Nova", displayName: "Nova", description: "Career pathway & talent development", domain: "Career & Talent", color: "#f59e0b" },
  { id: "James", name: "James", displayName: "James", description: "Job matching & market intelligence", domain: "Career & Talent", color: "#f59e0b" },
  { id: "Sage", name: "Sage", displayName: "Sage", description: "Learning & skill development", domain: "Career & Talent", color: "#f59e0b" },
  { id: "Bridge", name: "Bridge", displayName: "Bridge", description: "Communication & relationship coaching", domain: "Career & Talent", color: "#f59e0b" },
  // Org & Enterprise
  { id: "Atlas", name: "Atlas", displayName: "Atlas", description: "Organization mapping & structure analytics", domain: "Org & Enterprise", color: "#10b981" },
  { id: "Ascend", name: "Ascend", displayName: "Ascend", description: "Performance & growth orchestration", domain: "Org & Enterprise", color: "#10b981" },
  { id: "Sentinel", name: "Sentinel", displayName: "Sentinel", description: "Risk, compliance & decision rules", domain: "Org & Enterprise", color: "#10b981" },
  { id: "Nexus", name: "Nexus", displayName: "Nexus", description: "Org context, culture & knowledge", domain: "Org & Enterprise", color: "#10b981" },
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
  agents: IG_AGENTS,
  domainGroups: IG_DOMAIN_GROUPS,

  toApiFormat(template: DagTemplate): IGTemplateCreateIn {
    // Build ordered node list for index-based depends_on
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

/** Factory for IG ecosystem config. */
export function createIGConfig(apiBaseUrl: string, orgId?: string): EcosystemConfig {
  return {
    adapter: igAdapter,
    apiBaseUrl,
    roleMinimum: "company-admin",
    orgId,
  };
}
