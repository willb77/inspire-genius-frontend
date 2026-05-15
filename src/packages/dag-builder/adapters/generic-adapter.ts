/**
 * Generic adapter factory — creates EcosystemAdapters from JSON config.
 * Enables any agent ecosystem to plug into the DAG builder without writing TypeScript.
 */

import type { EcosystemAdapter, AgentDefinition } from "../types/ecosystem";
import type { DagTemplate, DagNode } from "../types/dag";
import { autoLayout, deriveEdges } from "../lib/layout";

export type GenericEcosystemConfig = {
  ecosystemName: string;
  agents: AgentDefinition[];
  domainGroups: Record<string, string[]>;
  apiFormat: {
    templateKey: string;
    stepKey: string;
    agentField: string;
    descriptionField: string;
    dependsOnField: string;
    timeoutField: string;
    timeoutUnit: "seconds" | "milliseconds";
  };
};

export function createGenericAdapter(
  config: GenericEcosystemConfig
): EcosystemAdapter {
  const { apiFormat } = config;
  const timeoutMul = apiFormat.timeoutUnit === "milliseconds" ? 1000 : 1;

  return {
    name: config.ecosystemName,
    agents: config.agents,
    domainGroups: config.domainGroups,

    toApiFormat(template: DagTemplate): unknown {
      const nodeOrder = template.nodes.map((n) => n.id);
      const idToIdx = new Map(nodeOrder.map((id, i) => [id, String(i)]));

      const steps = template.nodes.map((node) => ({
        [apiFormat.agentField]: node.agentId,
        [apiFormat.descriptionField]: node.description,
        [apiFormat.dependsOnField]: node.dependsOn
          .map((d) => idToIdx.get(d))
          .filter(Boolean),
        [apiFormat.timeoutField]:
          ((node.config?.timeout as number) ?? 30) * timeoutMul,
      }));

      return {
        name: template.name,
        description: template.description,
        [apiFormat.stepKey]: steps,
      };
    },

    fromApiFormat(data: unknown): DagTemplate {
      const d = data as Record<string, unknown>;
      const rawSteps = (d[apiFormat.stepKey] as Record<string, unknown>[]) ?? [];
      const agentLookup = new Map(config.agents.map((a) => [a.id, a]));

      const nodes: DagNode[] = rawSteps.map((step, i) => {
        const agentId = String(step[apiFormat.agentField] ?? "");
        const rawDeps = (step[apiFormat.dependsOnField] as string[]) ?? [];
        const rawTimeout = Number(step[apiFormat.timeoutField] ?? 30 * timeoutMul);

        return {
          id: `step_${i}`,
          agentId,
          label: agentLookup.get(agentId)?.displayName ?? agentId,
          description: String(step[apiFormat.descriptionField] ?? ""),
          dependsOn: rawDeps.map((idx) => `step_${idx}`),
          config: { timeout: Math.round(rawTimeout / timeoutMul) },
          position: { x: 0, y: 0 },
        };
      });

      const edges = deriveEdges(nodes);
      const laid = autoLayout(nodes, edges);

      return {
        id: String(d.id ?? ""),
        name: String(d.name ?? ""),
        description: String(d.description ?? ""),
        version: 1,
        triggerKeywords: [],
        nodes: laid,
        edges: deriveEdges(laid),
        metadata: {},
      };
    },
  };
}

export async function loadAdapterFromJson(
  jsonPath: string
): Promise<EcosystemAdapter> {
  const resp = await fetch(jsonPath);
  const config: GenericEcosystemConfig = await resp.json();
  return createGenericAdapter(config);
}
