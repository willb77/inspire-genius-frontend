/**
 * Main React Flow canvas for the DAG editor.
 *
 * Uses React Flow's useNodesState/useEdgesState for internal graph state
 * and syncs to the Zustand store only on explicit user actions (drag-end, connect, drop).
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode, StartNode, EndNode } from "./AgentNode";
import type { AgentNodeData } from "./AgentNode";
import { useDagStore } from "../hooks/useDagStore";
import type { EcosystemConfig } from "../types/ecosystem";
import type { DagNode } from "../types/dag";
import { computeWaves } from "../lib/dag-utils";

const nodeTypes: NodeTypes = {
  agentNode: AgentNode as unknown as NodeTypes["agentNode"],
  startNode: StartNode as unknown as NodeTypes["startNode"],
  endNode: EndNode as unknown as NodeTypes["endNode"],
};

type DagCanvasInnerProps = {
  ecosystemConfig: EcosystemConfig;
  readOnly?: boolean;
  className?: string;
};

/**
 * Convert DagNode[] from store into React Flow Node[] format.
 */
function toFlowNodes(
  dagNodes: DagNode[],
  agentMap: Map<string, { color?: string; domain: string }>,
  nodeWaves: Map<string, number>,
  errorNodes: Set<string>
): Node[] {
  return dagNodes.map((n) => {
    const agent = agentMap.get(n.agentId);
    const data: AgentNodeData = {
      ...n,
      wave: nodeWaves.get(n.id),
      domainColor: agent?.color,
      domainLabel: agent?.domain,
      hasErrors: errorNodes.has(n.id),
    };
    return {
      id: n.id,
      type: "agentNode",
      position: n.position,
      data,
    };
  });
}

function toFlowEdges(dagEdges: { id: string; source: string; target: string }[]): Edge[] {
  return dagEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: "#94a3b8", strokeWidth: 2 },
  }));
}

function DagCanvasInner({
  ecosystemConfig,
  readOnly,
  className,
}: DagCanvasInnerProps) {
  const store = useDagStore();
  const wrapper = useRef<HTMLDivElement>(null);

  // Agent lookup
  const agentMap = useMemo(() => {
    const map = new Map<string, (typeof ecosystemConfig.adapter.agents)[0]>();
    for (const a of ecosystemConfig.adapter.agents) map.set(a.id, a);
    return map;
  }, [ecosystemConfig.adapter.agents]);

  // Track store revision to detect external changes (loadTemplate, addNode, etc.)
  const [storeRev, setStoreRev] = useState(0);
  useEffect(() => {
    const unsub = useDagStore.subscribe(() => setStoreRev((r) => r + 1));
    return unsub;
  }, []);

  // Compute waves and errors from store
  const nodeWaves = useMemo(() => {
    const waves = computeWaves(store.nodes);
    const map = new Map<string, number>();
    for (const wg of waves) {
      for (const nid of wg.nodeIds) map.set(nid, wg.wave);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeRev]);

  const errorNodes = useMemo(() => {
    const validation = store.getValidation();
    const set = new Set<string>();
    for (const e of validation.errors) {
      if (e.nodeId) set.add(e.nodeId);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeRev]);

  // React Flow's own state — this is the source of truth for rendering.
  // We sync FROM the store into these when the store changes externally.
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Sync store → React Flow state when store changes
  useEffect(() => {
    const newNodes = toFlowNodes(store.nodes, agentMap, nodeWaves, errorNodes);
    const newEdges = toFlowEdges(store.edges);
    setRfNodes(newNodes);
    setRfEdges(newEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeRev, agentMap]);

  // On drag end, sync positions back to store
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const positions = new Map<string, { x: number; y: number }>();
      positions.set(node.id, node.position);
      store.setNodePositions(positions);
    },
    [store]
  );

  // Connect handler
  const onConnect: OnConnect = useCallback(
    (params) => {
      if (readOnly || !params.source || !params.target) return;
      store.addEdge(params.source, params.target);
    },
    [store, readOnly]
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => store.selectNode(node.id),
    [store]
  );

  const onPaneClick = useCallback(() => store.selectNode(null), [store]);

  // Drop handler for agent palette drag-and-drop
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      if (readOnly) return;
      e.preventDefault();
      const agentJson = e.dataTransfer.getData("application/dag-agent");
      if (!agentJson) return;

      try {
        const agent = JSON.parse(agentJson);
        const bounds = wrapper.current?.getBoundingClientRect();
        const newNode: DagNode = {
          id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          agentId: agent.id,
          label: agent.displayName || agent.name,
          description: "",
          dependsOn: [],
          config: { timeout: 30 },
          position: {
            x: bounds ? e.clientX - bounds.left - 110 : 100,
            y: bounds ? e.clientY - bounds.top - 50 : 100,
          },
        };
        store.addNode(newNode);
      } catch {
        // Invalid drop data
      }
    },
    [store, readOnly]
  );

  return (
    <div ref={wrapper} className={`w-full h-full ${className ?? ""}`}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        deleteKeyCode={readOnly ? null : "Delete"}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls position="bottom-left" />
        <MiniMap position="bottom-right" pannable zoomable />
      </ReactFlow>
    </div>
  );
}

export type DagCanvasProps = DagCanvasInnerProps;

export function DagCanvas(props: DagCanvasProps) {
  return (
    <ReactFlowProvider>
      <DagCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
