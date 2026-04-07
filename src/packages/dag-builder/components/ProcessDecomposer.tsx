/**
 * Process Decomposer — AI-powered DAG creation from natural language.
 *
 * Users describe a process and the LLM planner decomposes it into a visual DAG.
 * Uses the backend planner at services/agent-engine/app/orchestration/planner.py.
 */

import { useState } from "react";
import { Sparkles, Loader2, Check, RotateCcw, ArrowRight } from "lucide-react";
import axios from "axios";
import type { EcosystemConfig } from "../types/ecosystem";
import type { DagTemplate, DagNode } from "../types/dag";
import { autoLayout, deriveEdges } from "../lib/layout";
import { computeWaves } from "../lib/dag-utils";

type Props = {
  ecosystemConfig: EcosystemConfig;
  onAccept: (template: DagTemplate) => void;
  className?: string;
};

type PlanNode = {
  id: string;
  agent_name: string;
  input_data: string;
  depends_on: string[];
};

/**
 * Client-side keyword-based decomposition when LLM planner is unavailable.
 * Scans the description for keywords matching agent capabilities and builds a multi-step DAG.
 */
function clientSideDecompose(
  description: string,
  agents: { id: string; displayName: string; description: string; domain: string }[]
): DagNode[] {
  const lower = description.toLowerCase();
  const agentKeywords: Record<string, string[]> = {
    Aura: ["prism", "profile", "temperament", "personality", "behavioral", "colour", "color", "gold", "green", "blue", "orange", "brain map"],
    Atlas: ["analytics", "dashboard", "metrics", "data", "stats", "kpi", "performance data", "team analytics", "report"],
    Echo: ["memory", "history", "pattern", "recall", "past session", "previous"],
    Forge: ["onboard", "setup", "welcome", "action", "accountability", "milestone"],
    Nova: ["career", "session", "schedule", "pathway", "development plan"],
    James: ["admin", "manage", "user", "team", "hiring", "candidate", "job", "recruit", "match"],
    Sage: ["document", "learning", "skill", "training", "resource", "file"],
    Sentinel: ["compliance", "audit", "risk", "rule", "policy", "verify", "check"],
    Bridge: ["communication", "relationship", "notification", "message"],
    Ascend: ["performance review", "growth", "appraisal", "evaluation", "goal"],
    Nexus: ["organization", "culture", "context", "knowledge base"],
    Meridian: ["coach", "session", "synthesize", "summarize", "deliver"],
    Compass: ["help", "support", "faq", "troubleshoot"],
  };

  // Score each agent
  const scored: { id: string; score: number; matchedKeywords: string[] }[] = [];
  for (const [agentId, keywords] of Object.entries(agentKeywords)) {
    if (!agents.find((a) => a.id === agentId)) continue;
    const matched = keywords.filter((kw) => lower.includes(kw));
    if (matched.length > 0) {
      scored.push({ id: agentId, score: matched.length, matchedKeywords: matched });
    }
  }

  // Sort by score descending, take top matches
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, Math.max(2, Math.min(5, scored.length)));

  // If no matches, use a sensible default
  if (selected.length === 0) {
    const defaultAgent = agents.find((a) => a.id === "Meridian") ?? agents[0];
    return [{
      id: "step_0",
      agentId: defaultAgent.id,
      label: defaultAgent.displayName,
      description: description,
      dependsOn: [],
      config: { timeout: 30 },
      position: { x: 0, y: 0 },
    }];
  }

  // Build nodes: first node has no deps, subsequent depend on the previous
  // Data-gathering agents (Atlas, Echo, Nexus) go in Wave 0 (parallel)
  // Analysis agents go in Wave 1
  // Synthesis (Meridian) goes last
  const dataAgents = ["Atlas", "Echo", "Nexus", "Forge"];
  const wave0: typeof selected = [];
  const wave1: typeof selected = [];
  const waveLast: typeof selected = [];

  for (const s of selected) {
    if (s.id === "Meridian") waveLast.push(s);
    else if (dataAgents.includes(s.id)) wave0.push(s);
    else wave1.push(s);
  }

  // If all ended up in wave1, move first one to wave0
  if (wave0.length === 0 && wave1.length > 0) {
    wave0.push(wave1.shift()!);
  }

  // Always end with Meridian if we have multiple steps
  if (waveLast.length === 0 && (wave0.length + wave1.length) > 1) {
    const meridian = agents.find((a) => a.id === "Meridian");
    if (meridian) {
      waveLast.push({ id: "Meridian", score: 0, matchedKeywords: [] });
    }
  }

  const nodes: DagNode[] = [];
  const wave0Ids: string[] = [];

  // Wave 0 — parallel data gathering
  for (let i = 0; i < wave0.length; i++) {
    const agent = agents.find((a) => a.id === wave0[i].id)!;
    const nodeId = `step_${nodes.length}`;
    wave0Ids.push(nodeId);
    nodes.push({
      id: nodeId,
      agentId: agent.id,
      label: agent.displayName,
      description: `${agent.description} — ${wave0[i].matchedKeywords.join(", ")}`,
      dependsOn: [],
      config: { timeout: 30 },
      position: { x: 0, y: 0 },
    });
  }

  // Wave 1 — analysis (depends on all wave 0)
  const wave1Ids: string[] = [];
  for (let i = 0; i < wave1.length; i++) {
    const agent = agents.find((a) => a.id === wave1[i].id)!;
    const nodeId = `step_${nodes.length}`;
    wave1Ids.push(nodeId);
    nodes.push({
      id: nodeId,
      agentId: agent.id,
      label: agent.displayName,
      description: `${agent.description} — ${wave1[i].matchedKeywords.join(", ")}`,
      dependsOn: [...wave0Ids],
      config: { timeout: 30 },
      position: { x: 0, y: 0 },
    });
  }

  // Final wave — synthesis
  for (let i = 0; i < waveLast.length; i++) {
    const agent = agents.find((a) => a.id === waveLast[i].id)!;
    nodes.push({
      id: `step_${nodes.length}`,
      agentId: agent.id,
      label: agent.displayName,
      description: "Synthesize all prior agent outputs into a unified response",
      dependsOn: [...wave0Ids, ...wave1Ids],
      config: { timeout: 30 },
      position: { x: 0, y: 0 },
    });
  }

  return nodes;
}

