/**
 * Cost tracking, audit, and expense types for the DAG Process Builder.
 *
 * Tracks the full cost lifecycle: template build costs, per-execution costs,
 * audit trail, cost comparisons (from-scratch vs decomposition), and ROI.
 */

/** A single billable event recorded during template creation or execution. */
export type CostEvent = {
  id: string;
  timestamp: string;
  eventType:
    | "llm_call"
    | "template_save"
    | "template_execution"
    | "embedding_lookup"
    | "tool_call"
    | "validation";
  templateId?: string;
  templateName?: string;
  userId: string;
  userRole: string;
  agentName?: string;
  modelTier: "claude-sonnet" | "claude-haiku" | "claude-opus" | "embedding";
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  metadata: Record<string, unknown>;
};

/** Aggregated cost for a single DAG build method. */
export type BuildMethodCost = {
  method: "from_scratch" | "decomposition" | "clone" | "import";
  totalCostUsd: number;
  llmPlanningCostUsd: number;
  llmRefinementCostUsd: number;
  embeddingCostUsd: number;
  validationCostUsd: number;
  executionCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalLlmCalls: number;
  avgLatencyMs: number;
  stepCount: number;
  waveCount: number;
  buildDurationMs: number;
  iterationCount: number;
};

/** Side-by-side comparison of build methods. */
export type CostComparison = {
  templateName: string;
  comparedAt: string;
  fromScratch: BuildMethodCost;
  fromDecomposition: BuildMethodCost;
  savings: {
    costSavingsUsd: number;
    costSavingsPercent: number;
    timeSavingsMs: number;
    timeSavingsPercent: number;
    fewerLlmCalls: number;
    fewerTokens: number;
  };
};

/** Cost of a single agent within an execution. */
export type AgentCostRecord = {
  agentName: string;
  modelTier: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
};

/** Cost of a single template execution. */
export type ExecutionCostRecord = {
  executionId: string;
  templateId: string;
  timestamp: string;
  userId: string;
  userRole: string;
  agentCosts: AgentCostRecord[];
  synthesisCost: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
  totalCostUsd: number;
  totalLatencyMs: number;
  waveCount: number;
  stepCount: number;
  stepsCompleted: number;
  stepsFailed: number;
  stepsSkipped: number;
};

/** Full expense report for a template across its lifecycle. */
export type TemplateExpenseReport = {
  templateId: string;
  templateName: string;
  version: number;
  createdBy: string;
  createdAt: string;
  buildMethod: "from_scratch" | "decomposition" | "clone" | "import";
  buildCost: BuildMethodCost;
  executionHistory: ExecutionCostRecord[];
  totalLifetimeCostUsd: number;
  executionCount: number;
  avgExecutionCostUsd: number;
  costPerUser: number;
  roi: {
    manualProcessCostEstimate: number;
    automationSavings: number;
    breakEvenExecutions: number;
  };
};

/** Immutable audit log entry. */
export type AuditEntry = {
  id: string;
  timestamp: string;
  action:
    | "template_created"
    | "template_updated"
    | "template_deleted"
    | "template_forked"
    | "template_executed"
    | "template_exported"
    | "template_imported"
    | "step_added"
    | "step_removed"
    | "step_modified"
    | "agent_swapped"
    | "decomposition_requested"
    | "decomposition_accepted"
    | "refinement_requested"
    | "validation_run";
  userId: string;
  userRole: string;
  templateId?: string;
  templateName?: string;
  details: Record<string, unknown>;
  costEvent?: CostEvent;
  previousState?: unknown;
  newState?: unknown;
};

/** All data needed by the cost analytics dashboard. */
export type CostDashboardData = {
  summary: {
    totalTemplates: number;
    totalExecutions: number;
    totalCostUsd: number;
    avgCostPerExecution: number;
    avgCostPerTemplate: number;
    costThisMonth: number;
    costLastMonth: number;
    monthOverMonthChange: number;
  };
  costByBuildMethod: Record<string, BuildMethodCost>;
  costByAgent: Record<
    string,
    { totalCostUsd: number; callCount: number; avgCostPerCall: number }
  >;
  costByModelTier: Record<
    string,
    { totalCostUsd: number; totalTokens: number }
  >;
  costTimeline: { date: string; costUsd: number; executionCount: number }[];
  topExpensiveTemplates: TemplateExpenseReport[];
  recentAuditEntries: AuditEntry[];
};
