import { devConsoleApi, isDevConsoleConfigured } from "@/lib/devConsoleApi";
import {
  attachSessionToTicket,
  cancelJob,
  continueJob,
  getDevConsoleAccess,
  getJob,
  getSession,
  grantConsoleAdmin,
  listAdminSessions,
  listConsoleAdmins,
  listRepos,
  listSessions,
  revokeConsoleAdmin,
  startJob,
} from "@/services/dev-console/devConsole.service";

jest.mock("@/lib/devConsoleApi", () => ({
  devConsoleApi: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  isDevConsoleConfigured: jest.fn(() => true),
}));

const api = devConsoleApi as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  delete: jest.Mock;
};
const configured = isDevConsoleConfigured as jest.Mock;

const ME = {
  allowed: true,
  owner: false,
  enabled: true,
  mode: "read-only",
  models: ["auto", "haiku", "sonnet", "opus"],
  default_model: "auto",
  budget: { daily_cap_usd: 5, spent_today_usd: 0.42, job_cap_usd: 1 },
  step_cap: 12,
};

beforeEach(() => {
  jest.clearAllMocks();
  configured.mockReturnValue(true);
});

describe("getDevConsoleAccess — the probe that decides whether the tab exists", () => {
  it("returns the body for a 200 with allowed: true", async () => {
    api.get.mockResolvedValue({ status: 200, data: { success: true, data: ME } });
    await expect(getDevConsoleAccess()).resolves.toEqual(ME);
    expect(api.get).toHaveBeenCalledWith("/v1/dev-console/me", expect.objectContaining({ validateStatus: expect.any(Function) }));
    // The probe never rejects on status, so a 401 cannot cascade into logout.
    const { validateStatus } = api.get.mock.calls[0][1];
    expect(validateStatus(401)).toBe(true);
    expect(validateStatus(503)).toBe(true);
  });

  it.each([
    ["200 allowed:false", { status: 200, data: { success: true, data: { ...ME, allowed: false } } }],
    ["200 success:false", { status: 200, data: { success: false, data: ME } }],
    ["200 HTML from an SPA rewrite", { status: 200, data: "<!doctype html><html></html>" }],
    ["200 with no data", { status: 200, data: { success: true } }],
    ["403 NOT_SUPER_ADMIN", { status: 403, data: { success: false, error_status: { code: "NOT_SUPER_ADMIN" } } }],
    ["403 DEV_CONSOLE_FORBIDDEN", { status: 403, data: { success: false, error_status: { code: "DEV_CONSOLE_FORBIDDEN" } } }],
    ["401", { status: 401, data: {} }],
    ["404 (backend not on this tier)", { status: 404, data: { message: "Not Found" } }],
    ["503 CONSOLE_DISABLED", { status: 503, data: { success: false, error_status: { code: "CONSOLE_DISABLED" } } }],
    // Only a 200 opens the tab, whatever the body claims.
    ["203 with an allowed body", { status: 203, data: { success: true, data: ME } }],
    ["500 with an allowed body", { status: 500, data: { success: true, data: ME } }],
  ])("returns null for %s", async (_label, res) => {
    api.get.mockResolvedValue(res);
    await expect(getDevConsoleAccess()).resolves.toBeNull();
  });

  it("returns null on a network failure", async () => {
    api.get.mockRejectedValue(new Error("Network Error"));
    await expect(getDevConsoleAccess()).resolves.toBeNull();
  });

  it("does not call anything when the build has no console URL", async () => {
    configured.mockReturnValue(false);
    await expect(getDevConsoleAccess()).resolves.toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe("routes", () => {
  it("lists repos", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [{ key: "r1" }] } });
    await expect(listRepos()).resolves.toEqual([{ key: "r1" }]);
    expect(api.get).toHaveBeenCalledWith("/v1/dev-console/repos");
  });

  it("treats a missing repo list as empty", async () => {
    api.get.mockResolvedValue({ data: { success: true } });
    await expect(listRepos()).resolves.toEqual([]);
  });

  it("starts a job with the contract body", async () => {
    const body = {
      repo: "r1",
      prompt: "/where is x",
      model: "auto" as const,
      ref: "development",
      session_id: null,
      ticket_id: null,
    };
    api.post.mockResolvedValue({ data: { success: true, data: { job_id: "j1", session_id: "s1", status: "queued" } } });
    await expect(startJob(body)).resolves.toEqual({ job_id: "j1", session_id: "s1", status: "queued" });
    expect(api.post).toHaveBeenCalledWith("/v1/dev-console/jobs", body);
  });

  it("rejects a 202 that carries no job id rather than polling nothing", async () => {
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    await expect(
      startJob({ repo: "r", prompt: "p", model: "auto", ref: "d", session_id: null, ticket_id: null })
    ).rejects.toThrow(/no job id/);
  });

  it("gets a job with the after cursor and defaults events to []", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { job_id: "j/1", status: "running" } } });
    const job = await getJob("j/1", 7);
    expect(job.events).toEqual([]);
    expect(api.get).toHaveBeenCalledWith("/v1/dev-console/jobs/j%2F1", { params: { after: 7 } });
  });

  it("rejects an empty job body", async () => {
    api.get.mockResolvedValue({ data: { success: true } });
    await expect(getJob("j1")).rejects.toThrow(/no job/);
  });

  it("continues and cancels", async () => {
    api.post.mockResolvedValue({ status: 202 });
    await continueJob("j1");
    await cancelJob("j1");
    expect(api.post).toHaveBeenNthCalledWith(1, "/v1/dev-console/jobs/j1/continue");
    expect(api.post).toHaveBeenNthCalledWith(2, "/v1/dev-console/jobs/j1/cancel");
  });

  it("lists sessions (bare array or paged object)", async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [{ session_id: "s1" }] } });
    await expect(listSessions()).resolves.toEqual([{ session_id: "s1" }]);
    expect(api.get).toHaveBeenLastCalledWith("/v1/dev-console/sessions", { params: { limit: 20 } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: { items: [{ session_id: "s2" }] } } });
    await expect(listSessions({ limit: 5, cursor: "c" })).resolves.toEqual([{ session_id: "s2" }]);
    expect(api.get).toHaveBeenLastCalledWith("/v1/dev-console/sessions", { params: { limit: 5, cursor: "c" } });
  });

  it("gets a session from a job array or an object with jobs", async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [{ job_id: "j1" }] } });
    await expect(getSession("s1")).resolves.toEqual({ session_id: "s1", jobs: [{ job_id: "j1", events: [] }] });
    api.get.mockResolvedValueOnce({ data: { success: true, data: { jobs: [{ job_id: "j2", events: [{ seq: 1 }] }] } } });
    await expect(getSession("s1")).resolves.toEqual({ session_id: "s1", jobs: [{ job_id: "j2", events: [{ seq: 1 }] }] });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });
    await expect(getSession("s1")).resolves.toEqual({ session_id: "s1", jobs: [] });
    expect(api.get).toHaveBeenLastCalledWith("/v1/dev-console/sessions/s1");
  });

  it("attaches a session to a ticket", async () => {
    api.post.mockResolvedValue({ status: 200 });
    await attachSessionToTicket("s1", "t-9");
    expect(api.post).toHaveBeenCalledWith("/v1/dev-console/sessions/s1/attach", { ticket_id: "t-9" });
  });

  it("owner: admin sessions with filters", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [] } });
    await listAdminSessions({ user: "u", since: "2026-10-01" });
    expect(api.get).toHaveBeenCalledWith("/v1/dev-console/admin/sessions", { params: { user: "u", since: "2026-10-01" } });
    await listAdminSessions();
    expect(api.get).toHaveBeenLastCalledWith("/v1/dev-console/admin/sessions", { params: {} });
  });

  it("owner: admins normalise strings and objects", async () => {
    api.get.mockResolvedValue({
      data: { success: true, data: ["test@example.com", { email: "test@example.com" }, { nope: 1 }] },
    });
    await expect(listConsoleAdmins()).resolves.toEqual([
      { email: "test@example.com" },
      { email: "test@example.com" },
    ]);
  });

  it("owner: grant and revoke", async () => {
    api.post.mockResolvedValue({});
    api.delete.mockResolvedValue({});
    await grantConsoleAdmin("test@example.com");
    await revokeConsoleAdmin("test@example.com");
    expect(api.post).toHaveBeenCalledWith("/v1/dev-console/admins", { email: "test@example.com" });
    expect(api.delete).toHaveBeenCalledWith("/v1/dev-console/admins/test%40example.com");
  });
});
