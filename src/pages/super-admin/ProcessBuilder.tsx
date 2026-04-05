/**
 * DAG Process Builder page — super-admin access.
 *
 * Wires the @inspiresgenius/dag-builder package into the IG frontend.
 */

import SuperAdminLayout from "@/layouts/SuperAdminLayout";
// @ts-expect-error — dag-builder workspace package not yet linked to frontend
import { DagBuilder, createIGConfig } from "@inspiresgenius/dag-builder";

type ProcessTemplate = {
  id?: string;
  name: string;
  steps: unknown[];
};

function ProcessBuilderPage() {
  const config = createIGConfig(
    import.meta.env.VITE_AGENT_ENGINE_URL || "http://localhost:8001"
  );

  return (
    <SuperAdminLayout>
      <div className="h-[calc(100vh-64px)] -m-6">
        <DagBuilder
          ecosystemConfig={config}
          onSave={(template: ProcessTemplate) => {
            console.log("Template saved:", template);
          }}
        />
      </div>
    </SuperAdminLayout>
  );
}

export default ProcessBuilderPage;
