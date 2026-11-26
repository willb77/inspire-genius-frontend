/**
 * @jest-environment jsdom
 *
 * TDS F-W7R2-1: after Remove, the On-file line kept the removed row until a
 * reload. The hook already invalidated the profile query; the refetch was
 * answered by the browser's HTTP cache, because `GET /v1/profile/me` is served
 * with `Cache-Control: private, max-age=30`. Every fetch of the snapshot now
 * carries a fresh `_` param, so the refetch after a mutation reaches the server.
 */

import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: (...args: unknown[]) => mockGet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import { useMyProfile, useRemoveAssessment } from "@/hooks/profile/useProfile";
import { getMyProfile } from "@/services/profile/profile";

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const meCalls = () => mockGet.mock.calls.filter((c) => c[0] === "/v1/profile/me");

beforeEach(() => {
  mockGet.mockReset();
  mockDelete.mockReset();
  mockGet.mockResolvedValue({ data: { user_id: "u-1", facts: [], loaded_frameworks: [], assessments: [] } });
  mockDelete.mockResolvedValue({ data: { id: "a-1" } });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("getMyProfile sends a fresh cache-busting param on every call", async () => {
  const now = jest.spyOn(Date, "now");
  now.mockReturnValueOnce(1000).mockReturnValueOnce(2000);

  await getMyProfile();
  await getMyProfile();

  const calls = meCalls();
  expect(calls).toHaveLength(2);
  expect(calls[0][1]).toEqual({ params: { _: 1000 } });
  expect(calls[1][1]).toEqual({ params: { _: 2000 } });
});

test("after Remove, the next /me fetch uses a URL the browser cache has not seen", async () => {
  let t = 5000;
  jest.spyOn(Date, "now").mockImplementation(() => (t += 1));

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { result } = renderHook(
    () => ({ profile: useMyProfile(), remove: useRemoveAssessment() }),
    { wrapper: wrap(client) },
  );

  await waitFor(() => expect(result.current.profile.isSuccess).toBe(true));
  expect(meCalls()).toHaveLength(1);

  await act(async () => {
    await result.current.remove.mutateAsync("a-1");
  });

  await waitFor(() => expect(meCalls().length).toBeGreaterThanOrEqual(2));
  const [first, second] = meCalls();
  expect(first[1]?.params?._).toBeDefined();
  expect(second[1]?.params?._).toBeDefined();
  expect(second[1].params._).not.toEqual(first[1].params._);
});
