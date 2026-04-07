/**
 * Unified Workflow Designer — mounts the DPB React Flow canvas
 * inside the Agent Trainer, using agents from the VAT API.
 *
 * Route: /super-admin/agent-trainer/workflows
 * Redirect: /super-admin/process-builder → here
 */

import { useMemo, useCallback } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useTrainerAgents, useEcosystems } from "@/hooks/trainer/useTrainer"
import { DagBuilder, createIGConfig } from "@inspiresgenius/dag-builder"
import type { AgentDefinition, DagTemplate } from "@inspiresgenius/dag-builder"
import type { AgentConfig } from "@/types/trainer"
import { toast } from "sonner"
import { api as axios } from "@/lib/axios"

/** Map VAT AgentConfig to DPB AgentDefinition, enriching with maturity data. */
function vatAgentToDpbAgent(agent: AgentConfig): AgentDefinition {
  const domainColors: Record<string, string> = {
    coaching: "#3b82f6",
    business: "#22c55e",
    system: "#a855f7",
  }
  return {
    id: agent.agent_id,
    name: agent.agent_id,
    displayName: agent.name,
    description: agent.role_subtitle ?? `${agent.domain} agent`,
    domain: agent.domain,
    color: domainColors[agent.domain] ?? "#64748b",
    maturityLevel: agent.maturity_level,
    trainerStatus: agent.status,
  }
}

export default function WorkflowDesigner() {
  const { data: agentsResp } = useTrainerAgents()
  const { data: ecosystemsResp } = useEcosystems()

  const vatAgents: AgentConfig[] = (agentsResp as any)?.data ?? []
  void ((ecosystemsResp as any)?.data?.[0]?.ecosystem_id)

  // Build ecosystem config with VAT agents injected into the DPB adapter
  const ecosystemConfig = useMemo(() => {
    const baseConfig = createIGConfig(
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
    )

    // If we have VAT agents, override the adapter's agents with enriched data
    if (vatAgents.length > 0) {
      const dpbAgents = vatAgents.map(vatAgentToDpbAgent)
      baseConfig.adapter.agents = dpbAgents

      // Rebuild domain groups from VAT data
      const groups: Record<string, string[]> = {}
      for (const agent of dpbAgents) {
        if (!groups[agent.domain]) groups[agent.domain] = []
        groups[agent.domain].push(agent.id)
      }
      baseConfig.adapter.domainGroups = groups
    }

    return baseConfig
  }, [vatAgents])

  // Save workflow template to unified trainer API
  const handleSave = useCallback(async (template: DagTemplate) => {
    try {
      await axios.post("/v1/trainer/templates", {
        name: template.name || "Untitled Workflow",
        description: template.description || "",
        category: "Workflows",
        template_type: "workflow",
        dag_config: {
          nodes: template.nodes,
          edges: template.edges,
        },
        manifest: {
          version: template.version ?? 1,
          triggerKeywords: template.triggerKeywords ?? [],
          metadata: template.metadata ?? {},
        },
      })
      toast.success("Workflow template saved")
    } catch {
      toast.error("Failed to save workflow template")
    }
  }, [])

  return (
    <SuperAdminLayout>
      <div className="h-[calc(100vh-4rem)]">
        <DagBuilder
          ecosystemConfig={ecosystemConfig}
          onSave={handleSave}
        />
      </div>
    </SuperAdminLayout>
  )
}
