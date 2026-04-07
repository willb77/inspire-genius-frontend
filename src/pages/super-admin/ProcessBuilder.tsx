/**
 * DAG Process Builder page.
 * Public at /dev/process-builder (no auth).
 * Protected at /super-admin/process-builder (auth required).
 */

import { DagBuilder, createIGConfig } from "@inspiresgenius/dag-builder";

const config = createIGConfig(
  import.meta.env.VITE_AGENT_ENGINE_URL || "http://localhost:8001"
);

function ProcessBuilderPage() {
  return (
    <div className="h-screen w-screen">
      <DagBuilder
        ecosystemConfig={config}
        onSave={(template) => {
          console.log("Template saved:", template);
        }}
      />
    </div>
  );
}

export default ProcessBuilderPage;
