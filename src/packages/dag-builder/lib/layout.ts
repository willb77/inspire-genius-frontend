/**
 * Pure dagre layout function — computes node positions for a DAG.
 * Separated from the React hook for testability.
 */

import dagre from "@dagrejs/dagre";
import type { DagNode, DagEdge } from "../types/dag";

export type LayoutDirection = "TB" | "LR";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

/**
 * Compute auto-layout positions for DAG nodes using dagre.
 * @returns Nodes with updated positions.
 */
export function autoLayout(
  nodes: DagNode[],
  edges: DagEdge[],
  direction: LayoutDirection = "TB"
): DagNode[] {
  if (nodes.length === 0) return [];

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    ranksep: 100,
    nodesep: 60,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
    };
  });
}

/**
 * Derive DagEdge[] from DagNode[] dependsOn fields.
 */
export function deriveEdges(nodes: DagNode[]): DagEdge[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: DagEdge[] = [];
  for (const node of nodes) {
    for (const dep of node.dependsOn) {
      if (nodeIds.has(dep)) {
        edges.push({
          id: `${dep}->${node.id}`,
          source: dep,
          target: node.id,
        });
      }
    }
  }
  return edges;
}
