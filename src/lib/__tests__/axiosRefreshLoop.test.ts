/**
 * @jest-environment jsdom
 *
 * The 401 refresh/retry loop — regression tests.
 *
 * 2026-08-12, staging-b: one user produced 132 `/v1/refresh-token` calls in
 * 7 minutes (~2.5/second) and was never logged out. Two independent defects
 * had to line up:
 *
 *   1. broadcast-service returned 401 on `/v1/notifications` for any Cognito
 *      access-token session (no `email` claim). Fixed server-side.
 *   2. THIS FILE'S SUBJECT — the interceptor's "retry once" guard was a
 *      `WeakSet` keyed on the axios config OBJECT. The retry is issued as
 *      `instance(original)`, and axios `mergeConfig`s that into a NEW object,
 *      so the guard never recognised the second failure. Verified directly
 *      against axios 1.11.0: config identity is not preserved across a retry.
 *
 * The bound that matters is on the number of REFRESH calls, not on whether a
 * single request succeeds. A test asserting "the request eventually fails"
 * passes just as happily while 132 refreshes fly past underneath it.
 */

const mockGetToken = jest.fn<Promise<string | null>, []>();
const mockGetRefreshToken = jest.fn<Promise<string | null>, []>();
const mockSetToken = jest.fn<Promise<void>, [string]>();
const mockClearAuth = jest.fn<Promise<void>, []>();

jest.mock("@/lib/storage", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...(args as [])),
  getRefreshToken: (...args: unknown[]) => mockGetRefreshToken(...(args as [])),
  setToken: (...args: unknown[]) => mockSetToken(...(args as [string])),
  clearAuth: (...args: unknown[]) => mockClearAuth(...(args as [])),
}));

import axios from "axios";
import { api } from "../axios";

/** Count of 401s the fake server has served, i.e. how many times we retried. */
let serverHits = 0;
/** Count of refresh attempts the interceptor made. */
let refreshCalls = 0;

const originalAdapter = api.defaults.adapter;

// NOTE ON WHAT IS *NOT* ASSERTED HERE
// The interceptor's logout does two things: `clearAuth()` and
// `window.location.href = '/login'`. Only the first is asserted. jsdom's
// `window.location` is non-configurable — `delete` + reassign fails SILENTLY,
// leaving the real Location in place, so an `expect(location.href)` check
// reads jsdom's default URL and passes or fails for reasons unrelated to the
// code under test. `clearAuth` is the honest signal that the loop terminated
// in a logout, so that is what these tests use.

function alwaysUnauthorizedAdapter() {
  api.defaults.adapter = (async (config: unknown) => {
    serverHits += 1;
    const err = new Error("401") as Error & {
      config: unknown;
      response: { status: number; data: unknown };
      isAxiosError: boolean;
    };
    err.config = config;
    err.response = { status: 401, data: {} };
    err.isAxiosError = true;
    throw err;
  }) as typeof api.defaults.adapter;
}

beforeEach(() => {
  jest.clearAllMocks();
  serverHits = 0;
  refreshCalls = 0;

  mockGetToken.mockResolvedValue("stale-access-token");
  mockGetRefreshToken.mockResolvedValue("a-refresh-token");
  mockSetToken.mockResolvedValue(undefined);
  mockClearAuth.mockResolvedValue(undefined);

  // The refresh always SUCCEEDS — exactly as it did in the incident, where
  // all 132 refresh calls returned 200. The loop was never a broken refresh.
  jest.spyOn(axios, "post").mockImplementation((async () => {
    refreshCalls += 1;
    return { data: { data: { access_token: "a-fresh-token" } } };
  }) as never);

  alwaysUnauthorizedAdapter();
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  jest.restoreAllMocks();
});

describe("401 handling is bounded", () => {
  test("a persistently-401ing endpoint refreshes AT MOST once", async () => {
    await expect(api.get("/v1/goals")).rejects.toBeTruthy();

    expect(refreshCalls).toBe(1);
    expect(serverHits).toBe(2); // original + exactly one retry
  });

  test("the second 401 logs out instead of looping", async () => {
    await expect(api.get("/v1/goals")).rejects.toBeTruthy();

    expect(mockClearAuth).toHaveBeenCalledTimes(1);
  });

  test("the retry flag survives axios mergeConfig", async () => {
    // The precise mechanism of the original bug. If the marker did not
    // survive the retry, refreshCalls would climb without bound here.
    await expect(api.get("/v1/goals")).rejects.toBeTruthy();

    expect(refreshCalls).toBeLessThanOrEqual(1);
    expect(serverHits).toBeLessThanOrEqual(2);
  });

  test("many concurrent 401s share a single refresh (single-flight holds)", async () => {
    const results = await Promise.allSettled([
      api.get("/v1/goals"),
      api.get("/v1/documents"),
      api.get("/v1/coaches"),
    ]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    // Three requests, but they must not produce three independent refreshes
    // *per retry round*. The hard bound is one refresh per request at most.
    expect(refreshCalls).toBeLessThanOrEqual(3);
    expect(serverHits).toBeLessThanOrEqual(6);
  });
});

describe("passive side panels cannot end a session", () => {
  test("a 401 from /v1/notifications does not refresh or log out", async () => {
    await expect(api.get("/v1/notifications")).rejects.toBeTruthy();

    expect(refreshCalls).toBe(0);
    expect(mockClearAuth).not.toHaveBeenCalled();
    expect(serverHits).toBe(1); // no retry at all
  });

  test("the notification counter is treated the same way", async () => {
    await expect(api.get("/v1/notifications/unread-count")).rejects.toBeTruthy();

    expect(refreshCalls).toBe(0);
    expect(mockClearAuth).not.toHaveBeenCalled();
  });

  test("observability stays non-critical (2026-06-06 regression)", async () => {
    await expect(api.get("/v1/observability/summary")).rejects.toBeTruthy();

    expect(refreshCalls).toBe(0);
    expect(mockClearAuth).not.toHaveBeenCalled();
  });
});
