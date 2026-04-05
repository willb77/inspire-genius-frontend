/**
 * Live cost estimation panel — shows projected costs as the user builds a DAG.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { useDagStore } from "../hooks/useDagStore";
import type { EcosystemConfig } from "../types/ecosystem";
import {
  estimateExecutionCost,
  estimateDecompositionCost,
  estimateFromScratchCost,
  calculateLlmCost,
} from "../lib/cost-calculator";

type Props = { ecosystemConfig: EcosystemConfig; className?: string };

export function CostEstimatePanel({ ecosystemConfig, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { nodes, template } = useDagStore();

  const execCost = useMemo(() => {
    if (nodes.length === 0) return null;
    return estimateExecutionCost({
      id: template.id ?? "",
      name: template.name ?? "",
      description: template.description ?? "",
      version: 1,
      triggerKeywords: [],
      nodes,
      edges: [],
      metadata: {},
    });
  }, [nodes, template]);

  const scratchCost = estimateFromScratchCost(nodes.length);
  const decompCost = estimateDecompositionCost(
    template.description ?? "",
    ecosystemConfig.adapter.agents.length
  );

  if (nodes.length === 0) return null;

  const totalExec = execCost?.totalCostUsd ?? 0;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`flex items-center gap-2 px-4 py-1.5 bg-slate-50 border-t border-slate-200 text-sm text-slate-600 hover:bg-slate-100 w-full ${className ?? ""}`}
      >
        <DollarSign size={14} />
        Est. cost per run: ${totalExec.toFixed(3)}
        <span className="text-slate-400 ml-1">· {nodes.length} steps</span>
        <ChevronUp size={14} className="ml-auto" />
      </button>
    );
  }

  return (
    <div
      className={`bg-white border-t border-slate-200 ${className ?? ""}`}
    >
      <button
        onClick={() => setExpanded(false)}
        className="flex items-center gap-2 px-4 py-2 w-full text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <DollarSign size={14} />
        Cost Estimate
        <ChevronDown size={14} className="ml-auto" />
      </button>

      <div className="px-4 pb-4 grid grid-cols-2 gap-4">
        {/* Execution cost table */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Per-Execution Cost
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b">
                <th className="text-left py-1">Agent</th>
                <th className="text-right py-1">Tokens</th>
                <th className="text-right py-1">Cost</th>
              </tr>
            </thead>
            <tbody>
              {execCost?.agentCosts.map((ac, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-1">{ac.agentName}</td>
                  <td className="text-right text-slate-500">
                    ~{(ac.inputTokens + ac.outputTokens).toLocaleString()}
                  </td>
                  <td className="text-right font-mono">
                    ${ac.costUsd.toFixed(4)}
                  </td>
                </tr>
              ))}
              {execCost && execCost.synthesisCost.costUsd > 0 && (
                <tr className="border-b border-slate-50">
                  <td className="py-1 italic text-slate-400">Synthesis</td>
                  <td className="text-right text-slate-500">
                    ~{(execCost.synthesisCost.inputTokens + execCost.synthesisCost.outputTokens).toLocaleString()}
                  </td>
                  <td className="text-right font-mono">
                    ${execCost.synthesisCost.costUsd.toFixed(4)}
                  </td>
                </tr>
              )}
              <tr className="font-semibold">
                <td className="py-1">Total</td>
                <td />
                <td className="text-right font-mono">
                  ${totalExec.toFixed(4)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Comparison */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Build Method Comparison
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">
                From Scratch
              </div>
              <div className="text-lg font-bold text-slate-800">$0.00</div>
              <div className="text-[10px] text-slate-500 mt-1">
                Build time: ~{Math.round(scratchCost.buildDurationMs / 60000)} min
              </div>
              <div className="text-[10px] text-slate-500">
                10 runs: ${(totalExec * 10).toFixed(2)}
              </div>
            </div>
            <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
              <div className="text-[10px] uppercase text-blue-500 font-semibold">
                Decomposition
              </div>
              <div className="text-lg font-bold text-slate-800">
                ${decompCost.totalCostUsd.toFixed(3)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Build time: ~{Math.round(decompCost.buildDurationMs / 60000)} min
              </div>
              <div className="text-[10px] text-slate-500">
                10 runs: ${(decompCost.totalCostUsd + totalExec * 10).toFixed(2)}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Decomposition saves ~
            {Math.round(
              (scratchCost.buildDurationMs - decompCost.buildDurationMs) / 60000
            )}{" "}
            min build time at +${decompCost.totalCostUsd.toFixed(3)} LLM cost
          </p>
        </div>
      </div>
    </div>
  );
}
