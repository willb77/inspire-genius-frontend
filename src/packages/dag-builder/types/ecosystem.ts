/**
 * Ecosystem adapter types — the interface that each agent ecosystem implements
 * to plug into the DAG builder.
 */

import type { DagTemplate, DagValidationResult } from "./dag";

/** Definition of a single agent available in an ecosystem. */
export type AgentDefinition = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  domain: string;
  icon?: string;
  color?: string;
};

/**
 * Ecosystem adapter interface.
 *
 * Each agent ecosystem (IG, VoiceDeskAI, custom) implements this interface
 * to translate between the generic DagTemplate model and its own API format.
 */
export interface EcosystemAdapter {
  /** Unique ecosystem identifier (e.g. "inspire-genius", "voicedeskai"). */
  readonly name: string;

  /** All agents available in this ecosystem. */
  readonly agents: AgentDefinition[];

  /** Domain name → agent IDs grouping for the palette. */
  readonly domainGroups: Record<string, string[]>;

  /** Serialize a DagTemplate to the ecosystem's API format. */
  toApiFormat(template: DagTemplate): unknown;

  /** Deserialize from the ecosystem's API format to a DagTemplate. */
  fromApiFormat(data: unknown): DagTemplate;

  /** Optional ecosystem-specific validation beyond generic DAG checks. */
  validateTemplate?(template: DagTemplate): DagValidationResult;
}

/** Configuration for a specific ecosystem deployment. */
export type EcosystemConfig = {
  adapter: EcosystemAdapter;
  apiBaseUrl: string;
  roleMinimum?: string;
  orgId?: string;
};
