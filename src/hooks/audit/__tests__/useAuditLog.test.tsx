/**
 * @jest-environment jsdom
 *
 * Test suite for the `useAuditLogs` and `useAuditStats` hooks.
 * These hooks wrap the audit service functions using React Query's `useQuery`,
 * providing loading/error/success states and caching.
 *
 * Tests cover:
 *  - successful data fetching
 *  - API error handling
 *  - query key isolation with different params
 *  - loading states
 */

import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAuditLogs, useAuditStats } from "../useAudit"
import { getAuditLogs, getAuditStats } from "@/services/audit/audit.service"
import type { AxiosError } from "axios"

jest.mock("@/services/audit/audit.service", () => ({
  getAuditLogs: jest.fn(),
  getAuditStats: jest.fn(),
}))

// useAuditStats was changed to gate by role (super-admin or company-admin).
// These tests don't need to verify the gate itself — that's covered by the
// hook's role-check contract — so stub useAuth to grant access.
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    hasRole: () => true,
    isAtLeast: () => true,
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useAuditLogs", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("successfully fetches audit logs", async () => {
    const mockData = {
      status: "success",
      data: {
        logs: [
          {
            id: "log-1",
            action: "auth.login",
            actor_type: "user",
            actor_email: "user@test.com",
            timestamp: "2026-03-29T12:00:00Z",
          },
        ],
        total: 1,
        limit: 15,
        offset: 0,
        has_more: false,
      },
    }

    ;(getAuditLogs as jest.Mock).mockResolvedValueOnce(mockData)

    const { result } = renderHook(
      () => useAuditLogs({ action: "auth.login" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getAuditLogs).toHaveBeenCalledWith({ action: "auth.login" })
    expect(result.current.data).toEqual(mockData)
    expect(result.current.data?.data?.logs).toHaveLength(1)
  })

  test("handles API error", async () => {
    const mockError = {
      response: { status: 500, data: { message: "Internal error" } },
      isAxiosError: true,
    } as AxiosError

    ;(getAuditLogs as jest.Mock).mockRejectedValueOnce(mockError)

    const { result } = renderHook(
      () => useAuditLogs({}),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  test("passes pagination params to service", async () => {
    ;(getAuditLogs as jest.Mock).mockResolvedValueOnce({
      status: "success",
      data: { logs: [], total: 0, limit: 10, offset: 20, has_more: false },
    })

    const { result } = renderHook(
      () => useAuditLogs({ limit: 10, offset: 20 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getAuditLogs).toHaveBeenCalledWith({ limit: 10, offset: 20 })
  })

  test("passes all filter params", async () => {
    const params = {
      action: "auth.login",
      actor_type: "user",
      actor_id: "uuid-1",
      company_id: "company-uuid",
      start_date: "2026-03-01",
      end_date: "2026-03-29",
    }

    ;(getAuditLogs as jest.Mock).mockResolvedValueOnce({
      status: "success",
      data: { logs: [], total: 0, limit: 15, offset: 0, has_more: false },
    })

    const { result } = renderHook(
      () => useAuditLogs(params),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getAuditLogs).toHaveBeenCalledWith(params)
  })

  test("returns loading state initially", () => {
    ;(getAuditLogs as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    )

    const { result } = renderHook(
      () => useAuditLogs({}),
      { wrapper: createWrapper() },
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })
})

describe("useAuditStats", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("successfully fetches audit stats", async () => {
    const mockStats = {
      status: "success",
      data: {
        total_logs: 500,
        logs_today: 25,
        logs_this_week: 150,
        logs_this_month: 400,
        top_actions: [],
        top_actors: [],
        ai_usage: {
          total_tokens_input: 0,
          total_tokens_output: 0,
          total_duration_ms: 0,
          total_cost_usd: 0,
          request_count: 0,
        },
        storage_size_mb: 5.5,
      },
    }

    ;(getAuditStats as jest.Mock).mockResolvedValueOnce(mockStats)

    const { result } = renderHook(() => useAuditStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getAuditStats).toHaveBeenCalled()
    expect(result.current.data?.data?.total_logs).toBe(500)
  })

  test("handles stats API error", async () => {
    const mockError = {
      response: { status: 403, data: { message: "Forbidden" } },
      isAxiosError: true,
    } as AxiosError

    ;(getAuditStats as jest.Mock).mockRejectedValueOnce(mockError)

    const { result } = renderHook(() => useAuditStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  test("returns loading state initially", () => {
    ;(getAuditStats as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    )

    const { result } = renderHook(() => useAuditStats(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })
})
