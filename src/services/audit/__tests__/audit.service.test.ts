/**
 * Tests for the audit service API functions.
 */
import { api } from "@/lib/axios"
import { logAuditEvent, getAuditLogs, getAuditStats } from "../audit.service"
import type { AuditLogPayload, AuditLogListParams } from "@/types/audit"

jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn().mockReturnValue({ catch: jest.fn() }),
    get: jest.fn(),
    defaults: { baseURL: "https://api.test.com", headers: { common: {} } },
  },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("audit.service.ts", () => {
  beforeEach(() => jest.clearAllMocks())

  describe("logAuditEvent()", () => {
    const payload: AuditLogPayload = { action: "page.view", actor_type: "user", actor_id: "user-uuid" }

    test("should POST to /v1/audit/log", async () => {
      await logAuditEvent(payload)
      expect(mockApi.post).toHaveBeenCalledWith("/v1/audit/log", payload)
    })

    test("should not throw on error", async () => {
      mockApi.post.mockImplementationOnce(() => { throw new Error("fail") })
      await expect(logAuditEvent(payload)).resolves.toBeUndefined()
    })
  })

  describe("getAuditLogs()", () => {
    const mockResponse = { status: "success", data: { logs: [{ id: "log-1" }], total: 1, limit: 15 } }

    test("should GET /v1/audit/logs with params", async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockResponse })
      const result = await getAuditLogs()
      expect(mockApi.get).toHaveBeenCalledWith("/v1/audit/logs", { params: {} })
      expect(result).toEqual(mockResponse)
    })

    test("should forward filter params", async () => {
      const params: AuditLogListParams = { action: "auth.login", limit: 10, offset: 20 }
      mockApi.get.mockResolvedValueOnce({ data: mockResponse })
      await getAuditLogs(params)
      expect(mockApi.get).toHaveBeenCalledWith("/v1/audit/logs", { params })
    })

    test("should throw on API error", async () => {
      mockApi.get.mockRejectedValueOnce(new Error("Server error"))
      await expect(getAuditLogs()).rejects.toThrow("Server error")
    })
  })

  describe("getAuditStats()", () => {
    const mockStats = { status: "success", data: { total_logs: 500, logs_today: 25 } }

    test("should GET /v1/audit/stats", async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockStats })
      const result = await getAuditStats()
      expect(mockApi.get).toHaveBeenCalledWith("/v1/audit/stats")
      expect(result).toEqual(mockStats)
    })

    test("should throw on API error", async () => {
      mockApi.get.mockRejectedValueOnce(new Error("Timeout"))
      await expect(getAuditStats()).rejects.toThrow("Timeout")
    })
  })
})
