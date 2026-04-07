/**
 * Template Gallery — browse and load saved templates from localStorage and API.
 */

import { useState, useEffect } from "react";
import { FolderOpen, Trash2, Upload, Clock, Layers } from "lucide-react";
import type { EcosystemConfig } from "../types/ecosystem";
import type { DagTemplate } from "../types/dag";
import { computeWaves } from "../lib/dag-utils";

type Props = {
  ecosystemConfig: EcosystemConfig;
  onLoad: (template: DagTemplate) => void;
  className?: string;
};

type SavedEntry = {
  key: string;
  name: string;
  description: string;
  stepCount: number;
  waveCount: number;
  savedAt: string;
  raw: unknown;
};

export function TemplateGallery({ ecosystemConfig, onLoad, className }: Props) {
  const [templates, setTemplates] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = () => {
    setLoading(true);
    const entries: SavedEntry[] = [];

    // Load from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("dag-template-")) continue;
      try {
        const raw = JSON.parse(localStorage.getItem(key) ?? "");
        const tpl = ecosystemConfig.adapter.fromApiFormat(raw);
        const waves = computeWaves(tpl.nodes);
        entries.push({
          key,
          name: tpl.name || key.replace("dag-template-", ""),
          description: tpl.description || "",
          stepCount: tpl.nodes.length,
          waveCount: waves.length,
          savedAt: tpl.updatedAt || tpl.createdAt || "Unknown",
          raw,
        });
      } catch {
        // Skip invalid entries
      }
    }

    setTemplates(entries);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleLoad = (entry: SavedEntry) => {
    try {
      const tpl = ecosystemConfig.adapter.fromApiFormat(entry.raw);
      onLoad(tpl);
    } catch (err) {
      alert("Failed to load template: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleDelete = (entry: SavedEntry) => {
    if (!confirm(`Delete "${entry.name}"? This cannot be undone.`)) return;
    localStorage.removeItem(entry.key);
    loadTemplates();
  };

  const handleImportJson = () => {
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
        // Save to localStorage
        const key = `dag-template-${tpl.name || "imported-" + Date.now()}`;
        localStorage.setItem(key, text);
        loadTemplates();
        onLoad(tpl);
      } catch (err) {
        alert("Import failed: " + (err instanceof Error ? err.message : "Invalid JSON"));
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className ?? ""}`}>
        <p className="text-sm text-slate-400">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto p-6 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Saved Templates</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {templates.length} template{templates.length !== 1 ? "s" : ""} saved locally
          </p>
        </div>
        <button
          onClick={handleImportJson}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
        >
          <Upload size={14} />
          Import JSON
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-sm text-slate-500 mb-1">No saved templates yet</p>
          <p className="text-xs text-slate-400">
            Build a workflow on the Editor tab and click Save, or import a JSON
            file.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((entry) => (
            <div
              key={entry.key}
              className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleLoad(entry)}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-sm text-slate-800 truncate flex-1">
                  {entry.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(entry);
                  }}
                  className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {entry.description || "No description"}
              </p>
              <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Layers size={10} />
                  {entry.stepCount} steps
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {entry.waveCount} waves
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
