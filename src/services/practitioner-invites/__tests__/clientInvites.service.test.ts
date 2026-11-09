import { AxiosError, AxiosHeaders } from "axios"
import {
  CLAIM_PATH,
  INVITES_PATH,
  claimClientInvite,
  createClientInvite,
  inviteErrorMessage,
  listClientInvites,
  revokeClientInvite,
  rotateClientInvite,
} from "../clientInvites.service"

const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}))

function httpError(status: number, detail: unknown = "x"): AxiosError {
  return new AxiosError("fail", "ERR", undefined, undefined, {
    status,
    statusText: "",
    data: { detail },
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde"
const INVITE = {
  id: "i-1",
  clientId: "c-1",
  email: "c@example.com",
  status: "pending",
  createdAt: null,
  expiresAt: null,
  claimedAt: null,
  claimedEmail: null,
  revokedAt: null,
  rotatedFrom: null,
}

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
})

describe("listClientInvites", () => {
  it("returns the live list", async () => {
    mockGet.mockResolvedValue({ data: { status: true, data: { invites: [INVITE] } } })
    await expect(listClientInvites()).resolves.toEqual({ state: "live", invites: [INVITE] })
    expect(mockGet).toHaveBeenCalledWith(INVITES_PATH)
  })
  it("treats the plain 404 (switch does not apply) as off", async () => {
    mockGet.mockRejectedValue(httpError(404, "Not Found"))
    await expect(listClientInvites()).resolves.toEqual({ state: "off" })
  })
  it("treats 403 (programme off) as off", async () => {
    mockGet.mockRejectedValue(httpError(403))
    await expect(listClientInvites()).resolves.toEqual({ state: "off" })
  })
  it("throws anything else, so the page says it could not load", async () => {
    mockGet.mockRejectedValue(httpError(500))
    await expect(listClientInvites()).rejects.toBeInstanceOf(AxiosError)
  })
  it("defaults a missing list to empty", async () => {
    mockGet.mockResolvedValue({ data: { status: true, data: {} } })
    await expect(listClientInvites()).resolves.toEqual({ state: "live", invites: [] })
  })
})

describe("create / revoke / rotate", () => {
  it("creates with the client id in the body", async () => {
    mockPost.mockResolvedValue({ data: { data: { invite: INVITE, invitePath: `/signup#invite=${TOKEN}` } } })
    const res = await createClientInvite("c-1")
    expect(mockPost).toHaveBeenCalledWith(INVITES_PATH, { clientId: "c-1" })
    expect(res.invitePath).toBe(`/signup#invite=${TOKEN}`)
  })
  it("revokes by id", async () => {
    mockPost.mockResolvedValue({ data: { data: { invite: { ...INVITE, status: "revoked" } } } })
    const res = await revokeClientInvite("i-1")
    expect(mockPost).toHaveBeenCalledWith(`${INVITES_PATH}/i-1/revoke`)
    expect(res.status).toBe("revoked")
  })
  it("rotates by id and returns the new one-time path", async () => {
    mockPost.mockResolvedValue({ data: { data: { invite: INVITE, invitePath: "/signup#invite=new" } } })
    const res = await rotateClientInvite("i/1")
    expect(mockPost).toHaveBeenCalledWith(`${INVITES_PATH}/i%2F1/rotate`)
    expect(res.invitePath).toBe("/signup#invite=new")
  })
})

describe("claimClientInvite", () => {
  it("sends the token in the BODY, never the URL", async () => {
    mockPost.mockResolvedValue({ data: { status: true, data: { practitionerName: "Dr P" } } })
    await expect(claimClientInvite(TOKEN)).resolves.toEqual({ outcome: "claimed", practitionerName: "Dr P" })
    expect(mockPost).toHaveBeenCalledTimes(1)
    const [url, body] = mockPost.mock.calls[0]
    expect(url).toBe(CLAIM_PATH)
    expect(String(url)).not.toContain(TOKEN)
    expect(String(url)).not.toContain("?")
    expect(body).toEqual({ token: TOKEN })
  })
  it("falls back to a generic name", async () => {
    mockPost.mockResolvedValue({ data: { status: true, data: {} } })
    await expect(claimClientInvite(TOKEN)).resolves.toEqual({
      outcome: "claimed",
      practitionerName: "your practitioner",
    })
  })
  it.each([
    [404, "not_valid"],
    [429, "too_many"],
    [422, "own_invite"],
    [403, "error"],
    [500, "error"],
  ])("maps %s to %s and never throws", async (status, outcome) => {
    mockPost.mockRejectedValue(httpError(status))
    await expect(claimClientInvite(TOKEN)).resolves.toEqual({ outcome })
  })
  it("maps a network failure to error", async () => {
    mockPost.mockRejectedValue(new Error("offline"))
    await expect(claimClientInvite(TOKEN)).resolves.toEqual({ outcome: "error" })
  })
})

describe("inviteErrorMessage", () => {
  it("returns a string detail only", () => {
    expect(inviteErrorMessage(httpError(409, "This client is already connected to an account."))).toBe(
      "This client is already connected to an account.",
    )
    expect(inviteErrorMessage(httpError(422, [{ message: "x" }]))).toBeUndefined()
    expect(inviteErrorMessage(new Error("plain"))).toBeUndefined()
  })
})
