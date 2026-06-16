/**
 * User Profile Platform types (G5 backend contract).
 *
 * The agent-engine ships these via `/v1/profile/me/*` routes. Shape is
 * deliberately permissive — adapters on the backend may add framework-specific
 * fields under `raw_payload` / `parsed_scores` that we just pass through.
 */

export type ProfileFact = {
  id: string;
  category: string;
  key: string;
  value: string;
  source?: string;
  created_at?: string;
  superseded_at?: string | null;
};

export type AssessmentScore = {
  dimension: string;
  score: number;
  score_type?: string | null;
  percentile?: number | null;
};

export type AssessmentTyping = {
  type_code: string;
  clarity?: number | null;
  label?: string | null;
};

export type Assessment = {
  id: string;
  framework: string;
  framework_version?: string | null;
  assessed_at: string;
  source?: string;
  raw_payload?: Record<string, unknown> | null;
  parsed_scores?: AssessmentScore[];
  typing?: AssessmentTyping[];
  created_at?: string;
};

export type LoadedFramework = {
  framework: string;
  /** ISO timestamp of the most recent assessment in this framework. */
  latest_assessed_at?: string | null;
};

export type ProfileMe = {
  user_id: string;
  facts: ProfileFact[];
  loaded_frameworks: LoadedFramework[];
  /** Optional summary surface — backend may add convenience fields. */
  latest_assessment_by_framework?: Record<string, Assessment>;
};

export type TrendPoint = {
  assessed_at: string;
  score: number;
  assessment_id?: string;
};

export type CreateFactRequest = {
  category: string;
  key: string;
  value: string;
  source?: string;
};

export type CreateAssessmentRequest = {
  framework: string;
  framework_version?: string;
  assessed_at: string;
  source?: string;
  raw_payload?: Record<string, unknown>;
  parsed_scores?: AssessmentScore[];
  typing?: AssessmentTyping[];
};

export type AssessmentHistoryResponse = {
  assessments: Assessment[];
  total: number;
  limit: number;
  offset: number;
};

export type TrendResponse = {
  framework: string;
  dimension: string;
  points: TrendPoint[];
};
