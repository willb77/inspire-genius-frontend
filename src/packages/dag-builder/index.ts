// ─── Main Component ─────────────────────────────────────────────
export { DagBuilder } from "./components/DagBuilder";
export type { DagBuilderProps } from "./components/DagBuilder";

// ─── Sub-Components ─────────────────────────────────────────────
export { DagCanvas } from "./components/DagCanvas";
export { AgentPalette } from "./components/AgentPalette";
export { AgentNode, StartNode, EndNode } from "./components/AgentNode";
export { NodePropertyPanel } from "./components/NodePropertyPanel";
export { TemplateMetadataPanel } from "./components/TemplateMetadataPanel";
export { TemplateToolbar } from "./components/TemplateToolbar";
export { ProcessDecomposer } from "./components/ProcessDecomposer";
export { CostEstimatePanel } from "./components/CostEstimatePanel";

// ─── Hooks ──────────────────────────────────────────────────────
export { useDagStore } from "./hooks/useDagStore";
export { useAutoLayout } from "./hooks/useAutoLayout";
export {
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  TemplateApiClient,
} from "./hooks/useTemplateApi";

// ─── Adapters ───────────────────────────────────────────────────
export {
  igAdapter,
  createIGConfig,
  IG_AGENTS,
  IG_DOMAIN_GROUPS,
} from "./adapters/ig-adapter";
export {
  voiceDeskAdapter,
  createVoiceDeskConfig,
  VDAI_AGENTS,
  VDAI_DOMAIN_GROUPS,
} from "./adapters/voicedeskai-adapter";
export {
  createGenericAdapter,
  loadAdapterFromJson,
} from "./adapters/generic-adapter";
export type { GenericEcosystemConfig } from "./adapters/generic-adapter";

// ─── Utilities ──────────────────────────────────────────────────
export {
  detectCycles,
  topologicalSort,
  computeWaves,
  validateDag,
  canAddEdge,
  removeNodeAndCleanDeps,
  computeNodeDepth,
} from "./lib/dag-utils";
export { autoLayout, deriveEdges } from "./lib/layout";
export {
  MODEL_COSTS,
  DEFAULT_AGENT_MODEL_MAP,
  estimateTokens,
  calculateLlmCost,
  estimateDecompositionCost,
  estimateFromScratchCost,
  estimateExecutionCost,
  calculateCostComparison,
  calculateBreakEvenExecutions,
} from "./lib/cost-calculator";

// ─── Types ──────────────────────────────────────────────────────
export type {
  DagNode,
  DagEdge,
  DagTemplate,
  DagValidationResult,
  DagValidationError,
  WaveGroup,
  AgentDefinition,
  EcosystemAdapter,
  EcosystemConfig,
  CostEvent,
  BuildMethodCost,
  CostComparison,
  AgentCostRecord,
  ExecutionCostRecord,
  TemplateExpenseReport,
  AuditEntry,
  CostDashboardData,
} from "./types";