export function ProcessDecomposer({
  ecosystemConfig,
  onAccept,
  className,
}: Props) {
  const [description, setDescription] = useState("");
  const [refinement, setRefinement] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<DagNode[] | null>(null);
  const [error, setError] = useState("");

  const agentLookup = new Map(
    ecosystemConfig.adapter.agents.map((a) => [a.id, a])
  );

  const decompose = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post(
        `${ecosystemConfig.apiBaseUrl}/v1/orchestrator/plan`,
        {
          message: description,
          available_agents: ecosystemConfig.adapter.agents.map((a) => a.id),
        }
      );

      const planNodes: PlanNode[] = data.plan?.nodes ?? data.nodes ?? [];
      const dagNodes: DagNode[] = planNodes.map((pn, i) => ({
        id: pn.id || `step_${i}`,
        agentId: pn.agent_name,
        label:
          agentLookup.get(pn.agent_name)?.displayName ?? pn.agent_name,
        description: pn.input_data,
        dependsOn: pn.depends_on ?? [],
        config: { timeout: 30 },
        position: { x: 0, y: 0 },
      }));

      const edges = deriveEdges(dagNodes);
      const laid = autoLayout(dagNodes, edges);
      setPreview(laid);
    } catch {
      // Fallback: client-side keyword-based decomposition
      const fallback = clientSideDecompose(description, ecosystemConfig.adapter.agents);
      const fallbackEdges = deriveEdges(fallback);
      const laid = autoLayout(fallback, fallbackEdges);
      setPreview(laid);
      setError(
        "LLM planner unavailable — used keyword-based decomposition. You can edit the steps below, then Accept & Load."
      );
    } finally {
      setLoading(false);
    }
  };

  const refine = async () => {
    if (!refinement.trim() || !preview) return;
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${ecosystemConfig.apiBaseUrl}/v1/orchestrator/plan`,
        {
          message: `${description}\n\nCurrent plan has ${preview.length} steps. Refinement: ${refinement}`,
          available_agents: ecosystemConfig.adapter.agents.map((a) => a.id),
        }
      );
      const planNodes: PlanNode[] = data.plan?.nodes ?? data.nodes ?? [];
      const dagNodes: DagNode[] = planNodes.map((pn, i) => ({
        id: pn.id || `step_${i}`,
        agentId: pn.agent_name,
        label: agentLookup.get(pn.agent_name)?.displayName ?? pn.agent_name,
        description: pn.input_data,
        dependsOn: pn.depends_on ?? [],
        config: { timeout: 30 },
        position: { x: 0, y: 0 },
      }));
      const edges = deriveEdges(dagNodes);
      setPreview(autoLayout(dagNodes, edges));
      setRefinement("");
    } catch {
      setError("Refinement failed — try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!preview) return;
    const edges = deriveEdges(preview);
    onAccept({
      id: "",
      name: "",
      description,
      version: 1,
      triggerKeywords: [],
      nodes: preview,
      edges,
      metadata: { buildMethod: "decomposition" },
    });
  };

  const waves = preview ? computeWaves(preview) : [];

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      {/* Input area */}
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Process Decomposer
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Describe a process in plain language and the AI will decompose it into
          a DAG of agent steps.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder='Example: "Evaluate a new hire candidate — check their PRISM profile, pull team analytics, verify admin requirements, and run compliance review"'
          className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={decompose}
            disabled={loading || !description.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Decompose
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-amber-600">{error}</p>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-700">
              Proposed DAG — {preview.length} steps, {waves.length} waves
            </h4>
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                <Check size={14} />
                Accept & Load
              </button>
            </div>
          </div>

          {/* Step list */}
          <div className="space-y-2">
            {waves.map((wg) => (
              <div key={wg.wave}>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Wave {wg.wave}
                  {wg.nodeIds.length > 1 ? " (parallel)" : ""}
                </div>
                <div className="flex flex-wrap gap-2">
                  {wg.nodeIds.map((nid) => {
                    const node = preview.find((n) => n.id === nid);
                    if (!node) return null;
                    const agent = agentLookup.get(node.agentId);
                    return (
                      <div
                        key={nid}
                        className="flex-1 min-w-[250px] border border-slate-200 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: agent?.color ?? "#64748b",
                            }}
                          />
                          <span className="font-medium text-sm">
                            {agent?.displayName ?? node.agentId}
                          </span>
                          {node.dependsOn.length > 0 && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <ArrowRight size={10} />
                              depends on {node.dependsOn.join(", ")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-3">
                          {node.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Refinement */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Refine the plan
            </label>
            <div className="flex gap-2">
              <input
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                placeholder='e.g. "split step 2 into two parallel steps"'
                className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) =>
                  e.key === "Enter" && refine()
                }
              />
              <button
                onClick={refine}
                disabled={loading || !refinement.trim()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Refine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!preview && !loading && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Sparkles size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              Describe a process above and click Decompose to generate a DAG
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
