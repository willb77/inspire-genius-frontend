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

/**
 * A framework name the user holds an authoritative assessment in.
 *
 * The backend returns a bare `string[]` on BOTH surfaces:
 *   - `GET /v1/profile/me/loaded-frameworks` → `{ frameworks: string[] }`
 *   - `GET /v1/profile/me` → `loaded_frameworks: string[]`
 * (see `UserProfile.loaded_frameworks: list[str]` in the agent-engine loader).
 * Typing this as an object was the root cause of the HomeV2 white-screen
 * (#186) — keep it a string so the compiler rejects `.framework` access.
 */
export type LoadedFramework = string;

export type ProfileMe = {
  user_id: string;
  facts: ProfileFact[];
  loaded_frameworks: LoadedFramework[];
  /**
   * §4.2 — the personal `doc_kind`s the user holds (e.g. `["resume","bio"]`),
   * sourced from documents tagged resume/cv/bio/personal. The Home
   * completeness column reads this to mark Resume / Bio / Additional info done.
   */
  personal_docs?: string[];
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

/** Response from POST /v1/profile/me/assessments (+ /import). */
export type AssessmentCreated = {
  id: string;
  user_id: string;
  framework: string;
  framework_version?: string | null;
  assessed_at: string;
  source: string;
  is_authoritative: boolean;
  score_count: number;
  typing_count: number;
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
