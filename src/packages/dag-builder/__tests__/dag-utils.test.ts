/**
 * Unit tests for DAG utility functions.
 */

import {
  detectCycles,
  topologicalSort,
  computeWaves,
  validateDag,
  canAddEdge,
  removeNodeAndCleanDeps,
  computeNodeDepth,
} from "../lib/dag-utils";
import type { DagNode } from "../types/dag";

function makeNode(
  id: string,
  dependsOn: string[] = [],
  agentId = "Meridian"
): DagNode {
  return {
    id,
    agentId,
    label: id,
    description: `Task for ${id}`,
    dependsOn,
    config: {},
    position: { x: 0, y: 0 },
  };
}

// ─── detectCycles ───────────────────────────────────────────────

describe("detectCycles", () => {
  test("empty graph → no cycles", () => {
    expect(detectCycles([])).toEqual([]);
  });

  test("linear chain → no cycles", () => {
    const nodes = [
      makeNode("A"),
      makeNode("B", ["A"]),
      makeNode("C", ["B"]),
    ];
    expect(detectCycles(nodes)).toEqual([]);
  });

  test("diamond → no cycles", () => {
    const nodes = [
      makeNode("A"),
      makeNode("B", ["A"]),
      makeNode("C", ["A"]),
      makeNode("D", ["B", "C"]),
    ];
    expect(detectCycles(nodes)).toEqual([]);
  });

  test("simple cycle detected", () => {
    const nodes = [makeNode("A", ["B"]), makeNode("B", ["A"])];
    expect(detectCycles(nodes).length).toBeGreaterThan(0);
  });
});

// ─── topologicalSort ────────────────────────────────────────────

describe("topologicalSort", () => {
  test("linear chain sorted correctly", () => {
    const nodes = [
      makeNode("C", ["B"]),
      makeNode("B", ["A"]),
      makeNode("A"),
    ];
    const sorted = topologicalSort(nodes);
    expect(sorted.indexOf("A")).toBeLessThan(sorted.indexOf("B"));
    expect(sorted.indexOf("B")).toBeLessThan(sorted.indexOf("C"));
  });

  test("throws on cycle", () => {
    const nodes = [makeNode("A", ["B"]), makeNode("B", ["A"])];
    expect(() => topologicalSort(nodes)).toThrow();
  });
});

// ─── computeWaves ───────────────────────────────────────────────

describe("computeWaves", () => {
  test("single node → wave 0", () => {
    const waves = computeWaves([makeNode("A")]);
    expect(waves).toEqual([{ wave: 0, nodeIds: ["A"] }]);
  });

  test("three parallel → all wave 0", () => {
    const waves = computeWaves([
      makeNode("A"),
      makeNode("B"),
      makeNode("C"),
    ]);
    expect(waves.length).toBe(1);
    expect(waves[0].nodeIds.sort()).toEqual(["A", "B", "C"]);
  });

  test("hiring pipeline: Atlas(W0) → Aura+James(W1) → Sentinel(W2)", () => {
    const nodes = [
      makeNode("Atlas", [], "Atlas"),
      makeNode("Aura", ["Atlas"], "Aura"),
      makeNode("James", ["Atlas"], "James"),
      makeNode("Sentinel", ["Aura", "James"], "Sentinel"),
    ];
    const waves = computeWaves(nodes);
    expect(waves.length).toBe(3);
    expect(waves[0]).toEqual({ wave: 0, nodeIds: ["Atlas"] });
    expect(waves[1].nodeIds.sort()).toEqual(["Aura", "James"]);
    expect(waves[2]).toEqual({ wave: 2, nodeIds: ["Sentinel"] });
  });
});

// ─── validateDag ────────────────────────────────────────────────

describe("validateDag", () => {
  const agents = ["Meridian", "Aura", "Atlas"];

  test("valid graph passes", () => {
    const nodes = [makeNode("A"), makeNode("B", ["A"])];
    const result = validateDag(nodes, agents);
    expect(result.valid).toBe(true);
  });

  test("cycle detected", () => {
    const nodes = [makeNode("A", ["B"]), makeNode("B", ["A"])];
    const result = validateDag(nodes, agents);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === "cycle")).toBe(true);
  });

  test("unknown agent detected", () => {
    const nodes = [makeNode("A", [], "UnknownAgent")];
    const result = validateDag(nodes, agents);
    expect(result.errors.some((e) => e.type === "missing_agent")).toBe(true);
  });

  test("empty description detected", () => {
    const node = makeNode("A");
    node.description = "";
    const result = validateDag([node], agents);
    expect(result.errors.some((e) => e.type === "missing_description")).toBe(
      true
    );
  });

  test("orphan dependency detected", () => {
    const nodes = [makeNode("A", ["nonexistent"])];
    const result = validateDag(nodes, agents);
    expect(result.errors.some((e) => e.type === "missing_dep")).toBe(true);
  });
});

// ─── canAddEdge ─────────────────────────────────────────────────

describe("canAddEdge", () => {
  test("valid edge allowed", () => {
    const nodes = [makeNode("A"), makeNode("B")];
    expect(canAddEdge(nodes, "A", "B")).toBe(true);
  });

  test("self-loop rejected", () => {
    expect(canAddEdge([makeNode("A")], "A", "A")).toBe(false);
  });

  test("cycle-creating edge rejected", () => {
    const nodes = [makeNode("A", ["B"]), makeNode("B")];
    expect(canAddEdge(nodes, "A", "B")).toBe(false);
  });
});

// ─── removeNodeAndCleanDeps ─────────────────────────────────────

describe("removeNodeAndCleanDeps", () => {
  test("removes node and cleans deps", () => {
    const nodes = [
      makeNode("A"),
      makeNode("B", ["A"]),
      makeNode("C", ["A", "B"]),
    ];
    const result = removeNodeAndCleanDeps(nodes, "A");
    expect(result.length).toBe(2);
    expect(result.find((n) => n.id === "B")!.dependsOn).toEqual([]);
    expect(result.find((n) => n.id === "C")!.dependsOn).toEqual(["B"]);
  });
});

// ─── computeNodeDepth ───────────────────────────────────────────

describe("computeNodeDepth", () => {
  test("root node has depth 0", () => {
    expect(computeNodeDepth([makeNode("A")], "A")).toBe(0);
  });

  test("linear chain depth", () => {
    const nodes = [
      makeNode("A"),
      makeNode("B", ["A"]),
      makeNode("C", ["B"]),
    ];
    expect(computeNodeDepth(nodes, "C")).toBe(2);
  });
});
