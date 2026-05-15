/**
 * Custom React Flow node component for agent steps in the DAG.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot, AlertCircle } from "lucide-react";
import type { DagNode } from "../types/dag";

export type AgentNodeData = DagNode & {
  wave?: number;
  domainColor?: string;
  domainLabel?: string;
  hasErrors?: boolean;
  isSelected?: boolean;
};

function AgentNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  const borderColor = d.hasErrors
    ? "border-red-500"
    : selected || d.isSelected
      ? "border-blue-500 shadow-lg shadow-blue-200"
      : "border-slate-200";
  const domainColor = d.domainColor ?? "#64748b";

  return (
    <div
      className={`bg-white rounded-lg border-2 ${borderColor} w-[220px] overflow-hidden transition-all`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderBottom: `3px solid ${domainColor}` }}
      >
        <Bot size={16} style={{ color: domainColor }} />
        <span className="font-semibold text-sm truncate">{d.label || d.agentId}</span>
        {d.wave !== undefined && (
          <span className="ml-auto text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
            W{d.wave}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {d.domainLabel && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${domainColor}20`, color: domainColor }}
          >
            {d.domainLabel}
          </span>
        )}
        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
          {d.description || "No description"}
        </p>
      </div>

      {/* Error indicator */}
      {d.hasErrors && (
        <div className="px-3 pb-2 flex items-center gap-1 text-red-500">
          <AlertCircle size={12} />
          <span className="text-[10px]">Validation error</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);

/** Simple start pill node. */
export function StartNode() {
  return (
    <div className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-semibold border border-green-300">
      Start
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}

/** Simple end pill node. */
export function EndNode() {
  return (
    <div className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-xs font-semibold border border-slate-300">
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      End
    </div>
  );
}
