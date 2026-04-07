/**
 * Pure DAG utility functions — zero React dependencies.
 *
 * Cycle detection, topological sort, wave computation, dependency validation.
 * Mirrors the execution model in services/agent-engine/app/orchestration/dag_executor.py.
 */

import type {
  DagNode,
  DagValidationResult,
  DagValidationError,
  WaveGroup,
} from "../types/dag";

// ─── Cycle Detection ────────────────────────────────────────────

const Color = {
  WHITE: 0,
  GRAY: 1,
  BLACK: 2,
} as const;
type Color = (typeof Color)[keyof typeof Color];

/**
 * Detect all cycles in a DAG using DFS with color marking.
 * @returns Array of cycle paths. Empty array = no cycles.
 */
export function detectCycles(nodes: DagNode[]): string[][] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const color = new Map<string, Color>();
  const parent = new Map<string, string | null>();
  const cycles: string[][] = [];

  for (const n of nodes) color.set(n.id, Color.WHITE);

  function dfs(id: string): void {
    color.set(id, Color.GRAY);
    const node = nodeMap.get(id);
    if (!node) return;

    for (const dep of node.dependsOn) {
      if (!nodeMap.has(dep)) continue;
      const depColor = color.get(dep);
      if (depColor === Color.GRAY) {
        // Back edge found — reconstruct cycle
        const cycle: string[] = [dep, id];
        let cur = id;
        while (cur !== dep) {
          const p = parent.get(cur);
          if (!p || p === dep) break;
          cycle.push(p);
          cur = p;
        }
        cycle.push(dep);
        cycles.push(cycle.reverse());
      } else if (depColor === Color.WHITE) {
        parent.set(dep, id);
        dfs(dep);
      }
    }
    color.set(id, Color.BLACK);
  }

  for (const n of nodes) {
    if (color.get(n.id) === Color.WHITE) {
      parent.set(n.id, null);
      dfs(n.id);
    }
  }

  return cycles;
}

// ─── Topological Sort ───────────────────────────────────────────

/**
 * Topological sort using Kahn's algorithm.
 * @returns Node IDs in execution order.
 * @throws If cycles exist.
 */
export function topologicalSort(nodes: DagNode[]): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adjList.set(n.id, []);
  }

  // Build adjacency: if B depends on A, then A → B
  for (const n of nodes) {
    for (const dep of n.dependsOn) {
      if (nodeIds.has(dep)) {
        adjList.get(dep)!.push(n.id);
        inDegree.set(n.id, (inDegree.get(n.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const neighbor of adjList.get(id) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error("Cycle detected — topological sort is impossible");
  }
  return sorted;
}

// ─── Wave Computation ───────────────────────────────────────────

/**
 * Compute parallel execution waves.
 *
 * Wave 0 = nodes with no dependencies.
 * Wave N = nodes whose deps are all in waves 0..N-1.
 * Matches dag_executor.py wave-based execution model.
 */
export function computeWaves(nodes: DagNode[]): WaveGroup[] {
  if (nodes.length === 0) return [];

  const nodeIds = new Set(nodes.map((n) => n.id));
  const waveOf = new Map<string, number>();

  // Iterative wave assignment
  let changed = true;
  // Seed: nodes with no dependencies → wave 0
  for (const n of nodes) {
    const validDeps = n.dependsOn.filter((d) => nodeIds.has(d));
    if (validDeps.length === 0) {
      waveOf.set(n.id, 0);
    }
  }

  while (changed) {
    changed = false;
    for (const n of nodes) {
      if (waveOf.has(n.id)) continue;
      const validDeps = n.dependsOn.filter((d) => nodeIds.has(d));
      const depWaves = validDeps.map((d) => waveOf.get(d));
      if (depWaves.every((w) => w !== undefined)) {
        waveOf.set(n.id, Math.max(...(depWaves as number[])) + 1);
        changed = true;
      }
    }
  }

  // Group by wave
  const groups = new Map<number, string[]>();
  for (const [id, wave] of waveOf) {
    if (!groups.has(wave)) groups.set(wave, []);
    groups.get(wave)!.push(id);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([wave, nodeIds]) => ({ wave, nodeIds }));
}

// ─── Validation ─────────────────────────────────────────────────

/**
 * Full DAG validation.
 *
 * Checks: no cycles, no orphan deps, no duplicate IDs, valid agents, non-empty descriptions.
 */
export function validateDag(
  nodes: DagNode[],
  availableAgentIds: string[]
): DagValidationResult {
  const errors: DagValidationError[] = [];
  const agentSet = new Set(availableAgentIds);
  const nodeIds = new Set<string>();

  // Duplicate IDs
  for (const n of nodes) {
    if (nodeIds.has(n.id)) {
      errors.push({
        nodeId: n.id,
        type: "duplicate_id",
        message: `Duplicate node ID: "${n.id}"`,
      });
    }
    nodeIds.add(n.id);
  }

  // Per-node checks
  for (const n of nodes) {
    // Missing agent
    if (!agentSet.has(n.agentId)) {
      errors.push({
        nodeId: n.id,
        type: "missing_agent",
        message: `Node "${n.id}" references unknown agent "${n.agentId}"`,
      });
    }

    // Missing description
    if (!n.description || n.description.trim().length === 0) {
      errors.push({
        nodeId: n.id,
        type: "missing_description",
        message: `Node "${n.id}" has no task description`,
      });
    }

    // Orphan dependencies
    for (const dep of n.dependsOn) {
      if (!nodeIds.has(dep)) {
        errors.push({
          nodeId: n.id,
          type: "missing_dep",
          message: `Node "${n.id}" depends on non-existent node "${dep}"`,
        });
      }
    }
  }

  // Cycle check
  const cycles = detectCycles(nodes);
  if (cycles.length > 0) {
    errors.push({
      type: "cycle",
      message: `Circular dependency detected: ${cycles[0].join(" → ")}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

// ─── Edge Helpers ───────────────────────────────────────────────

/**
 * Check if adding an edge from sourceId → targetId would create a cycle.
 * Returns true if the edge is SAFE to add (no cycle would be created).
 */
export function canAddEdge(
  nodes: DagNode[],
  sourceId: string,
  targetId: string
): boolean {
  if (sourceId === targetId) return false;

  // Simulate adding the edge: target depends on source
  const simulated = nodes.map((n) =>
    n.id === targetId
      ? { ...n, dependsOn: [...n.dependsOn, sourceId] }
      : n
  );
  return detectCycles(simulated).length === 0;
}

/**
 * Remove a node and clean all dependsOn references to it.
 * Matches remove_step() from the DAG Planner Guide.
 */
export function removeNodeAndCleanDeps(
  nodes: DagNode[],
  nodeId: string
): DagNode[] {
  return nodes
    .filter((n) => n.id !== nodeId)
    .map((n) => ({
      ...n,
      dependsOn: n.dependsOn.filter((dep) => dep !== nodeId),
    }));
}

/**
 * Compute the depth of a node — longest path from any root to this node.
 * Used for layout positioning.
 */
export function computeNodeDepth(nodes: DagNode[], nodeId: string): number {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const cache = new Map<string, number>();

  function depth(id: string): number {
    if (cache.has(id)) return cache.get(id)!;
    const node = nodeMap.get(id);
    if (!node || node.dependsOn.length === 0) {
      cache.set(id, 0);
      return 0;
    }
    const maxParent = Math.max(
      ...node.dependsOn
        .filter((d) => nodeMap.has(d))
        .map((d) => depth(d))
    );
    const d = maxParent + 1;
    cache.set(id, d);
    return d;
  }

  return depth(nodeId);
}
