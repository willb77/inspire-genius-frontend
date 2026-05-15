/**
 * Manage Agents Modal — add new individual agents or entire agent palettes (domains).
 */

import { useState } from "react";
import { X, Plus, Palette, Bot, Trash2 } from "lucide-react";
import type { AgentDefinition, EcosystemAdapter } from "../types/ecosystem";

type Props = {
  adapter: EcosystemAdapter;
  onAddAgent: (agent: AgentDefinition) => void;
  onAddDomain: (domain: string, agents: AgentDefinition[]) => void;
  onRemoveAgent: (agentId: string) => void;
  onClose: () => void;
  /** Optional: register agent in the backend trainer service for full training + execution support. */
  onRegisterAgent?: (agent: AgentDefinition) => Promise<void>;
};

const DOMAIN_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
];

export function ManageAgentsModal({
  adapter,
  onAddAgent,
  onAddDomain,
  onRemoveAgent,
  onClose,
  onRegisterAgent,
}: Props) {
  const [registering, setRegistering] = useState(false);
  const [tab, setTab] = useState<"agent" | "palette" | "import">("agent");

  // Add Agent form state
  const [agentId, setAgentId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [agentFullDesc, setAgentFullDesc] = useState("");
  const [agentDomain, setAgentDomain] = useState(
    Object.keys(adapter.domainGroups)[0] ?? ""
  );
  const [agentCaps, setAgentCaps] = useState("");
  const [agentColor, setAgentColor] = useState(DOMAIN_COLORS[0]);
  const [agentModelTier, setAgentModelTier] = useState("claude-haiku");

  // Add Palette form state
  const [paletteName, setPaletteName] = useState("");
  const [paletteColor, setPaletteColor] = useState(DOMAIN_COLORS[3]);
  const [paletteAgents, setPaletteAgents] = useState<
    { id: string; name: string; description: string }[]
  >([{ id: "", name: "", description: "" }]);

  // Import state
  const [importJson, setImportJson] = useState("");

  const handleAddAgent = async () => {
    if (!agentId.trim() || !agentName.trim()) return;
    const newAgent: AgentDefinition = {
      id: agentId.trim(),
      name: agentId.trim(),
      displayName: agentName.trim(),
      description: agentDesc.trim(),
      fullDescription: agentFullDesc.trim() || undefined,
      capabilities: agentCaps
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      domain: agentDomain,
      color: agentColor,
      modelTier: agentModelTier,
      isCustom: true,
    };

    // Register in backend trainer service (if callback provided)
    if (onRegisterAgent) {
      setRegistering(true);
      try {
        await onRegisterAgent(newAgent);
      } catch (e) {
        // Non-blocking — agent still gets added to palette even if backend fails
        console.warn("Backend registration failed (agent added to palette only):", e);
      } finally {
        setRegistering(false);
      }
    }

    onAddAgent(newAgent);
    // Reset form
    setAgentId("");
    setAgentName("");
    setAgentDesc("");
    setAgentFullDesc("");
    setAgentCaps("");
  };

  const handleAddPalette = () => {
    if (!paletteName.trim() || paletteAgents.every((a) => !a.id.trim()))
      return;
    const agents: AgentDefinition[] = paletteAgents
      .filter((a) => a.id.trim() && a.name.trim())
      .map((a) => ({
        id: a.id.trim(),
        name: a.id.trim(),
        displayName: a.name.trim(),
        description: a.description.trim(),
        domain: paletteName.trim(),
        color: paletteColor,
        isCustom: true,
      }));
    onAddDomain(paletteName.trim(), agents);
    setPaletteName("");
    setPaletteAgents([{ id: "", name: "", description: "" }]);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importJson);
      if (data.domain && Array.isArray(data.agents)) {
        const agents: AgentDefinition[] = data.agents.map(
          (a: Record<string, string>) => ({
            id: a.id,
            name: a.id,
            displayName: a.name || a.displayName || a.id,
            description: a.description || "",
            fullDescription: a.fullDescription,
            capabilities: a.capabilities,
            domain: data.domain,
            color: data.color || DOMAIN_COLORS[4],
            modelTier: a.modelTier,
            isCustom: true,
          })
        );
        onAddDomain(data.domain, agents);
        setImportJson("");
      } else if (data.id) {
        onAddAgent({ ...data, isCustom: true } as AgentDefinition);
        setImportJson("");
      }
    } catch {
      alert("Invalid JSON. See the format example below.");
    }
  };

  const addPaletteRow = () =>
    setPaletteAgents((p) => [...p, { id: "", name: "", description: "" }]);
  const updatePaletteRow = (
    i: number,
    field: string,
    value: string
  ) =>
    setPaletteAgents((p) =>
      p.map((r, j) => (j === i ? { ...r, [field]: value } : r))
    );
  const removePaletteRow = (i: number) =>
    setPaletteAgents((p) => p.filter((_, j) => j !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-[640px] max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Manage Agents</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {(
            [
              { key: "agent" as const, label: "Add Agent", icon: Bot },
              { key: "palette" as const, label: "Add Palette", icon: Palette },
              { key: "import" as const, label: "Import JSON", icon: Plus },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 ${
                tab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Add Agent Tab ── */}
          {tab === "agent" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Agent ID *
                  </label>
                  <input
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder="e.g. MyAgent"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Display Name *
                  </label>
                  <input
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="e.g. My Custom Agent"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Short Description *
                </label>
                <input
                  value={agentDesc}
                  onChange={(e) => setAgentDesc(e.target.value)}
                  placeholder="One-line description for the palette"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Full Description
                </label>
                <textarea
                  value={agentFullDesc}
                  onChange={(e) => setAgentFullDesc(e.target.value)}
                  rows={3}
                  placeholder="Detailed description shown in the agent info modal"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Capabilities (one per line)
                </label>
                <textarea
                  value={agentCaps}
                  onChange={(e) => setAgentCaps(e.target.value)}
                  rows={3}
                  placeholder={"Data analysis\nReport generation\nPattern detection"}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-y font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Domain
                  </label>
                  <select
                    value={agentDomain}
                    onChange={(e) => setAgentDomain(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.keys(adapter.domainGroups).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="__new__">+ New domain...</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Color
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DOMAIN_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setAgentColor(c)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          agentColor === c
                            ? "border-slate-800"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Model Tier
                  </label>
                  <select
                    value={agentModelTier}
                    onChange={(e) => setAgentModelTier(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="claude-haiku">Haiku (fast/cheap)</option>
                    <option value="claude-sonnet">Sonnet (balanced)</option>
                    <option value="claude-opus">Opus (complex)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleAddAgent}
                disabled={!agentId.trim() || !agentName.trim() || registering}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={14} />
                {registering ? "Registering..." : onRegisterAgent ? "Add & Register Agent" : "Add Agent"}
              </button>
              {onRegisterAgent && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Agent will be registered in the trainer service for full training, knowledge, and execution support.
                </p>
              )}
            </div>
          )}

          {/* ── Add Palette Tab ── */}
          {tab === "palette" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Domain Name *
                  </label>
                  <input
                    value={paletteName}
                    onChange={(e) => setPaletteName(e.target.value)}
                    placeholder="e.g. Customer Success"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Domain Color
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DOMAIN_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setPaletteColor(c)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          paletteColor === c
                            ? "border-slate-800"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Agents in this palette
                </label>
                <div className="space-y-2">
                  {paletteAgents.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={a.id}
                        onChange={(e) =>
                          updatePaletteRow(i, "id", e.target.value)
                        }
                        placeholder="ID"
                        className="w-28 border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        value={a.name}
                        onChange={(e) =>
                          updatePaletteRow(i, "name", e.target.value)
                        }
                        placeholder="Display Name"
                        className="w-36 border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        value={a.description}
                        onChange={(e) =>
                          updatePaletteRow(i, "description", e.target.value)
                        }
                        placeholder="Description"
                        className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {paletteAgents.length > 1 && (
                        <button
                          onClick={() => removePaletteRow(i)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addPaletteRow}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    + Add another agent
                  </button>
                </div>
              </div>
              <button
                onClick={handleAddPalette}
                disabled={!paletteName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Palette size={14} />
                Create Palette
              </button>
            </div>
          )}

          {/* ── Import JSON Tab ── */}
          {tab === "import" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Paste a JSON definition to import an agent or an entire domain
                palette.
              </p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={10}
                placeholder={`Single agent:\n{"id":"MyAgent","displayName":"My Agent","description":"Does things","domain":"Custom","capabilities":["Cap 1","Cap 2"]}\n\nDomain palette:\n{"domain":"Customer Success","color":"#3b82f6","agents":[{"id":"CSBot","name":"CS Bot","description":"Handles CS tasks"}]}`}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={14} />
                Import
              </button>
            </div>
          )}

          {/* Current custom agents */}
          {adapter.agents.some((a) => a.isCustom) && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Custom Agents
              </h3>
              <div className="space-y-1">
                {adapter.agents
                  .filter((a) => a.isCustom)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: a.color }}
                      />
                      <span className="text-sm text-slate-700 flex-1">
                        {a.displayName}{" "}
                        <span className="text-slate-400">({a.domain})</span>
                      </span>
                      <button
                        onClick={() => onRemoveAgent(a.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
