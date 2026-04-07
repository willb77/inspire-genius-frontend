/**
 * @jest-environment jsdom
 *
 * Tests for the audit service API functions:
 *  - logAuditEvent() — fire-and-forget POST
 *  - getAuditLogs() — paginated GET with filters
 *  - getAuditStats() — aggregated stats GET
 */

import { api } from "@/lib/axios"
import {
  logAuditEvent,
  getAuditLogs,
  getAuditStats,
} from "../audit.service"
import type { AuditLogPayload, AuditLogListParams } from "@/types/audit"

jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}))

describe("audit.service.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─── logAuditEvent ──────────────────────────────────────────────

  describe("logAuditEvent()", () => {
    const payload: AuditLogPayload = {
      action: "page.view",
      actor_type: "user",
      actor_id: "user-uuid",
    }

    test("should POST to /v1/audit/log with payload", async () => {
      ;(api.post as jest.Mock).mockResolvedValueOnce({ data: { status: "accepted" } })

      await logAuditEvent(payload)

      expect(api.post).toHaveBeenCalledWith("/v1/audit/log", payload)
    })

    test("should not throw on API error (fire-and-forget)", async () => {
      ;(api.post as jest.Mock).mockRejectedValueOnce(new Error("Network error"))

      // Should not throw
      await expect(logAuditEvent(payload)).resolves.toBeUndefined()
    })

    test("should send all payload fields", async () => {
      const fullPayload: AuditLogPayload = {
        action: "auth.login",
        actor_type: "user",
        actor_id: "uuid-1",
        actor_email: "user@test.com",
        company_id: "company-uuid",
        target_type: "session",
        target_id: "session-uuid",
        description: "User logged in",
        ip_address: "192.168.1.1",
      }

      ;(api.post as jest.Mock).mockResolvedValueOnce({ data: { status: "accepted" } })

      await logAuditEvent(fullPayload)

      expect(api.post).toHaveBeenCalledWith("/v1/audit/log", fullPayload)
    })
  })

  // ─── getAuditLogs ───────────────────────────────────────────────

  describe("getAuditLogs()", () => {
    const mockResponse = {
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

    test("should GET /v1/audit/logs with default params", async () => {
      ;(api.get as jest.Mock).mockResolvedValueOnce({ data: mockResponse })

      const result = await getAuditLogs()

      expect(api.get).toHaveBeenCalledWith("/v1/audit/logs", { params: {} })
      expect(result).toEqual(mockResponse)
    })

    test("should forward filter params", async () => {
      const params: AuditLogListParams = {
        action: "auth.login",
        actor_type: "user",
        start_date: "2026-03-01",
        end_date: "2026-03-29",
        limit: 10,
        offset: 20,
      }

      ;(api.get as jest.Mock).mockResolvedValueOnce({ data: mockResponse })

      await getAuditLogs(params)

      expect(api.get).toHaveBeenCalledWith("/v1/audit/logs", { params })
    })

    test("should forward actor_id filter", async () => {
      const params: AuditLogListParams = { actor_id: "uuid-123" }

      ;(api.get as jest.Mock).mockResolvedValueOnce({ data: mockResponse })

      await getAuditLogs(params)

      expect(api.get).toHaveBeenCalledWith("/v1/audit/logs", { params })
    })

    test("should forward company_id filter", async () => {
      const params: AuditLogListParams = { company_id: "company-uuid" }

      ;(api.get as jest.Mock).mockResolvedValueOnce({ data: mockResponse })

      await getAuditLogs(params)

      expect(api.get).toHaveBeenCalledWith("/v1/audit/logs", { params })
    })

    test("should throw on API error", async () => {
      ;(api.get as jest.Mock).mockRejectedValueOnce(new Error("Server error"))

      await expect(getAuditLogs()).rejects.toThrow("Server error")
    })
  })

  // ─── getAuditStats ─────────────────────────────────────────────

  describe("getAuditStats()", () => {
    const mockStats = {
      status: "success",
      data: {
        total_logs: 500,
        logs_today: 25,
        logs_this_week: 150,
        logs_this_month: 400,
        top_actions: [{ action: "auth.login", count: 200 }],
        top_actors: [{ email: "admin@test.com", type: "user", count: 100 }],
        ai_usage: {
          total_tokens_input: 50000,
          total_tokens_output: 60000,
          total_duration_ms: 120000,
          total_cost_usd: 1.5,
          request_count: 50,
        },
        storage_size_mb: 12.5,
      },
    }

    test("should GET /v1/audit/stats", async () => {
      ;(api.get as jest.Mock).mockResolvedValueOnce({ data: mockStats })

      const result = await getAuditStats()

      expect(api.get).toHaveBeenCalledWith("/v1/audit/stats")
      expect(result).toEqual(mockStats)
    })

    test("should throw on API error", async () => {
      ;(api.get as jest.Mock).mockRejectedValueOnce(new Error("Timeout"))

      await expect(getAuditStats()).rejects.toThrow("Timeout")
    })
  })
})
