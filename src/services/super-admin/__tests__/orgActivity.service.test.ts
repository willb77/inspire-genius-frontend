import {
  downloadOrgActivityDocx,
  getOrgActivityOrgs,
  getOrgActivityReport,
} from "../orgActivity.service"
import { agentApi } from "@/lib/agentApi"
import { getOrgDirectory } from "@/services/super-admin/user-management/org-assignment.service"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))
jest.mock("@/services/super-admin/user-management/org-assignment.service", () => ({
  getOrgDirectory: jest.fn(),
}))

const get = agentApi.get as jest.Mock

describe("orgActivity service", () => {
  afterEach(() => jest.clearAllMocks())

  it("lists the platform's org directory with the engine's member counts; no profiles reads as 0", async () => {
    ;(getOrgDirectory as jest.Mock).mockResolvedValueOnce([
      { id: "o1", name: "Org One" },
      { id: "o2", name: "Org Two" },
    ])
    get.mockResolvedValueOnce({ data: { data: { counts: { o1: 29 } } } })
    await expect(getOrgActivityOrgs()).resolves.toEqual([
      { id: "o1", name: "Org One", memberCount: 29 },
      { id: "o2", name: "Org Two", memberCount: 0 },
    ])
    expect(get).toHaveBeenCalledWith("/v1/agents/admin/org-activity/member-counts")
  })

  it("requests the report under /v1/agents with bound query params, no token in the URL", async () => {
    get.mockResolvedValueOnce({ data: { data: { org: { id: "o1", name: "Org One" } } } })
    const r = await getOrgActivityReport("o1", true)
    expect(r.org.name).toBe("Org One")
    expect(get).toHaveBeenCalledWith("/v1/agents/admin/org-activity/report", {
      params: { org_id: "o1", include_internal: true },
    })
    expect(JSON.stringify(get.mock.calls)).not.toMatch(/token/i)
  })

  it("downloads the .docx as a blob and takes the filename from Content-Disposition", async () => {
    const blob = new Blob(["PK"])
    get.mockResolvedValueOnce({
      data: blob,
      headers: { "content-disposition": 'attachment; filename="Org_One_Activity_Report_2026-11-18.docx"' },
    })
    const out = await downloadOrgActivityDocx("o1", false)
    expect(out.blob).toBe(blob)
    expect(out.filename).toBe("Org_One_Activity_Report_2026-11-18.docx")
    expect(get).toHaveBeenCalledWith("/v1/agents/admin/org-activity/report.docx", {
      params: { org_id: "o1", include_internal: false },
      responseType: "blob",
    })
  })

  it("falls back to a generic filename when the header is missing", async () => {
    get.mockResolvedValueOnce({ data: new Blob(["PK"]), headers: {} })
    expect((await downloadOrgActivityDocx("o1", false)).filename).toBe("Organization_Activity_Report.docx")
  })

  it("throws on failure instead of returning an empty report", async () => {
    get.mockRejectedValueOnce(new Error("403"))
    await expect(getOrgActivityReport("o1", false)).rejects.toThrow("403")
  })
})
