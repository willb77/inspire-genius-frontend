/**
 * Core DAG types — ecosystem-agnostic data model for the DAG Process Builder.
 *
 * These types know nothing about Inspire Genius, VoiceDeskAI, or any specific
 * agent platform. Ecosystem adapters translate to/from these types.
 */

/** A single node (agent step) in an execution DAG. */
export type DagNode = {
  id: string;
  agentId: string;
  label: string;
  description: string;
  dependsOn: string[];
  config: Record<string, unknown>;
  position: { x: number; y: number };
  metadata?: Record<string, unknown>;
};

/** A directed edge between two DAG nodes. */
export type DagEdge = {
  id: string;
  source: string;
  target: string;
};

/** A complete process template — the top-level object persisted and exchanged. */
export type DagTemplate = {
  id: string;
  name: string;
  description: string;
  version: number;
  triggerKeywords: string[];
  nodes: DagNode[];
  edges: DagEdge[];
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

/** Result of a DAG validation pass. */
export type DagValidationResult = {
  valid: boolean;
  errors: DagValidationError[];
};

/** A single validation error found in a DAG. */
export type DagValidationError = {
  nodeId?: string;
  edgeId?: string;
  type:
    | "cycle"
    | "orphan"
    | "missing_dep"
    | "missing_agent"
    | "missing_description"
    | "duplicate_id";
  message: string;
};

/** A group of nodes that execute in the same parallel wave. */
export type WaveGroup = {
  wave: number;
  nodeIds: string[];
};
