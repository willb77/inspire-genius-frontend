/**
 * Pure cost calculation functions — client-side cost estimation.
 *
 * Mirrors the backend cost model in services/agent-engine/app/analytics/tracker.py.
 * All functions are pure (no side effects, no API calls).
 */

import type {
  BuildMethodCost,
  CostComparison,
  ExecutionCostRecord,
  AgentCostRecord,
} from "../types/cost-tracking";
import type { DagTemplate, DagNode } from "../types/dag";
import { computeWaves } from "./dag-utils";

// ─── Cost Constants (matching backend MODEL_COSTS) ──────────────

/** Cost per 1K tokens by model tier (USD). */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "claude-sonnet": { input: 0.003, output: 0.015 },
  "claude-haiku": { input: 0.00025, output: 0.00125 },
  "claude-opus": { input: 0.015, output: 0.075 },
  embedding: { input: 0.00002, output: 0.0 },
};

/** Default agent → model tier mapping (IG ecosystem). */
export const DEFAULT_AGENT_MODEL_MAP: Record<string, string> = {
  Meridian: "claude-sonnet",
  Aura: "claude-sonnet",
  Sage: "claude-sonnet",
  James: "claude-sonnet",
  Anchor: "claude-sonnet",
  Nova: "claude-haiku",
  Echo: "claude-haiku",
  Forge: "claude-haiku",
  Atlas: "claude-haiku",
  Compass: "claude-haiku",
  Sentinel: "claude-haiku",
  Bridge: "claude-haiku",
  Ascend: "claude-haiku",
  Nexus: "claude-opus",
};

// ─── Utility Functions ──────────────────────────────────────────

/** Rough token estimate from text length (chars / 4). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Calculate LLM cost in USD for given tokens and model tier. */
export function calculateLlmCost(
  modelTier: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[modelTier] ?? MODEL_COSTS["claude-sonnet"];
  return (
    (inputTokens / 1000) * costs.input +
    (outputTokens / 1000) * costs.output
  );
}

// ─── Build Cost Estimators ──────────────────────────────────────

/**
 * Estimate cost of building a DAG via LLM-powered decomposition.
 *
 * Includes: 1 planning call (Haiku), ~1.5 refinement iterations (Haiku),
 * embedding calls for trigger keywords.
 */
export function estimateDecompositionCost(
  description: string,
  agentCount: number
): BuildMethodCost {
  const descTokens = estimateTokens(description);

  // Planning call (Haiku): system prompt + agents + description
  const planInputTokens = 500 + agentCount * 50 + descTokens;
  const planOutputTokens = 300;
  const planCost = calculateLlmCost(
    "claude-haiku",
    planInputTokens,
    planOutputTokens
  );

  // Refinement calls (avg 1.5 iterations)
  const refineIterations = 1.5;
  const refineInputTokens = 400 + descTokens;
  const refineOutputTokens = 250;
  const refineCost =
    calculateLlmCost("claude-haiku", refineInputTokens, refineOutputTokens) *
    refineIterations;

  // Embedding calls (avg 4 keywords)
  const embeddingTokens = 100 * 4;
  const embeddingCost = calculateLlmCost("embedding", embeddingTokens, 0);

  const totalCost = planCost + refineCost + embeddingCost;
  const totalInput =
    planInputTokens +
    Math.round(refineInputTokens * refineIterations) +
    embeddingTokens;
  const totalOutput =
    planOutputTokens + Math.round(refineOutputTokens * refineIterations);

  return {
    method: "decomposition",
    totalCostUsd: totalCost,
    llmPlanningCostUsd: planCost,
    llmRefinementCostUsd: refineCost,
    embeddingCostUsd: embeddingCost,
    validationCostUsd: 0,
    executionCostUsd: 0,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalLlmCalls: 1 + Math.ceil(refineIterations) + 4,
    avgLatencyMs: 2000,
    stepCount: 0,
    waveCount: 0,
    buildDurationMs: 120_000, // ~2 min
    iterationCount: Math.ceil(refineIterations),
  };
}

/**
 * Estimate cost of building a DAG manually from scratch.
 * LLM cost is $0 — only build time cost.
 */
export function estimateFromScratchCost(stepCount: number): BuildMethodCost {
  return {
    method: "from_scratch",
    totalCostUsd: 0,
    llmPlanningCostUsd: 0,
    llmRefinementCostUsd: 0,
    embeddingCostUsd: 0,
    validationCostUsd: 0,
    executionCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalLlmCalls: 0,
    avgLatencyMs: 0,
    stepCount,
    waveCount: 0,
    buildDurationMs: stepCount * 180_000, // ~3 min per step
    iterationCount: 0,
  };
}

// ─── Execution Cost Estimator ───────────────────────────────────

/**
 * Estimate the cost of executing a template once.
 *
 * For each agent step: estimate tokens based on wave position (later waves
 * get more context tokens from prior results). Add synthesis cost for
 * multi-agent templates.
 */
