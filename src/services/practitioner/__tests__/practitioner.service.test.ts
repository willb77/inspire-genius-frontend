/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { getPractitionerClients, getPractitionerSessions, getPractitionerCredits, getPractitionerFollowups } from "../practitioner.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("practitioner.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([
    ["getPractitionerClients", getPractitionerClients, "/api/practitioner/clients"],
    ["getPractitionerSessions", getPractitionerSessions, "/api/practitioner/sessions"],
    ["getPractitionerCredits", getPractitionerCredits, "/api/practitioner/credits"],
    ["getPractitionerFollowups", getPractitionerFollowups, "/api/practitioner/followups"],
  ] as const)("%s calls correct endpoint", async (_name, fn, url) => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await fn()
    expect(mockApi.get).toHaveBeenCalledWith(url)
  })
})
