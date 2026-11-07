import { AxiosError, AxiosHeaders } from "axios"
import { agentApi } from "@/lib/agentApi"
import {
  getMyPracticeRegistration,
  MY_PRACTICE_PATH,
} from "../practitionerPractice.service"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))

const get = agentApi.get as jest.Mock

function httpError(status: number): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError("boom", String(status), { headers }, null, {
    status,
    statusText: "",
    headers: {},
    config: { headers },
    data: {},
  })
}

const ROW = {
  practitionerCode: "ABC-DEF-GHJ",
  siteId: "SITE-1",
  clientId: "CLIENT-1",
  reference: "REF-1",
  active: true,
  deactivatedAt: null,
}

describe("getMyPracticeRegistration", () => {
  beforeEach(() => get.mockReset())

  it("calls the agent-engine /me route with no identifying parameter", async () => {
    get.mockResolvedValue({ data: { status: true, data: ROW } })
    await expect(getMyPracticeRegistration()).resolves.toEqual({ state: "registered", registration: ROW })
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0]).toEqual([MY_PRACTICE_PATH])
    expect(MY_PRACTICE_PATH).toBe("/v1/agents/practitioner-registry/me")
  })

  it("maps 404 to missing", async () => {
    get.mockRejectedValue(httpError(404))
    await expect(getMyPracticeRegistration()).resolves.toEqual({ state: "missing" })
  })

  it("maps 403 to dark", async () => {
    get.mockRejectedValue(httpError(403))
    await expect(getMyPracticeRegistration()).resolves.toEqual({ state: "dark" })
  })

  it("rethrows anything else rather than reporting 'not registered'", async () => {
    get.mockRejectedValue(httpError(503))
    await expect(getMyPracticeRegistration()).rejects.toBeInstanceOf(AxiosError)
    const plain = new Error("network")
    get.mockRejectedValue(plain)
    await expect(getMyPracticeRegistration()).rejects.toBe(plain)
  })
})
