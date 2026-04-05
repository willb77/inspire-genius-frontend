/**
 * Right-side panel for editing the selected node's properties.
 */

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, AlertCircle } from "lucide-react";
import { useDagStore } from "../hooks/useDagStore";
import type { EcosystemAdapter } from "../types/ecosystem";
import { canAddEdge } from "../lib/dag-utils";

const nodeSchema = z.object({
  agentId: z.string().min(1),
  description: z.string().min(1, "Task description is required"),
  timeout: z.number().int().min(1).max(600).default(30),
});

type NodeForm = z.infer<typeof nodeSchema>;

type Props = {
  adapter: EcosystemAdapter;
  className?: string;
};

export function NodePropertyPanel({ adapter, className }: Props) {
  const { nodes, selectedNodeId, updateNode, removeNode, getValidation } =
    useDagStore();
  const selected = nodes.find((n) => n.id === selectedNodeId);

  const validation = getValidation();
  const nodeErrors = useMemo(
    () => validation.errors.filter((e) => e.nodeId === selectedNodeId),
    [validation, selectedNodeId]
  );

  const { register, reset, handleSubmit, watch } = useForm<NodeForm>({
    resolver: zodResolver(nodeSchema),
    defaultValues: {
      agentId: selected?.agentId ?? "",
      description: selected?.description ?? "",
      timeout: (selected?.config?.timeout as number) ?? 30,
    },
  });

  useEffect(() => {
    if (selected) {
      reset({
        agentId: selected.agentId,
        description: selected.description,
        timeout: (selected.config?.timeout as number) ?? 30,
      });
    }
  }, [selected, reset]);

  // Auto-save on change
  const values = watch();
  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      updateNode(selected.id, {
        agentId: values.agentId,
        description: values.description,
        label:
          adapter.agents.find((a) => a.id === values.agentId)?.displayName ??
          values.agentId,
        config: { ...selected.config, timeout: values.timeout },
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [values.agentId, values.description, values.timeout]);

  // Available dependencies (no cycle)
  const availableDeps = useMemo(() => {
    if (!selected) return [];
    return nodes.filter(
      (n) =>
        n.id !== selected.id &&
        (selected.dependsOn.includes(n.id) ||
          canAddEdge(nodes, n.id, selected.id))
    );
  }, [nodes, selected]);

  const toggleDep = (depId: string) => {
    if (!selected) return;
    const has = selected.dependsOn.includes(depId);
    updateNode(selected.id, {
      dependsOn: has
        ? selected.dependsOn.filter((d) => d !== depId)
        : [...selected.dependsOn, depId],
    });
  };

  if (!selected) {
    return (
      <div
        className={`w-[340px] bg-white border-l border-slate-200 flex items-center justify-center ${className ?? ""}`}
      >
        <p className="text-sm text-slate-400">Select a node to edit</p>
      </div>
    );
  }

  return (
    <div
      className={`w-[340px] bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto ${className ?? ""}`}
    >
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Node Properties</h3>
        <button
          onClick={() => removeNode(selected.id)}
          className="text-red-500 hover:text-red-700 p-1 rounded"
          title="Delete node"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Validation errors */}
      {nodeErrors.length > 0 && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          {nodeErrors.map((e, i) => (
            <div key={i} className="flex items-center gap-1.5 text-red-600 text-xs">
              <AlertCircle size={12} />
              {e.message}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(() => {})} className="p-4 space-y-4">
        {/* Agent selector */}
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Agent
          </label>
          <select
            {...register("agentId")}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.entries(adapter.domainGroups).map(([domain, ids]) => (
              <optgroup key={domain} label={domain}>
                {ids.map((id) => {
                  const agent = adapter.agents.find((a) => a.id === id);
                  return agent ? (
                    <option key={id} value={id}>
                      {agent.displayName}
                    </option>
                  ) : null;
                })}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Task Description
          </label>
          <textarea
            {...register("description")}
            rows={4}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Describe what this agent should do..."
          />
        </div>

        {/* Dependencies */}
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Dependencies
          </label>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {availableDeps.map((n) => (
              <label
                key={n.id}
                className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.dependsOn.includes(n.id)}
                  onChange={() => toggleDep(n.id)}
                  className="rounded border-slate-300"
                />
                <span className="truncate">
                  {n.label} ({n.agentId})
                </span>
              </label>
            ))}
            {availableDeps.length === 0 && (
              <p className="text-xs text-slate-400">No available dependencies</p>
            )}
          </div>
        </div>

        {/* Timeout */}
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Timeout (seconds)
          </label>
          <input
            type="number"
            {...register("timeout", { valueAsNumber: true })}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </form>
    </div>
  );
}
