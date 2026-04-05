/**
 * Main React Flow canvas for the DAG editor.
 */

import { useCallback, useMemo, useRef, DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type NodeTypes,
  BackgroundVariant,
  applyNodeChanges,
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

function DagCanvasInner({
  ecosystemConfig,
  readOnly,
  className,
}: DagCanvasInnerProps) {
  const {
    nodes: dagNodes,
    edges: dagEdges,
    addNode,
    addEdge,
    selectNode,
    setNodePositions,
  } = useDagStore();
  const { fitView } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);

  // Agent lookup for domain info
  const agentMap = useMemo(() => {
    const map = new Map<string, (typeof ecosystemConfig.adapter.agents)[0]>();
    for (const a of ecosystemConfig.adapter.agents) map.set(a.id, a);
    return map;
  }, [ecosystemConfig.adapter.agents]);

  // Wave lookup
  const nodeWaves = useMemo(() => {
    const waves = computeWaves(dagNodes);
    const map = new Map<string, number>();
    for (const wg of waves) {
      for (const nid of wg.nodeIds) map.set(nid, wg.wave);
    }
    return map;
  }, [dagNodes]);

  // Validation errors per node
  const validation = useDagStore((s) => s.getValidation());
  const errorNodes = useMemo(() => {
    const set = new Set<string>();
    for (const e of validation.errors) {
      if (e.nodeId) set.add(e.nodeId);
    }
    return set;
  }, [validation]);

  // Convert to React Flow format
  const flowNodes: Node[] = useMemo(
    () =>
      dagNodes.map((n) => {
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
          selected: false,
        };
      }),
    [dagNodes, agentMap, nodeWaves, errorNodes]
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      dagEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      })),
    [dagEdges]
  );

  // Callbacks
  const onConnect: OnConnect = useCallback(
    (params) => {
      if (readOnly || !params.source || !params.target) return;
      addEdge(params.source, params.target);
    },
    [addEdge, readOnly]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Update positions from drag
      const posUpdates = new Map<string, { x: number; y: number }>();
      const updatedNodes = applyNodeChanges(changes, flowNodes);
      for (const node of updatedNodes) {
        if (node.position) {
          posUpdates.set(node.id, node.position);
        }
      }
      if (posUpdates.size > 0) setNodePositions(posUpdates);
    },
    [flowNodes, setNodePositions]
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => selectNode(node.id),
    [selectNode]
  );

  const onPaneClick = useCallback(() => selectNode(null), [selectNode]);

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
        addNode(newNode);
      } catch {
        // Invalid drop data
      }
    },
    [addNode, readOnly]
  );

  return (
    <div ref={wrapper} className={`w-full h-full ${className ?? ""}`}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
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
