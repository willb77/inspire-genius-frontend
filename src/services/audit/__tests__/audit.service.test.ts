/**
 * Tests for the audit service API functions.
 */
// Mock axios BEFORE imports — the audit service creates its own axios instance at module level
const mockGet = jest.fn()
jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: () => ({
      get: mockGet,
      interceptors: { request: { use: jest.fn() } },
    }),
  },
}))

import { logAuditEvent, getAuditLogs, getAuditStats } from "../audit.service"
import type { AuditLogPayload, AuditLogListParams } from "@/types/audit"

jest.mock("@/lib/axios", () => ({
  api: {
    defaults: { baseURL: "https://api.test.com", headers: { common: {} } },
  },
}))

describe("audit.service.ts", () => {
  const sendBeaconSpy = jest.fn().mockReturnValue(true)

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeaconSpy,
      writable: true,
      configurable: true,
    })
  })

  // ─── logAuditEvent ──────────────────────────────────────────────
  describe("logAuditEvent()", () => {
    const payload: AuditLogPayload = {
      action: "page.view",
      actor_type: "user",
      actor_id: "user-uuid",
    }

    test("should send audit event via sendBeacon", async () => {
      await logAuditEvent(payload)
      expect(sendBeaconSpy).toHaveBeenCalled()
    })

    test("should not throw on error", async () => {
      sendBeaconSpy.mockImplementationOnce(() => { throw new Error("fail") })
      await expect(logAuditEvent(payload)).resolves.toBeUndefined()
    })
  })

  // ─── getAuditLogs ───────────────────────────────────────────────
  describe("getAuditLogs()", () => {
    const mockResponse = {
      status: "success",
      data: { logs: [{ id: "log-1", action: "auth.login" }], total: 1, limit: 15 },
    }

    test("should GET /v1/audit/logs with params", async () => {
      mockGet.mockResolvedValueOnce({ data: mockResponse })
      const result = await getAuditLogs()
      expect(mockGet).toHaveBeenCalledWith("/v1/audit/logs", { params: {} })
      expect(result).toEqual(mockResponse)
    })

    test("should forward filter params", async () => {
      const params: AuditLogListParams = { action: "auth.login", limit: 10, offset: 20 }
      mockGet.mockResolvedValueOnce({ data: mockResponse })
      await getAuditLogs(params)
      expect(mockGet).toHaveBeenCalledWith("/v1/audit/logs", { params })
    })

    test("should throw on API error", async () => {
      mockGet.mockRejectedValueOnce(new Error("Server error"))
      await expect(getAuditLogs()).rejects.toThrow("Server error")
    })
  })

  // ─── getAuditStats ─────────────────────────────────────────────
  describe("getAuditStats()", () => {
    const mockStats = {
      status: "success",
      data: { total_logs: 500, logs_today: 25 },
    }

    test("should GET /v1/audit/stats", async () => {
      mockGet.mockResolvedValueOnce({ data: mockStats })
      const result = await getAuditStats()
      expect(mockGet).toHaveBeenCalledWith("/v1/audit/stats")
      expect(result).toEqual(mockStats)
    })

    test("should throw on API error", async () => {
      mockGet.mockRejectedValueOnce(new Error("Timeout"))
      await expect(getAuditStats()).rejects.toThrow("Timeout")
    })
  })
})
