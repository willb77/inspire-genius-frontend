/**
 * Tests for cost calculator functions.
 */

import {
  calculateLlmCost,
  estimateDecompositionCost,
  estimateFromScratchCost,
  estimateExecutionCost,
  calculateCostComparison,
  calculateBreakEvenExecutions,
  estimateTokens,
} from "../lib/cost-calculator";
import type { DagTemplate, DagNode } from "../types/dag";

function makeTemplate(nodes: DagNode[]): DagTemplate {
  return {
    id: "test",
    name: "Test",
    description: "Test template for cost estimation",
    version: 1,
    triggerKeywords: [],
    nodes,
    edges: [],
    metadata: {},
  };
}

function makeNode(id: string, agentId: string, dependsOn: string[] = []): DagNode {
  return {
    id,
    agentId,
    label: agentId,
    description: `Task for ${agentId} agent — perform analysis and return results`,
    dependsOn,
    config: { timeout: 30 },
    position: { x: 0, y: 0 },
  };
}

describe("calculateLlmCost", () => {
  test("Sonnet cost", () => {
    const cost = calculateLlmCost("claude-sonnet", 1000, 500);
    expect(cost).toBeCloseTo(0.003 + 0.0075, 6); // $0.0105
  });

  test("Haiku cost", () => {
    const cost = calculateLlmCost("claude-haiku", 1000, 500);
    expect(cost).toBeCloseTo(0.00025 + 0.000625, 6); // $0.000875
  });

  test("Opus cost", () => {
    const cost = calculateLlmCost("claude-opus", 1000, 500);
    expect(cost).toBeCloseTo(0.015 + 0.0375, 6); // $0.0525
  });

  test("zero tokens → zero cost", () => {
    expect(calculateLlmCost("claude-sonnet", 0, 0)).toBe(0);
  });
});

describe("estimateTokens", () => {
  test("chars / 4 approximation", () => {
    expect(estimateTokens("hello world")).toBe(3); // 11 chars / 4 = 2.75 → 3
  });
});

describe("estimateDecompositionCost", () => {
  test("produces non-zero cost", () => {
    const cost = estimateDecompositionCost("Evaluate a candidate", 5);
    expect(cost.method).toBe("decomposition");
    expect(cost.totalCostUsd).toBeGreaterThan(0);
    expect(cost.llmPlanningCostUsd).toBeGreaterThan(0);
    expect(cost.totalLlmCalls).toBeGreaterThan(0);
    expect(cost.buildDurationMs).toBe(120_000);
  });
});

describe("estimateFromScratchCost", () => {
  test("zero LLM cost", () => {
    const cost = estimateFromScratchCost(5);
    expect(cost.method).toBe("from_scratch");
    expect(cost.totalCostUsd).toBe(0);
    expect(cost.totalLlmCalls).toBe(0);
    expect(cost.buildDurationMs).toBe(5 * 180_000);
  });
});

describe("estimateExecutionCost", () => {
  test("coaching session — 3 serial steps", () => {
    const tpl = makeTemplate([
      makeNode("s0", "Meridian"),
      makeNode("s1", "Aura", ["s0"]),
      makeNode("s2", "Ascend", ["s1"]),
    ]);
    const exec = estimateExecutionCost(tpl);
    expect(exec.stepCount).toBe(3);
    expect(exec.totalCostUsd).toBeGreaterThan(0);
    expect(exec.synthesisCost.costUsd).toBeGreaterThan(0); // multi-agent → synthesis
    expect(exec.waveCount).toBe(3);
  });

  test("single step — no synthesis", () => {
    const tpl = makeTemplate([makeNode("s0", "Meridian")]);
    const exec = estimateExecutionCost(tpl);
    expect(exec.synthesisCost.costUsd).toBe(0);
  });

  test("hiring pipeline — parallel wave", () => {
    const tpl = makeTemplate([
      makeNode("s0", "Atlas"),
      makeNode("s1", "Aura", ["s0"]),
      makeNode("s2", "James", ["s0"]),
      makeNode("s3", "Sentinel", ["s1", "s2"]),
    ]);
    const exec = estimateExecutionCost(tpl);
    expect(exec.waveCount).toBe(3);
    expect(exec.stepCount).toBe(4);
    // Sentinel should have higher token count due to 2 deps
    const sentinel = exec.agentCosts.find((a) => a.agentName === "Sentinel");
    const atlas = exec.agentCosts.find((a) => a.agentName === "Atlas");
    expect(sentinel!.inputTokens).toBeGreaterThan(atlas!.inputTokens);
  });
});

describe("calculateCostComparison", () => {
  test("scratch has zero build cost", () => {
    const tpl = makeTemplate([makeNode("s0", "Meridian")]);
    const cmp = calculateCostComparison("Test", "Do something", tpl);
    expect(cmp.fromScratch.totalCostUsd).toBe(0);
    expect(cmp.fromDecomposition.totalCostUsd).toBeGreaterThan(0);
    // Both have same execution cost
    expect(cmp.fromScratch.executionCostUsd).toBe(
      cmp.fromDecomposition.executionCostUsd
    );
  });
});

describe("calculateBreakEvenExecutions", () => {
  test("decomp cheaper → 0", () => {
    expect(calculateBreakEvenExecutions(0.005, 0.01, 0.05)).toBe(0);
  });

  test("same cost → 0", () => {
    expect(calculateBreakEvenExecutions(0, 0, 0.05)).toBe(0);
  });
});
