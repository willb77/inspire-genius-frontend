/**
 * Agent Detail Modal — shows full description and capabilities when an agent is clicked.
 */

import { X, Bot, Cpu, Zap } from "lucide-react";
import type { AgentDefinition } from "../types/ecosystem";

type Props = {
  agent: AgentDefinition | null;
  onClose: () => void;
};

export function AgentDetailModal({ agent, onClose }: Props) {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[520px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: `3px solid ${agent.color ?? "#64748b"}` }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${agent.color ?? "#64748b"}20` }}
          >
            <Bot size={20} style={{ color: agent.color ?? "#64748b" }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">
              {agent.displayName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${agent.color ?? "#64748b"}15`,
                  color: agent.color ?? "#64748b",
                }}
              >
                {agent.domain}
              </span>
              {agent.modelTier && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Cpu size={10} />
                  {agent.modelTier}
                </span>
              )}
              {agent.isCustom && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  Custom
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh] space-y-5">
          {/* Short description */}
          <div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {agent.description}
            </p>
          </div>

          {/* Full description */}
          {agent.fullDescription && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                About
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {agent.fullDescription}
              </p>
            </div>
          )}

          {/* Capabilities */}
          {agent.capabilities && agent.capabilities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Capabilities
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {agent.capabilities.map((cap, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <Zap
                      size={12}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: agent.color ?? "#64748b" }}
                    />
                    {cap}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Technical Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Agent ID</span>
                <p className="font-mono text-slate-700 mt-0.5">{agent.id}</p>
              </div>
              <div>
                <span className="text-slate-400">Domain</span>
                <p className="text-slate-700 mt-0.5">{agent.domain}</p>
              </div>
              <div>
                <span className="text-slate-400">Model Tier</span>
                <p className="text-slate-700 mt-0.5">
                  {agent.modelTier ?? "Default (Sonnet)"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Source</span>
                <p className="text-slate-700 mt-0.5">
                  {agent.isCustom ? "Custom (user-defined)" : "Built-in"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 rounded-md hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
