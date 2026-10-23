const get = jest.fn()
const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}))

import {
  approveSnapshot,
  createShare,
  createSnapshot,
  downloadShared,
  downloadSnapshot,
  getCareerPathwaysStatus,
  getDraft,
  listRecipients,
  listShares,
  listSnapshots,
  openShared,
  requestCode,
  revokeShare,
} from "@/services/career-pathways/careerPathways.service"

const BASE = "/v1/agents/career-pathways"
beforeEach(() => jest.clearAllMocks())

describe("status reads OFF unless the server says ON", () => {
  test("on", async () => {
    get.mockResolvedValue({ data: { status: true, data: { enabled: true, externalSharing: false } } })
    await expect(getCareerPathwaysStatus()).resolves.toEqual({ enabled: true, externalSharing: false })
    expect(get).toHaveBeenCalledWith(`${BASE}/status`)
  })
  test("a 404 (route not deployed) is off", async () => {
    get.mockRejectedValue({ response: { status: 404 } })
    await expect(getCareerPathwaysStatus()).resolves.toEqual({ enabled: false, externalSharing: false })
  })
  test("any error is off", async () => {
    get.mockRejectedValue(new Error("network"))
    await expect(getCareerPathwaysStatus()).resolves.toEqual({ enabled: false, externalSharing: false })
  })
  test("a malformed or truthy-but-not-true answer is off", async () => {
    get.mockResolvedValue({ data: { status: true, data: { enabled: "yes", externalSharing: true } } })
    await expect(getCareerPathwaysStatus()).resolves.toEqual({ enabled: false, externalSharing: false })
  })
})

test("candidate calls are self routes and unwrap the envelope", async () => {
  get.mockResolvedValue({ data: { status: true, data: { snapshots: [], shares: [], recipients: [] } } })
  post.mockResolvedValue({ data: { status: true, data: { id: "s1" } } })
  await getDraft()
  expect(get).toHaveBeenLastCalledWith(`${BASE}/draft`)
  await expect(listSnapshots()).resolves.toEqual([])
  await expect(listShares()).resolves.toEqual([])
  await listRecipients()
  expect(get).toHaveBeenLastCalledWith(`${BASE}/recipients`)
  const body = { sections: ["prism" as const], goalIds: [], includeEmail: false }
  await expect(createSnapshot(body)).resolves.toEqual({ id: "s1" })
  expect(post).toHaveBeenLastCalledWith(`${BASE}/snapshots`, body)
  await approveSnapshot("a/b")
  expect(post).toHaveBeenLastCalledWith(`${BASE}/snapshots/a%2Fb/approve`)
  await downloadSnapshot("s1", "pdf")
  expect(post).toHaveBeenLastCalledWith(`${BASE}/snapshots/s1/download`, { format: "pdf" })
  const share = {
    snapshotId: "s1", recipientId: "r1", consentVersion: "v", consentAccepted: true,
    expiresInDays: 14, maxOpens: 10, allowDownload: false,
  }
  await createShare(share)
  expect(post).toHaveBeenLastCalledWith(`${BASE}/shares`, share)
  await revokeShare("x")
  expect(post).toHaveBeenLastCalledWith(`${BASE}/shares/x/revoke`)
})

test("recipient calls carry the token in the body, never in a URL", async () => {
  post.mockResolvedValue({ data: { status: true, data: { profile: { sections: {} } } } })
  await requestCode("tok")
  expect(post).toHaveBeenLastCalledWith(`${BASE}/public/code`, { token: "tok" })
  await openShared("tok", "123456")
  expect(post).toHaveBeenLastCalledWith(`${BASE}/public/open`, { token: "tok", code: "123456" })
  post.mockResolvedValue({ data: new Blob(["x"]) })
  await downloadShared("tok", "vk", "docx")
  expect(post).toHaveBeenLastCalledWith(`${BASE}/public/download`, { token: "tok", viewKey: "vk", format: "docx" },
    { responseType: "blob" })
  for (const call of post.mock.calls) expect(String(call[0])).not.toContain("tok")
})
