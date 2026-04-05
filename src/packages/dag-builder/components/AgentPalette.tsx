/**
 * Sidebar palette of available agents, grouped by domain.
 * Agents are dragged from here onto the DagCanvas.
 */

import { useState, useMemo, DragEvent } from "react";
import { Bot, Search, ChevronDown, ChevronRight } from "lucide-react";
import type { EcosystemAdapter, AgentDefinition } from "../types/ecosystem";

type AgentPaletteProps = {
  adapter: EcosystemAdapter;
  className?: string;
};

export function AgentPalette({ adapter, className }: AgentPaletteProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return adapter.agents;
    const q = search.toLowerCase();
    return adapter.agents.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.domain.toLowerCase().includes(q)
    );
  }, [adapter.agents, search]);

  const groups = useMemo(() => {
    const map = new Map<string, AgentDefinition[]>();
    for (const [domain, agentIds] of Object.entries(adapter.domainGroups)) {
      const agents = filtered.filter((a) => agentIds.includes(a.id));
      if (agents.length > 0) map.set(domain, agents);
    }
    // Catch ungrouped agents
    const grouped = new Set(Object.values(adapter.domainGroups).flat());
    const ungrouped = filtered.filter((a) => !grouped.has(a.id));
    if (ungrouped.length > 0) map.set("Other", ungrouped);
    return map;
  }, [adapter.domainGroups, filtered]);

  const onDragStart = (e: DragEvent, agent: AgentDefinition) => {
    e.dataTransfer.setData("application/dag-agent", JSON.stringify(agent));
    e.dataTransfer.effectAllowed = "move";
  };

  const toggleGroup = (domain: string) => {
    setCollapsed((prev) => ({ ...prev, [domain]: !prev[domain] }));
  };

  return (
    <div
      className={`w-[280px] bg-white border-r border-slate-200 flex flex-col h-full ${className ?? ""}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="font-semibold text-sm text-slate-800">Agent Palette</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {adapter.agents.length} agents · {adapter.name}
        </p>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-slate-100">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Filter agents..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Agent groups */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(groups.entries()).map(([domain, agents]) => (
          <div key={domain}>
            <button
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-slate-50"
              onClick={() => toggleGroup(domain)}
            >
              {collapsed[domain] ? (
                <ChevronRight size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              {domain}
              <span className="ml-auto text-slate-400 font-normal normal-case">
                {agents.length}
              </span>
            </button>
            {!collapsed[domain] && (
              <div className="pb-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, agent)}
                    className="mx-3 mb-1.5 p-2.5 bg-white border border-slate-200 rounded-lg cursor-grab hover:border-blue-300 hover:shadow-sm active:cursor-grabbing transition-all"
                    style={{ borderLeftWidth: 3, borderLeftColor: agent.color ?? "#64748b" }}
                  >
                    <div className="flex items-center gap-2">
                      <Bot size={14} style={{ color: agent.color ?? "#64748b" }} />
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {agent.displayName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {agent.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {groups.size === 0 && (
          <p className="px-4 py-8 text-sm text-slate-400 text-center">
            No agents match your search
          </p>
        )}
      </div>
    </div>
  );
}
