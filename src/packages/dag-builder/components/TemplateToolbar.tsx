/**
 * Action toolbar — save, load, validate, auto-layout, undo/redo, export, fork, clear.
 */

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
} from "lucide-react";
import { useDagStore } from "../hooks/useDagStore";
import type { EcosystemConfig } from "../types/ecosystem";

type Props = {
  ecosystemConfig: EcosystemConfig;
  onSave?: () => void;
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
  const { isDirty, getValidation, undo, redo, history, nodes, template, clearCanvas } =
    useDagStore();
  const validation = getValidation();

  const handleExport = () => {
    const data = ecosystemConfig.adapter.toApiFormat({
      id: template.id ?? "",
      name: template.name ?? "untitled",
      description: template.description ?? "",
      version: template.version ?? 1,
      triggerKeywords: template.triggerKeywords ?? [],
      nodes,
      edges: [],
      metadata: {},
    });
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
        console.error("Import failed:", err);
      }
    };
    input.click();
  };

  return (
    <div
      className={`flex items-center gap-1 px-4 py-2 bg-white border-b border-slate-200 ${className ?? ""}`}
    >
      {/* Primary actions */}
      <button
        onClick={onSave}
        disabled={!isDirty || !validation.valid}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Save template"
      >
        <Save size={14} />
        Save
      </button>

      <button
        onClick={() => {}}
        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 text-sm rounded-md hover:bg-slate-100"
        title="Fork version"
      >
        <GitBranch size={14} />
        Fork
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
        onClick={() => {}}
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
        className="p-1.5 text-slate-600 rounded-md hover:bg-slate-100"
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
  );
}
