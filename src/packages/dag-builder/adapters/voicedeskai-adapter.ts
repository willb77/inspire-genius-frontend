/**
 * VoiceDeskAI ecosystem adapter.
 *
 * Placeholder — update agent roster and API format when VoiceDeskAI backend schema is finalized.
 */

import type { EcosystemAdapter, AgentDefinition, EcosystemConfig } from "../types/ecosystem";
import type { DagTemplate, DagNode } from "../types/dag";
import { autoLayout, deriveEdges } from "../lib/layout";

export const VDAI_AGENTS: AgentDefinition[] = [
  // Call Center
  { id: "Router", name: "Router", displayName: "Router", description: "Call routing & queue management", domain: "Call Center", color: "#ef4444" },
  { id: "Classifier", name: "Classifier", displayName: "Classifier", description: "Intent classification & topic detection", domain: "Call Center", color: "#ef4444" },
  { id: "Resolver", name: "Resolver", displayName: "Resolver", description: "Issue resolution & troubleshooting", domain: "Call Center", color: "#ef4444" },
  { id: "Escalator", name: "Escalator", displayName: "Escalator", description: "Escalation handling & supervisor routing", domain: "Call Center", color: "#ef4444" },
  // Knowledge
  { id: "Retriever", name: "Retriever", displayName: "Retriever", description: "Knowledge base search & retrieval", domain: "Knowledge", color: "#3b82f6" },
  { id: "Summarizer", name: "Summarizer", displayName: "Summarizer", description: "Document summarization", domain: "Knowledge", color: "#3b82f6" },
  { id: "Trainer", name: "Trainer", displayName: "Trainer", description: "Agent training data curation", domain: "Knowledge", color: "#3b82f6" },
  // Analytics
  { id: "Monitor", name: "Monitor", displayName: "Monitor", description: "Call monitoring & quality assurance", domain: "Analytics", color: "#8b5cf6" },
  { id: "Reporter", name: "Reporter", displayName: "Reporter", description: "Report generation & dashboards", domain: "Analytics", color: "#8b5cf6" },
  { id: "Forecaster", name: "Forecaster", displayName: "Forecaster", description: "Volume forecasting & capacity planning", domain: "Analytics", color: "#8b5cf6" },
];

export const VDAI_DOMAIN_GROUPS: Record<string, string[]> = {
  "Call Center": ["Router", "Classifier", "Resolver", "Escalator"],
  Knowledge: ["Retriever", "Summarizer", "Trainer"],
  Analytics: ["Monitor", "Reporter", "Forecaster"],
};

type VoiceDeskStep = {
  step_id: string;
  agent_type: string;
  instruction: string;
  prerequisites: string[];
  timeout_ms: number;
  config: Record<string, unknown>;
};

type VoiceDeskWorkflow = {
  workflow_id: string;
  workflow_name: string;
  description: string;
  triggers: string[];
  steps: VoiceDeskStep[];
};

export const voiceDeskAdapter: EcosystemAdapter = {
  name: "voicedeskai",
  agents: VDAI_AGENTS,
  domainGroups: VDAI_DOMAIN_GROUPS,

  toApiFormat(template: DagTemplate): VoiceDeskWorkflow {
    const nodeOrder = template.nodes.map((n) => n.id);
    const idToStepId = new Map(nodeOrder.map((id, i) => [id, `vd_step_${i}`]));

    return {
      workflow_id: template.id,
      workflow_name: template.name,
      description: template.description,
      triggers: template.triggerKeywords,
      steps: template.nodes.map((node, i) => ({
        step_id: `vd_step_${i}`,
        agent_type: node.agentId,
        instruction: node.description,
        prerequisites: node.dependsOn
          .map((dep) => idToStepId.get(dep))
          .filter((v): v is string => v !== undefined),
        timeout_ms: ((node.config?.timeout as number) ?? 30) * 1000,
        config: node.config ?? {},
      })),
    };
  },

  fromApiFormat(data: unknown): DagTemplate {
    const d = data as VoiceDeskWorkflow;
    const stepIdMap = new Map<string, string>();

    const nodes: DagNode[] = d.steps.map((step, i) => {
      const nodeId = `node_${i}`;
      stepIdMap.set(step.step_id, nodeId);
      return {
        id: nodeId,
        agentId: step.agent_type,
        label: VDAI_AGENTS.find((a) => a.id === step.agent_type)?.displayName ?? step.agent_type,
        description: step.instruction,
        dependsOn: [],
        config: { ...step.config, timeout: Math.round(step.timeout_ms / 1000) },
        position: { x: 0, y: 0 },
      };
    });

    // Resolve prerequisites
    d.steps.forEach((step, i) => {
      nodes[i].dependsOn = step.prerequisites
        .map((pre) => stepIdMap.get(pre))
        .filter((v): v is string => v !== undefined);
    });

    const edges = deriveEdges(nodes);
    const laid = autoLayout(nodes, edges);

    return {
      id: d.workflow_id ?? "",
      name: d.workflow_name,
      description: d.description,
      version: 1,
      triggerKeywords: d.triggers ?? [],
      nodes: laid,
      edges: deriveEdges(laid),
      metadata: {},
    };
  },
};

export function createVoiceDeskConfig(apiBaseUrl: string): EcosystemConfig {
  return { adapter: voiceDeskAdapter, apiBaseUrl };
}
