/**
 * Claude Code console client (CC.3) — one pure axios call per contract route.
 *
 * Contract: `docs/plans/claude_code_console/api_contract.md` (monorepo).
 * Every route is under `/v1/dev-console`, on the console's own API, through
 * `devConsoleApi` (token injection + 401 handling from the shared interceptors).
 *
 * Failures reject with the AxiosError untouched; `devConsoleError.ts` turns the
 * `error_status.code` into the text the panel shows.
 */
import { devConsoleApi, isDevConsoleConfigured } from "@/lib/devConsoleApi";
import type { BaseApiResponse } from "@/types/api";
import type {
  DevConsoleAdmin,
  DevConsoleJob,
  DevConsoleMe,
  DevConsoleRepo,
  DevConsoleSessionDetail,
  DevConsoleSessionSummary,
  StartJobRequest,
  StartJobResponse,
} from "@/types/devConsole";

const BASE = "/v1/dev-console";

function unwrap<T>(body: BaseApiResponse<T> | undefined, fallback: T): T {
  return body?.data ?? fallback;
}

/** Accept a bare array or a `{ items | sessions | admins: [...] }` page. */
function asList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    for (const k of keys) {
      const v = (data as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

// ─── Access probe ──────────────────────────────────────────────────────────

/**
 * `GET /me` — decides whether the Claude Code tab exists at all.
 *
 * Returns the body ONLY for a 200 whose `data.allowed === true`; every other
 * outcome (403 not a super admin / not on the allowlist, 404 because the
 * backend is not deployed on this tier, 401, 5xx, a network failure, an HTML
 * page from an SPA rewrite) is `null`, and the tab stays hidden.
 *
 * `validateStatus: () => true` is deliberate: this probe runs for every super
 * admin who opens Help & Support. If it went through the 401 refresh/logout
 * cascade, a console misconfigured to reject valid tokens would log every
 * super admin out of the ticket queue — the 2026-06-06 observability incident,
 * in a new place. The probe resolves instead, so a 401 here just hides the tab.
 * Every OTHER console call keeps the normal 401 handling.
 */
export async function getDevConsoleAccess(): Promise<DevConsoleMe | null> {
  if (!isDevConsoleConfigured()) return null;
  try {
    const res = await devConsoleApi.get<BaseApiResponse<DevConsoleMe>>(`${BASE}/me`, {
      validateStatus: () => true,
    });
    if (res.status !== 200) return null;
    const body = res.data;
    if (!body || typeof body !== "object" || body.success === false) return null;
    const me = body.data;
    if (!me || typeof me !== "object" || me.allowed !== true) return null;
    return me;
  } catch {
    return null;
  }
}

// ─── Repos and jobs ────────────────────────────────────────────────────────

export async function listRepos(): Promise<DevConsoleRepo[]> {
  const res = await devConsoleApi.get<BaseApiResponse<DevConsoleRepo[]>>(`${BASE}/repos`);
  return asList<DevConsoleRepo>(unwrap(res.data, []), ["items", "repos"]);
}

export async function startJob(body: StartJobRequest): Promise<StartJobResponse> {
  const res = await devConsoleApi.post<BaseApiResponse<StartJobResponse>>(`${BASE}/jobs`, body);
  const data = res.data?.data;
  if (!data?.job_id) throw new Error("The console accepted the job but returned no job id.");
  return data;
}

export async function getJob(jobId: string, after = 0): Promise<DevConsoleJob> {
  const res = await devConsoleApi.get<BaseApiResponse<DevConsoleJob>>(
    `${BASE}/jobs/${encodeURIComponent(jobId)}`,
    { params: { after } }
  );
  const data = res.data?.data;
  if (!data) throw new Error("The console returned no job.");
  return { ...data, events: Array.isArray(data.events) ? data.events : [] };
}

export async function continueJob(jobId: string): Promise<void> {
  await devConsoleApi.post(`${BASE}/jobs/${encodeURIComponent(jobId)}/continue`);
}

export async function cancelJob(jobId: string): Promise<void> {
  await devConsoleApi.post(`${BASE}/jobs/${encodeURIComponent(jobId)}/cancel`);
}

// ─── Sessions ──────────────────────────────────────────────────────────────

export async function listSessions(params?: {
  limit?: number;
  cursor?: string;
}): Promise<DevConsoleSessionSummary[]> {
  const res = await devConsoleApi.get<BaseApiResponse<unknown>>(`${BASE}/sessions`, {
    params: { limit: params?.limit ?? 20, ...(params?.cursor ? { cursor: params.cursor } : {}) },
  });
  return asList<DevConsoleSessionSummary>(unwrap(res.data, []), ["items", "sessions"]);
}

/**
 * The contract says "the session's jobs with their events (same shape as
 * above)" without naming the wrapper, so both a bare job array and an object
 * carrying `jobs` are accepted.
 */
export async function getSession(sessionId: string): Promise<DevConsoleSessionDetail> {
  const res = await devConsoleApi.get<BaseApiResponse<unknown>>(
    `${BASE}/sessions/${encodeURIComponent(sessionId)}`
  );
  const data = unwrap<unknown>(res.data, null);
  const jobs = asList<DevConsoleJob>(data, ["jobs"]).map((j) => ({
    ...j,
    events: Array.isArray(j.events) ? j.events : [],
  }));
  return { session_id: sessionId, jobs };
}

export async function attachSessionToTicket(sessionId: string, ticketId: string): Promise<void> {
  await devConsoleApi.post(`${BASE}/sessions/${encodeURIComponent(sessionId)}/attach`, {
    ticket_id: ticketId,
  });
}

// ─── Owner only ────────────────────────────────────────────────────────────

export async function listAdminSessions(params?: {
  user?: string;
  since?: string;
}): Promise<DevConsoleSessionSummary[]> {
  const res = await devConsoleApi.get<BaseApiResponse<unknown>>(`${BASE}/admin/sessions`, {
    params: {
      ...(params?.user ? { user: params.user } : {}),
      ...(params?.since ? { since: params.since } : {}),
    },
  });
  return asList<DevConsoleSessionSummary>(unwrap(res.data, []), ["items", "sessions"]);
}

export async function listConsoleAdmins(): Promise<DevConsoleAdmin[]> {
  const res = await devConsoleApi.get<BaseApiResponse<unknown>>(`${BASE}/admins`);
  return asList<DevConsoleAdmin | string>(unwrap(res.data, []), ["items", "admins"])
    .map((row) => (typeof row === "string" ? { email: row } : row))
    .filter((row): row is DevConsoleAdmin => Boolean(row && typeof row.email === "string"));
}

export async function grantConsoleAdmin(email: string): Promise<void> {
  await devConsoleApi.post(`${BASE}/admins`, { email });
}

export async function revokeConsoleAdmin(email: string): Promise<void> {
  await devConsoleApi.delete(`${BASE}/admins/${encodeURIComponent(email)}`);
}
