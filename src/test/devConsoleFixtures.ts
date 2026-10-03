/**
 * Synthetic fixtures for the Claude Code console tests. No real ids, emails
 * or repository names.
 */
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

import type { DevConsoleJob, DevConsoleMe, JobEvent } from "@/types/devConsole";

export const ME: DevConsoleMe = {
  allowed: true,
  owner: false,
  enabled: true,
  mode: "read-only",
  models: ["auto", "haiku", "sonnet", "opus"],
  default_model: "auto",
  budget: { daily_cap_usd: 5, spent_today_usd: 0.42, job_cap_usd: 1 },
  step_cap: 12,
};

export const REPOS = [
  { key: "repo-private", full_name: "example-org/repo-private", visibility: "private", default_branch: "development" },
  { key: "repo-public", full_name: "example-org/repo-public", visibility: "public", default_branch: "development" },
];

export const SHA = "0123456789abcdef0123456789abcdef01234567";

export function makeJob(status: DevConsoleJob["status"], events: JobEvent[] = [], over: Partial<DevConsoleJob> = {}): DevConsoleJob {
  return {
    job_id: "job-0001",
    session_id: "session-a1",
    repo: "repo-private",
    status,
    model: "sonnet",
    commit_sha: SHA,
    steps: 4,
    step_cap: 12,
    cost_usd: 0.07,
    events,
    ...over,
  };
}

/** An AxiosError shaped like the contract's failure envelope. */
export function apiError(status: number, code?: string, description?: string): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data: code ? { success: false, error_status: { code, description } } : {},
  });
}

export function networkError(): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError("Network Error", "ERR_NETWORK", config, null, undefined);
}