export function estimateExecutionCost(
  template: DagTemplate,
  agentModelMap: Record<string, string> = DEFAULT_AGENT_MODEL_MAP
): ExecutionCostRecord {
  const waves = computeWaves(template.nodes);
  const nodeWave = new Map<string, number>();
  for (const wg of waves) {
    for (const nid of wg.nodeIds) {
      nodeWave.set(nid, wg.wave);
    }
  }

  const agentCosts: AgentCostRecord[] = [];
  let totalCost = 0;

  for (const node of template.nodes) {
    const wave = nodeWave.get(node.id) ?? 0;
    const tier = agentModelMap[node.agentId] ?? "claude-sonnet";
    // Base tokens: system prompt (~500) + task description
    const baseInput = 500 + estimateTokens(node.description);
    // Context tokens: +200 per dependency (prior results injected)
    const contextInput = node.dependsOn.length * 200;
    const inputTokens = baseInput + contextInput;
    const outputTokens = 400;

    const cost = calculateLlmCost(tier, inputTokens, outputTokens);
    totalCost += cost;

    agentCosts.push({
      agentName: node.agentId,
      modelTier: tier,
      inputTokens,
      outputTokens,
      costUsd: cost,
      latencyMs: wave === 0 ? 1500 : 2000,
    });
  }

  // Synthesis cost for multi-agent templates
  let synthesisCost = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  if (template.nodes.length > 1) {
    const synthInput = 1000 + template.nodes.length * 150;
    const synthOutput = 500;
    const synthCostUsd = calculateLlmCost(
      "claude-sonnet",
      synthInput,
      synthOutput
    );
    synthesisCost = {
      inputTokens: synthInput,
      outputTokens: synthOutput,
      costUsd: synthCostUsd,
    };
    totalCost += synthCostUsd;
  }

  // Latency: sum of max-latency per wave (parallel within waves)
  const waveLats = new Map<number, number>();
  for (const ac of agentCosts) {
    const w = nodeWave.get(
      template.nodes.find((n) => n.agentId === ac.agentName)?.id ?? ""
    ) ?? 0;
    waveLats.set(w, Math.max(waveLats.get(w) ?? 0, ac.latencyMs));
  }
  const totalLatency =
    Array.from(waveLats.values()).reduce((a, b) => a + b, 0) +
    (synthesisCost.costUsd > 0 ? 2000 : 0);

  return {
    executionId: "",
    templateId: template.id,
    timestamp: new Date().toISOString(),
    userId: "",
    userRole: "",
    agentCosts,
    synthesisCost,
    totalCostUsd: totalCost,
    totalLatencyMs: totalLatency,
    waveCount: waves.length,
    stepCount: template.nodes.length,
    stepsCompleted: template.nodes.length,
    stepsFailed: 0,
    stepsSkipped: 0,
  };
}

// ─── Comparison ─────────────────────────────────────────────────

/**
 * Side-by-side cost comparison: from-scratch vs decomposition.
 */
export function calculateCostComparison(
  templateName: string,
  description: string,
  template: DagTemplate,
  agentModelMap?: Record<string, string>
): CostComparison {
  const scratch = estimateFromScratchCost(template.nodes.length);
  const decomp = estimateDecompositionCost(
    description,
    template.nodes.length
  );

  // Execution cost is the same regardless of build method
  const execCost = estimateExecutionCost(template, agentModelMap);
  scratch.executionCostUsd = execCost.totalCostUsd;
  decomp.executionCostUsd = execCost.totalCostUsd;
  scratch.stepCount = template.nodes.length;
  decomp.stepCount = template.nodes.length;
  scratch.waveCount = computeWaves(template.nodes).length;
  decomp.waveCount = scratch.waveCount;

  const costDiff = scratch.totalCostUsd - decomp.totalCostUsd;
  const timeDiff = scratch.buildDurationMs - decomp.buildDurationMs;

  return {
    templateName,
    comparedAt: new Date().toISOString(),
    fromScratch: scratch,
    fromDecomposition: decomp,
    savings: {
      costSavingsUsd: costDiff,
      costSavingsPercent:
        scratch.totalCostUsd > 0
          ? (costDiff / scratch.totalCostUsd) * 100
          : decomp.totalCostUsd > 0
            ? -100
            : 0,
      timeSavingsMs: timeDiff,
      timeSavingsPercent:
        scratch.buildDurationMs > 0
          ? (timeDiff / scratch.buildDurationMs) * 100
          : 0,
      fewerLlmCalls: scratch.totalLlmCalls - decomp.totalLlmCalls,
      fewerTokens:
        scratch.totalInputTokens +
        scratch.totalOutputTokens -
        (decomp.totalInputTokens + decomp.totalOutputTokens),
    },
  };
}

/**
 * Calculate how many executions until decomposition build cost is recouped.
 * Returns 0 if decomposition is cheaper (or free) to build.
 */
export function calculateBreakEvenExecutions(
  buildCostDecomp: number,
  buildCostScratch: number,
  _avgExecutionCost: number
): number {
  const diff = buildCostDecomp - buildCostScratch;
  if (diff <= 0) return 0;
  // The extra build cost from decomposition doesn't reduce execution costs,
  // so break-even in pure dollars doesn't apply — but time savings do.
  return 0;
}
