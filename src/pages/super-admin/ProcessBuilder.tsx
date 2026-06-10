/**
 * DAG Process Builder page.
 * Public at /dev/process-builder (no auth).
 * Protected at /super-admin/process-builder (auth required).
 *
 * Wires the dag-builder package to IG's authenticated `agentApi` axios
 * instance so template CRUD (GET list, POST save, PATCH update) hits
 * `/v1/admin/templates` with the user's access-token + automatic 401
 * refresh handled by the agentApi interceptors.
 */

import { useMemo } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import {
  DagBuilder,
  createIGConfig,
  TemplateApiClient,
  igAdapter,
} from "@inspiresgenius/dag-builder";
import type { DagTemplate } from "@inspiresgenius/dag-builder";
import { agentApi } from "@/lib/agentApi";

function ProcessBuilderPage() {
  const config = useMemo(
    () =>
      createIGConfig(
        import.meta.env.VITE_AGENT_ENGINE_URL || "http://localhost:8001",
        undefined,
        agentApi,
      ),
    [],
  );

  // Standalone client used by the page-level save handler so we can
  // distinguish create vs update by the presence of `template.id`. The
  // internal DagBuilder hooks also use this same agentApi via config.
  const client = useMemo(
    () => new TemplateApiClient(config.apiBaseUrl, igAdapter, agentApi),
    [config.apiBaseUrl],
  );

  const handleSave = async (template: DagTemplate) => {
    // DagBuilder emits id="" for unsaved new templates; backend assigns
    // a UUID on POST. Any non-empty id is an existing record → PATCH.
    const isExisting = Boolean(template.id) && template.id.length > 0;
    try {
      const saved = isExisting
        ? await client.update(template.id, template)
        : await client.create(template);
      toast.success(
        isExisting
          ? `Updated template "${saved.name}"`
          : `Created template "${saved.name}"`,
      );
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string }>;
      const detail =
        ax.response?.data?.detail || ax.message || "Failed to save template";
      toast.error(`Save failed: ${detail}`);
    }
  };

  return (
    <div className="h-screen w-screen">
      <DagBuilder ecosystemConfig={config} onSave={handleSave} />
    </div>
  );
}

export default ProcessBuilderPage;
