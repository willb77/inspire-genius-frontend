/**
 * Ecosystem adapter types — the interface that each agent ecosystem implements
 * to plug into the DAG builder.
 */

import type { AxiosInstance } from "axios";
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
  /** Extended details shown in the agent info modal. */
  fullDescription?: string;
  capabilities?: string[];
  modelTier?: string;
  /** If true, this agent was added dynamically (not a built-in). */
  isCustom?: boolean;
  /** Training maturity level (1–5) from VAT agent registry. */
  maturityLevel?: number;
  /** Composite accuracy score (0–100) from evaluation tests + RLHF. */
  accuracyScore?: number;
  /** Number of knowledge documents indexed for this agent. */
  knowledgeDocCount?: number;
  /** Average user rating from RLHF feedback (0–5). */
  rlhfRating?: number;
  /** Agent status from the trainer registry. */
  trainerStatus?: "active" | "training" | "paused" | "ab-testing";
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
  agents: AgentDefinition[];

  /** Domain name → agent IDs grouping for the palette. */
  domainGroups: Record<string, string[]>;

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
  /**
   * Optional pre-configured axios client. When provided, all internal
   * API calls (template CRUD, etc.) use this instance instead of creating
   * a fresh axios with `apiBaseUrl`. Required when the host app needs to
   * inject auth headers (e.g. IG's `access-token` and 401 refresh).
   */
  httpClient?: AxiosInstance;
};
