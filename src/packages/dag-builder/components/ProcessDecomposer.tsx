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
    } catch (err) {
      // Fallback: create a simple single-step plan
      const fallback: DagNode[] = [
        {
          id: "step_0",
          agentId: ecosystemConfig.adapter.agents[0]?.id ?? "Meridian",
          label: ecosystemConfig.adapter.agents[0]?.displayName ?? "Agent",
          description: description,
          dependsOn: [],
          config: { timeout: 30 },
          position: { x: 100, y: 100 },
        },
      ];
      setPreview(fallback);
      setError(
        "LLM planner unavailable — created a single-step fallback. Edit below or try again."
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
