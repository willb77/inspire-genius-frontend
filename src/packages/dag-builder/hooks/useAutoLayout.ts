/**
 * Auto-layout hook — applies dagre layout to the current DAG.
 */

import { useCallback } from "react";
import { useDagStore } from "./useDagStore";
import { autoLayout, deriveEdges, type LayoutDirection } from "../lib/layout";

export function useAutoLayout() {
  const { nodes, setNodePositions } = useDagStore();

  const applyLayout = useCallback(
    (direction: LayoutDirection = "TB") => {
      const edges = deriveEdges(nodes);
      const laid = autoLayout(nodes, edges, direction);
      const positions = new Map(laid.map((n) => [n.id, n.position]));
      setNodePositions(positions);
    },
    [nodes, setNodePositions]
  );

  return { applyLayout };
}
