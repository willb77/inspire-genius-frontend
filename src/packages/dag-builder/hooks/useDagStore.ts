/**
 * Zustand store for DAG builder state.
 *
 * Manages nodes, edges, selection, template metadata, undo/redo history.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import type {
  DagNode,
  DagEdge,
  DagTemplate,
  DagValidationResult,
  WaveGroup,
} from "../types/dag";
import {
  canAddEdge,
  removeNodeAndCleanDeps,
  validateDag,
  computeWaves,
} from "../lib/dag-utils";
import { deriveEdges } from "../lib/layout";

type Snapshot = { nodes: DagNode[]; edges: DagEdge[] };

export type DagStoreState = {
  nodes: DagNode[];
  edges: DagEdge[];
  selectedNodeId: string | null;
  template: Partial<DagTemplate>;
  isDirty: boolean;
  history: { past: Snapshot[]; future: Snapshot[] };
  availableAgentIds: string[];

  // Actions
  addNode: (node: DagNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<DagNode>) => void;
  addEdge: (sourceId: string, targetId: string) => boolean;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  updateTemplate: (updates: Partial<DagTemplate>) => void;
  loadTemplate: (template: DagTemplate) => void;
  clearCanvas: () => void;
  setAvailableAgentIds: (ids: string[]) => void;
  setNodePositions: (positions: Map<string, { x: number; y: number }>) => void;
  undo: () => void;
  redo: () => void;

  // Computed
  getWaves: () => WaveGroup[];
  getValidation: () => DagValidationResult;
};

const MAX_HISTORY = 50;

function pushHistory(state: DagStoreState): void {
  const snap: Snapshot = {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
  };
  state.history.past.push(snap);
  if (state.history.past.length > MAX_HISTORY) state.history.past.shift();
  state.history.future = [];
}

function syncEdges(state: DagStoreState): void {
  state.edges = deriveEdges(state.nodes);
}

export const useDagStore = create<DagStoreState>()(
  devtools(
    immer((set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      template: {},
      isDirty: false,
      history: { past: [], future: [] },
      availableAgentIds: [],

      addNode: (node) =>
        set((s) => {
          pushHistory(s);
          s.nodes.push(node);
          syncEdges(s);
          s.isDirty = true;
        }),

      removeNode: (nodeId) =>
        set((s) => {
          pushHistory(s);
          s.nodes = removeNodeAndCleanDeps(
            s.nodes as DagNode[],
            nodeId
          ) as DagNode[];
          syncEdges(s);
          if (s.selectedNodeId === nodeId) s.selectedNodeId = null;
          s.isDirty = true;
        }),

      updateNode: (nodeId, updates) =>
        set((s) => {
          pushHistory(s);
          const idx = s.nodes.findIndex((n: DagNode) => n.id === nodeId);
          if (idx >= 0) {
            Object.assign(s.nodes[idx], updates);
            syncEdges(s);
          }
          s.isDirty = true;
        }),

      addEdge: (sourceId, targetId) => {
        const state = get();
        if (!canAddEdge(state.nodes, sourceId, targetId)) return false;
        set((s) => {
          pushHistory(s);
          const targetNode = s.nodes.find(
            (n: DagNode) => n.id === targetId
          );
          if (targetNode && !targetNode.dependsOn.includes(sourceId)) {
            targetNode.dependsOn.push(sourceId);
          }
          syncEdges(s);
          s.isDirty = true;
        });
        return true;
      },

      removeEdge: (edgeId) =>
        set((s) => {
          pushHistory(s);
          const edge = s.edges.find((e: DagEdge) => e.id === edgeId);
          if (edge) {
            const target = s.nodes.find(
              (n: DagNode) => n.id === edge.target
            );
            if (target) {
              target.dependsOn = target.dependsOn.filter(
                (d: string) => d !== edge.source
              );
            }
          }
          syncEdges(s);
          s.isDirty = true;
        }),

      selectNode: (nodeId) => set((s) => { s.selectedNodeId = nodeId; }),

      updateTemplate: (updates) =>
        set((s) => {
          Object.assign(s.template, updates);
          s.isDirty = true;
        }),

      loadTemplate: (template) =>
        set((s) => {
          s.nodes = template.nodes as DagNode[];
          s.edges = template.edges?.length
            ? (template.edges as DagEdge[])
            : (deriveEdges(template.nodes) as DagEdge[]);
          s.template = template;
          s.selectedNodeId = null;
          s.isDirty = false;
          s.history = { past: [], future: [] };
        }),

      clearCanvas: () =>
        set((s) => {
          s.nodes = [];
          s.edges = [];
          s.selectedNodeId = null;
          s.isDirty = false;
          s.history = { past: [], future: [] };
        }),

      setAvailableAgentIds: (ids) =>
        set((s) => { s.availableAgentIds = ids; }),

      setNodePositions: (positions) =>
        set((s) => {
          for (const node of s.nodes) {
            const pos = positions.get(node.id);
            if (pos) node.position = pos;
          }
        }),

      undo: () =>
        set((s) => {
          if (s.history.past.length === 0) return;
          const current: Snapshot = {
            nodes: JSON.parse(JSON.stringify(s.nodes)),
            edges: JSON.parse(JSON.stringify(s.edges)),
          };
          s.history.future.push(current);
          const prev = s.history.past.pop()!;
          s.nodes = prev.nodes as DagNode[];
          s.edges = prev.edges as DagEdge[];
          s.isDirty = true;
        }),

      redo: () =>
        set((s) => {
          if (s.history.future.length === 0) return;
          const current: Snapshot = {
            nodes: JSON.parse(JSON.stringify(s.nodes)),
            edges: JSON.parse(JSON.stringify(s.edges)),
          };
          s.history.past.push(current);
          const next = s.history.future.pop()!;
          s.nodes = next.nodes as DagNode[];
          s.edges = next.edges as DagEdge[];
          s.isDirty = true;
        }),

      getWaves: () => computeWaves(get().nodes),
      getValidation: () => validateDag(get().nodes, get().availableAgentIds),
    })),
    { name: "dag-builder" }
  )
);
