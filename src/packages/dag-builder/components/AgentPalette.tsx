/**
 * Sidebar palette of available agents, grouped by domain.
 * - Drag agents onto the DagCanvas to create nodes.
 * - Click an agent to open the detail modal with full description & capabilities.
 * - Click "Manage" to add new agents or palettes.
 * - Shows maturity rings and domain badges when data is available from VAT.
 */

import { useState, useMemo, type DragEvent } from "react";
import { Bot, Search, ChevronDown, ChevronRight, Info, Settings2, GraduationCap } from "lucide-react";
import type { EcosystemAdapter, AgentDefinition } from "../types/ecosystem";
import { AgentDetailModal } from "./AgentDetailModal";
import { ManageAgentsModal } from "./ManageAgentsModal";

/** Domain color mapping for badges. */
const DOMAIN_COLORS: Record<string, string> = {
  coaching: "#3b82f6",
  "Personal Development": "#3b82f6",
  business: "#22c55e",
  "Career & Talent": "#22c55e",
  system: "#a855f7",
  "Org & Enterprise": "#a855f7",
};

/** Maturity level border colors: green=mature (4-5), yellow=growing (2-3), gray=novice (1). */
function maturityBorderColor(level?: number): string {
  if (!level || level <= 1) return "#94a3b8";
  if (level <= 3) return "#eab308";
  return "#22c55e";
}

/** SVG ring for maturity level. */
function MaturityRing({ level, size = 28 }: { level?: number; size?: number }) {
  if (level == null) return null;
  const filled = Math.min(level, 5);
  const pct = (filled / 5) * 100;
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const strokeColor = maturityBorderColor(level);

  return (
    <div className="relative flex-shrink-0" title={`Maturity Level ${level}/5`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={2.5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2.5}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600">
        {level}
      </span>
    </div>
  );
}

type AgentPaletteProps = {
  adapter: EcosystemAdapter;
  onAgentsChanged?: () => void;
  /** Callback to navigate to agent training page. */
  onTrainAgent?: (agentId: string) => void;
  /** Callback to register a custom agent in the backend. */
  onRegisterAgent?: (agent: AgentDefinition) => Promise<void>;
  className?: string;
};

export function AgentPalette({ adapter, onAgentsChanged, onTrainAgent, onRegisterAgent, className }: AgentPaletteProps) {
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
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DOMAIN_COLORS[domain] ?? "#64748b" }}
                />
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
                        borderLeftColor: agent.maturityLevel != null
                          ? maturityBorderColor(agent.maturityLevel)
                          : (agent.color ?? "#64748b"),
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {agent.maturityLevel != null ? (
                          <MaturityRing level={agent.maturityLevel} size={28} />
                        ) : (
                          <Bot
                            size={14}
                            style={{ color: agent.color ?? "#64748b" }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-800 truncate block">
                            {agent.displayName}
                          </span>
                          {/* Domain badge */}
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium inline-block mt-0.5"
                            style={{
                              backgroundColor: (DOMAIN_COLORS[agent.domain] ?? "#64748b") + "15",
                              color: DOMAIN_COLORS[agent.domain] ?? "#64748b",
                            }}
                          >
                            {agent.domain}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Train button — navigates to VAT Prompt Studio */}
                          {onTrainAgent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onTrainAgent(agent.id);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="p-0.5 text-slate-300 hover:text-amber-500"
                              title={`Train ${agent.displayName}`}
                            >
                              <GraduationCap size={14} />
                            </button>
                          )}
                          {/* Info button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setDetailAgent(agent);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-0.5 text-slate-300 hover:text-blue-500"
                            title={`View ${agent.displayName} details`}
                          >
                            <Info size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {agent.description}
                      </p>
                      {/* Metrics tooltip row */}
                      {(agent.accuracyScore != null || agent.rlhfRating != null) && (
                        <div className="flex items-center gap-2 mt-1">
                          {agent.accuracyScore != null && (
                            <span className="text-[9px] text-slate-400">
                              Acc: {agent.accuracyScore}%
                            </span>
                          )}
                          {agent.knowledgeDocCount != null && (
                            <span className="text-[9px] text-slate-400">
                              Docs: {agent.knowledgeDocCount}
                            </span>
                          )}
                          {agent.rlhfRating != null && (
                            <span className="text-[9px] text-slate-400">
                              RLHF: {agent.rlhfRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      )}
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
          onRegisterAgent={onRegisterAgent}
        />
      )}
    </>
  );
}
