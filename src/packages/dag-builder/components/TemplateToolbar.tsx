/**
 * Action toolbar — save, fork, visualize, undo/redo, layout, validate, export, import, clear.
 */

import { useState } from "react";
import {
  Save,
  Undo2,
  Redo2,
  LayoutGrid,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Trash2,
  GitBranch,
  FileText,
  Eye,
  Loader2,
  Check,
  Bot,
} from "lucide-react";
import { useDagStore } from "../hooks/useDagStore";
import type { EcosystemConfig } from "../types/ecosystem";
import type { DagTemplate, DagNode } from "../types/dag";
import { computeWaves } from "../lib/dag-utils";

type Props = {
  ecosystemConfig: EcosystemConfig;
  onSave?: (template: DagTemplate) => void;
  onLoad?: () => void;
  onAutoLayout?: () => void;
  className?: string;
};

export function TemplateToolbar({
  ecosystemConfig,
  onSave,
  onLoad,
  onAutoLayout,
  className,
}: Props) {
  const { isDirty, getValidation, undo, redo, history, nodes, edges, template, clearCanvas, updateTemplate } =
    useDagStore();
  const validation = getValidation();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showViz, setShowViz] = useState(false);

  const buildTemplate = (): DagTemplate => ({
    id: template.id ?? "",
    name: template.name ?? "Untitled",
    description: template.description ?? "",
    version: template.version ?? 1,
    triggerKeywords: template.triggerKeywords ?? [],
    nodes,
    edges,
    metadata: template.metadata ?? {},
  });

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const tpl = buildTemplate();

      // Always save to localStorage for offline access
      const apiData = ecosystemConfig.adapter.toApiFormat(tpl);
      const storageKey = `dag-template-${tpl.name}`;
      localStorage.setItem(storageKey, JSON.stringify(apiData));

      // Also try API save (non-blocking)
      try {
        const resp = await fetch(
          `${ecosystemConfig.apiBaseUrl}/v1/admin/templates`,
          {
            method: template.id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(apiData),
          }
        );
        if (resp.ok) {
          const data = await resp.json();
          updateTemplate({ id: data.id ?? template.id });
        }
      } catch {
        // API unavailable — localStorage save is the fallback
      }

      onSave?.(tpl);
      useDagStore.setState({ isDirty: false });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  // ── Fork ──
  const handleFork = () => {
    const newVersion = (template.version ?? 1) + 1;
    const newName = `${template.name ?? "Untitled"} (v${newVersion})`;
    updateTemplate({
      id: undefined,
      version: newVersion,
      name: newName,
    });
    useDagStore.setState({ isDirty: true });
    alert(`Forked as "${newName}" v${newVersion}. Click Save to persist.`);
  };

  // ── Export ──
  const handleExport = () => {
    const data = ecosystemConfig.adapter.toApiFormat(buildTemplate());
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name ?? "template"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import ──
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const tpl = ecosystemConfig.adapter.fromApiFormat(data);
        useDagStore.getState().loadTemplate(tpl);
      } catch (err) {
        alert("Import failed: " + (err instanceof Error ? err.message : "Invalid JSON"));
      }
    };
    input.click();
  };

  return (
    <>
      <div
        className={`flex items-center gap-1 px-4 py-2 bg-white border-b border-slate-200 ${className ?? ""}`}
      >
        {/* Primary actions */}
        <button
          onClick={handleSave}
          disabled={saving || (!isDirty && !saved)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save template"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <Check size={14} />
          ) : (
            <Save size={14} />
          )}
          {saving ? "Saving..." : saved ? "Saved" : "Save"}
        </button>

        <button
          onClick={handleFork}
          disabled={nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 text-sm rounded-md hover:bg-slate-100 disabled:opacity-50"
          title="Fork as new version"
        >
          <GitBranch size={14} />
          Fork
        </button>

        <button
          onClick={() => setShowViz(true)}
          disabled={nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 text-sm rounded-md hover:bg-slate-100 disabled:opacity-50"
          title="Visualize DAG planning map"
        >
          <Eye size={14} />
          Visualize
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Editing */}
        <button
          onClick={undo}
          disabled={history.past.length === 0}
          className="p-1.5 text-slate-600 rounded-md hover:bg-slate-100 disabled:opacity-30"
          title="Undo (Cmd+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={history.future.length === 0}
          className="p-1.5 text-slate-600 rounded-md hover:bg-slate-100 disabled:opacity-30"
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>

        <button
          onClick={onAutoLayout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-600 text-sm rounded-md hover:bg-slate-100"
          title="Auto-layout"
        >
          <LayoutGrid size={14} />
          Layout
        </button>

        <button
          onClick={() => {
            const v = getValidation();
            if (v.valid) {
              alert("DAG is valid! No errors found.");
            } else {
              alert(
                `Validation errors (${v.errors.length}):\n\n` +
                  v.errors.map((e) => `• ${e.message}`).join("\n")
              );
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md hover:bg-slate-100"
          title="Validate DAG"
        >
          {validation.valid ? (
            <CheckCircle size={14} className="text-green-600" />
          ) : (
            <XCircle size={14} className="text-red-500" />
          )}
          <span className={validation.valid ? "text-green-700" : "text-red-600"}>
            {validation.valid ? "Valid" : `${validation.errors.length} errors`}
          </span>
        </button>

        <div className="flex-1" />

        {/* Utilities */}
        <button
          onClick={onLoad}
          className="p-1.5 text-slate-600 rounded-md hover:bg-slate-100"
          title="Load template"
        >
          <FileText size={16} />
        </button>
        <button
          onClick={handleExport}
          disabled={nodes.length === 0}
          className="p-1.5 text-slate-600 rounded-md hover:bg-slate-100 disabled:opacity-30"
          title="Export JSON"
        >
          <Download size={16} />
        </button>
        <button
          onClick={handleImport}
          className="p-1.5 text-slate-600 rounded-md hover:bg-slate-100"
          title="Import JSON"
        >
          <Upload size={16} />
        </button>
        <button
          onClick={() => {
            if (confirm("Clear the canvas? This cannot be undone.")) clearCanvas();
          }}
          className="p-1.5 text-red-500 rounded-md hover:bg-red-50"
          title="Clear canvas"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* ── DAG Visualization Modal ── */}
      {showViz && <DagVisualizationModal nodes={nodes} onClose={() => setShowViz(false)} />}
    </>
  );
}

// ── DAG Visualization Modal ─────────────────────────────────────

function DagVisualizationModal({
  nodes,
  onClose,
}: {
  nodes: DagNode[];
  onClose: () => void;
}) {
  const waves = computeWaves(nodes);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              DAG Planning Map
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {nodes.length} steps · {waves.length} waves ·{" "}
              {waves.filter((w) => w.nodeIds.length > 1).length} parallel waves
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <XCircle size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {/* Wave-by-wave visualization */}
          {waves.map((wg, wi) => (
            <div key={wg.wave} className="mb-4">
              {/* Wave header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="text-xs font-bold text-white px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: [
                      "#3b82f6",
                      "#10b981",
                      "#f59e0b",
                      "#8b5cf6",
                      "#ef4444",
                    ][wg.wave % 5],
                  }}
                >
                  Wave {wg.wave}
                </div>
                <span className="text-xs text-slate-400">
                  {wg.nodeIds.length === 1
                    ? "1 step"
                    : `${wg.nodeIds.length} steps (parallel)`}
                </span>
              </div>

              {/* Steps in this wave */}
              <div className="flex gap-3 flex-wrap">
                {wg.nodeIds.map((nid) => {
                  const node = nodeMap.get(nid);
                  if (!node) return null;
                  return (
                    <div
                      key={nid}
                      className="flex-1 min-w-[200px] max-w-[300px] border border-slate-200 rounded-lg p-3 bg-white"
                    >
                      <div className="flex items-center gap-2">
                        <Bot size={14} className="text-slate-500" />
                        <span className="font-semibold text-sm text-slate-800">
                          {node.label || node.agentId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {node.description || "No description"}
                      </p>
                      {node.dependsOn.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Depends on:{" "}
                          {node.dependsOn
                            .map(
                              (d) =>
                                nodeMap.get(d)?.label ||
                                nodeMap.get(d)?.agentId ||
                                d
                            )
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Arrow to next wave */}
              {wi < waves.length - 1 && (
                <div className="flex justify-center my-2">
                  <div className="text-slate-300">↓</div>
                </div>
              )}
            </div>
          ))}

          {nodes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              No nodes on the canvas. Add agents to see the DAG planning map.
            </p>
          )}

          {/* Summary */}
          {nodes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Execution Summary
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 text-xs">Total Steps</span>
                  <p className="font-bold text-slate-800">{nodes.length}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Waves</span>
                  <p className="font-bold text-slate-800">{waves.length}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Max Parallelism</span>
                  <p className="font-bold text-slate-800">
                    {Math.max(...waves.map((w) => w.nodeIds.length), 0)} steps
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This workflow executes in {waves.length} sequential waves. Steps
                within the same wave run simultaneously, reducing total execution
                time from {nodes.length} serial calls to {waves.length} wave
                cycles.
              </p>
            </div>
          )}
        </div>

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
