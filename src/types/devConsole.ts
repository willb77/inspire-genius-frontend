/**
 * Claude Code console (CC.3) — types from the frozen API contract,
 * `docs/plans/claude_code_console/api_contract.md` in the monorepo.
 *
 * Every response is wrapped in `BaseApiResponse<T>`; these are the `T`s.
 * Where the contract does not spell out a field (the `step`, `cost` and
 * `error` event bodies, the admin list rows), the field is optional and the
 * panel renders what it is given rather than assuming a shape.
 */

export type DevConsoleModel = "auto" | "haiku" | "sonnet" | "opus";

export type DevConsoleBudget = {
  daily_cap_usd: number;
  spent_today_usd: number;
  job_cap_usd: number;
};

/** `GET /v1/dev-console/me` */
export type DevConsoleMe = {
  allowed: boolean;
  owner: boolean;
  enabled: boolean;
  mode: string;
  models: DevConsoleModel[];
  default_model: DevConsoleModel;
  budget: DevConsoleBudget;
  step_cap: number;
  /** User lookup card (contract A7c). Absent on an older backend: treated as not granted. */
  lookup?: { granted: boolean; enabled: boolean };
};

/** One matching `user_entitlements` row (A7b). Every match is shown; none is picked. */
export type UserLookupEntitlementRow = {
  matched_by: "user_id" | "email" | string;
  verticals: unknown;
  updated_at: string | null;
};

/** `POST /v1/dev-console/lookup` → `data` (contract A7b). Statuses, timestamps and counts only. */
export type UserLookupCard = {
  found: boolean;
  not_found_means: string | null;
  account: {
    user_id: string;
    is_active: boolean | null;
    is_deleted: boolean | null;
    account_created_at: string | null;
    role_name: string | null;
    org_id: string | null;
    org_name: string | null;
    is_profile_complete: boolean | null;
    entitlement_rows: UserLookupEntitlementRow[];
    entitlement_conflict: boolean;
    last_login_at: string | null;
    logins_30d: number;
    last_chat_retained_at: string | null;
    chats_retained: number;
    prism_results: number;
    prism_latest_at: string | null;
    documents_uploaded: number;
    documents_as_subject: number;
    duplicate_accounts?: boolean;
  } | null;
  cognito: { present: boolean; status?: string | null; enabled?: boolean; is_onboarded?: string | null } | null;
  cognito_note?: string;
  lockout: { failed_attempts: number; locked: boolean; limit?: number; window_minutes?: number } | null;
  magic_link_send?: string;
  checks_run: string[];
  unavailable: string[];
};

/** `GET /v1/dev-console/repos` — the server-side list (D2). */
export type DevConsoleRepo = {
  key: string;
  full_name: string;
  visibility: "public" | "private" | string;
  default_branch: string;
};

/** `POST /v1/dev-console/jobs` */
export type StartJobRequest = {
  repo: string;
  prompt: string;
  model: DevConsoleModel;
  ref: string;
  session_id: string | null;
  ticket_id: string | null;
};

export type JobStatus =
  | "queued"
  | "running"
  | "awaiting_continue"
  | "complete"
  | "error"
  | "cancelled";

export type StartJobResponse = {
  job_id: string;
  session_id: string;
  status: JobStatus;
};

export type Citation = {
  path: string;
  line_start: number;
  line_end: number;
  url: string;
};

type EventBase = { seq: number; ts: string };

export type StepEvent = EventBase & { type: "step"; step?: number; summary?: string };
export type ToolEvent = EventBase & { type: "tool"; tool: string; summary?: string };
export type BlockedEvent = EventBase & { type: "blocked"; tool: string; reason: string };
export type AnswerEvent = EventBase & { type: "answer"; markdown: string; citations?: Citation[] };
export type CostEvent = EventBase & { type: "cost"; cost_usd?: number; summary?: string };
export type ErrorEvent = EventBase & {
  type: "error";
  code?: string;
  message?: string;
  description?: string;
};

export type JobEvent = StepEvent | ToolEvent | BlockedEvent | AnswerEvent | CostEvent | ErrorEvent;

/** `GET /v1/dev-console/jobs/{job_id}?after=<seq>` */
export type DevConsoleJob = {
  job_id: string;
  session_id: string;
  repo: string;
  status: JobStatus;
  model: string;
  commit_sha: string | null;
  steps: number;
  step_cap: number;
  cost_usd: number;
  events: JobEvent[];
};

/** A row of `GET /v1/dev-console/sessions`. */
export type DevConsoleSessionSummary = {
  session_id: string;
  repo: string;
  title: string;
  created_at: string;
  last_at: string;
  jobs: number;
  cost_usd: number;
  ticket_id: string | null;
};

/** `GET /v1/dev-console/sessions/{session_id}` — normalised to this shape by the service. */
export type DevConsoleSessionDetail = {
  session_id: string;
  jobs: DevConsoleJob[];
};

/** A row of `GET /v1/dev-console/admins` (owner only), normalised by the service. */
export type DevConsoleAdmin = {
  email: string;
  granted_by?: string | null;
  granted_at?: string | null;
};

/** The error codes the contract names. Anything else is rendered generically. */
export type DevConsoleErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_SUPER_ADMIN"
  | "DEV_CONSOLE_FORBIDDEN"
  | "OWNER_ONLY"
  | "NOT_FOUND"
  | "NOT_AWAITING_CONTINUE"
  | "VALIDATION"
  | "PROMPT_CONTAINS_SECRET"
  | "BUSY"
  | "BUDGET_EXCEEDED"
  | "CONSOLE_DISABLED"
  | "LOOKUP_NOT_GRANTED"
  | "LOOKUP_DISABLED"
  | "RATE_LIMITED";

/** The five leading shortcuts the server expands. */
export const DEV_CONSOLE_SHORTCUTS = ["/where", "/explain", "/why-failing", "/review", "/history"] as const;
export type DevConsoleShortcut = (typeof DEV_CONSOLE_SHORTCUTS)[number];

export const DEV_CONSOLE_PROMPT_MAX = 8000;
