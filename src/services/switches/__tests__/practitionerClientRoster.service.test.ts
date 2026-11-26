/**
 * RM-6 B: the client-roster status read. Only `enabled === true` is ON; a 404
 * (the engine route not yet on this tier: the frontend reaches staging-b at
 * merge, the route at the next promote) is OFF; any other failure is thrown so
 * React Query reads it as an error, which the hook also treats as OFF.
 */
import { AxiosError, AxiosHeaders } from "axios"

const mockGet = jest.fn()
jest.mock("@/lib/agentApi", () => ({ agentApi: { get: (...a: unknown[]) => mockGet(...a) } }))

import { getPractitionerClientRosterEnabled } from "../practitionerClientRoster.service"

function httpError(status: number): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError("fail", String(status), undefined, undefined, {
    status,
    statusText: "",
    headers,
    config: { headers },
    data: {},
  })
}

beforeEach(() => mockGet.mockReset())

describe("getPractitionerClientRosterEnabled", () => {
  it("reads the engine's status route", async () => {
    mockGet.mockResolvedValue({ data: { status: true, data: { enabled: true } } })
    await getPractitionerClientRosterEnabled()
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/switches/practitioner-client-roster")
  })

  it.each([
    [{ status: true, data: { enabled: true } }, true],
    [{ status: true, data: { enabled: false } }, false],
    [{ status: true, data: { enabled: "true" } }, false],
    [{ status: true, data: {} }, false],
    [undefined, false],
  ])("enabled only for a literal true (%j → %s)", async (body, expected) => {
    mockGet.mockResolvedValue({ data: body })
    expect(await getPractitionerClientRosterEnabled()).toBe(expected)
  })

  it("a 404 (route not deployed on this tier) reads OFF", async () => {
    mockGet.mockRejectedValue(httpError(404))
    expect(await getPractitionerClientRosterEnabled()).toBe(false)
  })

  it("any other failure is thrown, not read as an answer", async () => {
    mockGet.mockRejectedValue(httpError(500))
    await expect(getPractitionerClientRosterEnabled()).rejects.toBeInstanceOf(AxiosError)
  })
})
