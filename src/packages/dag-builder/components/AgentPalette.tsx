/**
 * Sidebar palette of available agents, grouped by domain.
 * - Drag agents onto the DagCanvas to create nodes.
 * - Click an agent to open the detail modal with full description & capabilities.
 * - Click "Manage" to add new agents or palettes.
 */

import { useState, useMemo } from "react";
import type { DragEvent } from "react";
import { Bot, Search, ChevronDown, ChevronRight, Info, Settings2 } from "lucide-react";
import type { EcosystemAdapter, AgentDefinition } from "../types/ecosystem";
import { AgentDetailModal } from "./AgentDetailModal";
import { ManageAgentsModal } from "./ManageAgentsModal";

type AgentPaletteProps = {
  adapter: EcosystemAdapter;
  onAgentsChanged?: () => void;
  className?: string;
};

export function AgentPalette({ adapter, onAgentsChanged, className }: AgentPaletteProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [detailAgent, setDetailAgent] = useState<AgentDefinition | null>(null);
  const [showManage, setShowManage] = useState(false);

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

  // Agent management handlers
  const handleAddAgent = (agent: AgentDefinition) => {
    adapter.agents.push(agent);
    const domain = agent.domain;
    if (!adapter.domainGroups[domain]) {
      adapter.domainGroups[domain] = [];
    }
    if (!adapter.domainGroups[domain].includes(agent.id)) {
      adapter.domainGroups[domain].push(agent.id);
    }
    onAgentsChanged?.();
    // Force re-render
    setSearch((s) => s + " ");
    setTimeout(() => setSearch((s) => s.trimEnd()), 0);
  };

  const handleAddDomain = (domain: string, agents: AgentDefinition[]) => {
    for (const agent of agents) {
      adapter.agents.push(agent);
    }
    adapter.domainGroups[domain] = agents.map((a) => a.id);
    onAgentsChanged?.();
    setSearch((s) => s + " ");
    setTimeout(() => setSearch((s) => s.trimEnd()), 0);
  };

  const handleRemoveAgent = (agentId: string) => {
    const idx = adapter.agents.findIndex((a) => a.id === agentId);
    if (idx >= 0) adapter.agents.splice(idx, 1);
    for (const [domain, ids] of Object.entries(adapter.domainGroups)) {
      adapter.domainGroups[domain] = ids.filter((id) => id !== agentId);
    }
    onAgentsChanged?.();
    setSearch((s) => s + " ");
    setTimeout(() => setSearch((s) => s.trimEnd()), 0);
  };

  return (
    <>
      <div
        className={`w-[280px] bg-white border-r border-slate-200 flex flex-col h-full ${className ?? ""}`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-slate-800">Agent Palette</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {adapter.agents.length} agents · {adapter.name}
            </p>
          </div>
          <button
            onClick={() => setShowManage(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
            title="Manage agents — add new agents or palettes"
          >
            <Settings2 size={16} />
          </button>
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
                      className="mx-3 mb-1.5 p-2.5 bg-white border border-slate-200 rounded-lg cursor-grab hover:border-blue-300 hover:shadow-sm active:cursor-grabbing transition-all group"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: agent.color ?? "#64748b",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Bot
                          size={14}
                          style={{ color: agent.color ?? "#64748b" }}
                        />
                        <span className="text-sm font-medium text-slate-800 truncate flex-1">
                          {agent.displayName}
                        </span>
                        {/* Info button — click to open detail modal */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setDetailAgent(agent);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="p-0.5 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={`View ${agent.displayName} details`}
                        >
                          <Info size={14} />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {agent.description}
                      </p>
                      {agent.isCustom && (
                        <span className="text-[9px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded mt-1 inline-block">
                          Custom
                        </span>
                      )}
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

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={detailAgent}
        onClose={() => setDetailAgent(null)}
      />

      {/* Manage Agents Modal */}
      {showManage && (
        <ManageAgentsModal
          adapter={adapter}
          onAddAgent={handleAddAgent}
          onAddDomain={handleAddDomain}
          onRemoveAgent={handleRemoveAgent}
          onClose={() => setShowManage(false)}
        />
      )}
    </>
  );
}
