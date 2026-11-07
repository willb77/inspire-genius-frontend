/**
 * @jest-environment jsdom
 */
import { agentApi } from "@/lib/agentApi"
import { exportCohortReadout, getCohortReadout, getCohortReadoutEnabled } from "../cohortReadout.service"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))

const mockGet = agentApi.get as jest.Mock

describe("cohortReadout.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("status is true only on an explicit true", async () => {
    mockGet.mockResolvedValueOnce({ data: { status: true, data: { enabled: true } } })
    await expect(getCohortReadoutEnabled()).resolves.toBe(true)
    mockGet.mockResolvedValueOnce({ data: { status: true, data: { enabled: "yes" } } })
    await expect(getCohortReadoutEnabled()).resolves.toBe(false)
    mockGet.mockResolvedValueOnce({ data: {} })
    await expect(getCohortReadoutEnabled()).resolves.toBe(false)
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/cohort-readout/status")
  })

  it("reads the caller's own org — never sends an org id", async () => {
    mockGet.mockResolvedValueOnce({ data: { status: true, data: { suppressed: true } } })
    await getCohortReadout()
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/cohort-readout", { params: undefined })
    mockGet.mockResolvedValueOnce({ data: { status: true, data: { suppressed: true } } })
    await getCohortReadout("2026-08-01")
    expect(mockGet).toHaveBeenLastCalledWith("/v1/agents/cohort-readout", { params: { since: "2026-08-01" } })
  })

  it("a super-admin's picked org goes as org_id on the read and the export", async () => {
    mockGet.mockResolvedValueOnce({ data: { status: true, data: { suppressed: true } } })
    await getCohortReadout(undefined, "org-9")
    expect(mockGet).toHaveBeenLastCalledWith("/v1/agents/cohort-readout", { params: { org_id: "org-9" } })
    mockGet.mockResolvedValueOnce({ data: new Blob(["x"]) })
    await exportCohortReadout("csv", "2026-08-01", "org-9")
    expect(mockGet).toHaveBeenLastCalledWith("/v1/agents/cohort-readout/export", {
      params: { format: "csv", since: "2026-08-01", org_id: "org-9" },
      responseType: "blob",
    })
  })

  it("exports as a blob in the chosen format", async () => {
    const blob = new Blob(["x"])
    mockGet.mockResolvedValueOnce({ data: blob })
    await expect(exportCohortReadout("docx", "2026-08-01")).resolves.toBe(blob)
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/cohort-readout/export", {
      params: { format: "docx", since: "2026-08-01" },
      responseType: "blob",
    })
  })
})
