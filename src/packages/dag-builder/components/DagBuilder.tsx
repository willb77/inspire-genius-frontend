/**
 * DagBuilder — main orchestrator component.
 *
 * This is the PUBLIC API entry point:
 *   import { DagBuilder } from '@inspiresgenius/dag-builder'
 *
 * Layout: Toolbar | AgentPalette | DagCanvas | NodePropertyPanel | CostPanel
 * Tabs: Editor | Prompt Builder | Templates
 */

import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { LayoutGrid, Sparkles, FolderOpen } from "lucide-react";

import type { EcosystemConfig } from "../types/ecosystem";
import type { DagTemplate } from "../types/dag";
import { useDagStore } from "../hooks/useDagStore";
import { useAutoLayout } from "../hooks/useAutoLayout";

import { DagCanvas } from "./DagCanvas";
import { AgentPalette } from "./AgentPalette";
import { NodePropertyPanel } from "./NodePropertyPanel";
import { TemplateMetadataPanel } from "./TemplateMetadataPanel";
import { TemplateToolbar } from "./TemplateToolbar";
import { ProcessDecomposer } from "./ProcessDecomposer";
import { CostEstimatePanel } from "./CostEstimatePanel";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

type Tab = "editor" | "decomposer" | "templates";

export type DagBuilderProps = {
  ecosystemConfig: EcosystemConfig;
  ecosystems?: EcosystemConfig[];
  initialTemplateId?: string;
  readOnly?: boolean;
  className?: string;
  onSave?: (template: DagTemplate) => void;
  onTemplateChange?: (template: DagTemplate) => void;
};

function DagBuilderInner({
  ecosystemConfig,
  readOnly,
  className,
  onSave,
}: DagBuilderProps) {
  const [tab, setTab] = useState<Tab>("editor");
  const { loadTemplate, setAvailableAgentIds, nodes, template } =
    useDagStore();
  const { applyLayout } = useAutoLayout();

  // Set available agents when ecosystem changes
  useEffect(() => {
    setAvailableAgentIds(ecosystemConfig.adapter.agents.map((a) => a.id));
  }, [ecosystemConfig, setAvailableAgentIds]);

  const handleAcceptDecomposition = useCallback(
    (tpl: DagTemplate) => {
      loadTemplate(tpl);
      setTab("editor");
    },
    [loadTemplate]
  );

  const handleSave = useCallback(() => {
    const tpl: DagTemplate = {
      id: template.id ?? "",
      name: template.name ?? "",
      description: template.description ?? "",
      version: template.version ?? 1,
      triggerKeywords: template.triggerKeywords ?? [],
      nodes,
      edges: [],
      metadata: template.metadata ?? {},
    };
    onSave?.(tpl);
  }, [nodes, template, onSave]);

  return (
    <div className={`flex flex-col h-full bg-slate-50 ${className ?? ""}`}>
      {/* Toolbar */}
      <TemplateToolbar
        ecosystemConfig={ecosystemConfig}
        onSave={handleSave}
        onAutoLayout={() => applyLayout("TB")}
      />

      {/* Metadata */}
      <TemplateMetadataPanel />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4">
        {(
          [
            { key: "editor" as Tab, label: "Editor", icon: LayoutGrid },
            { key: "decomposer" as Tab, label: "Prompt Builder", icon: Sparkles },
            { key: "templates" as Tab, label: "Templates", icon: FolderOpen },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 flex overflow-hidden">
        {tab === "editor" && (
          <>
            <AgentPalette adapter={ecosystemConfig.adapter} />
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                <DagCanvas ecosystemConfig={ecosystemConfig} readOnly={readOnly} />
              </div>
              <CostEstimatePanel ecosystemConfig={ecosystemConfig} />
            </div>
            <NodePropertyPanel adapter={ecosystemConfig.adapter} />
          </>
        )}

        {tab === "decomposer" && (
          <div className="flex-1">
            <ProcessDecomposer
              ecosystemConfig={ecosystemConfig}
              onAccept={handleAcceptDecomposition}
            />
          </div>
        )}

        {tab === "templates" && (
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center">
              <FolderOpen size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Template gallery — connect to your API to browse saved templates.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Endpoint: {ecosystemConfig.apiBaseUrl}/v1/admin/templates
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DagBuilder(props: DagBuilderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        <DagBuilderInner {...props} />
      </ReactFlowProvider>
    </QueryClientProvider>
  );
}
