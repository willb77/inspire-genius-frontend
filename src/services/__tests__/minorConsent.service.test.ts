/**
 * @jest-environment jsdom
 */
import { agentApi } from "@/lib/agentApi"
import { getMinorConsentStatus, recordRosterAges, ROSTER_AGES_CHUNK } from "../minorConsent.service"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn(), post: jest.fn() } }))

const mockGet = agentApi.get as jest.Mock
const mockPost = agentApi.post as jest.Mock

describe("minorConsent.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("status is on only on an explicit true, and carries surfaces only when on", async () => {
    mockGet.mockResolvedValueOnce({
      data: { status: true, data: { enabled: true, rosterAgeCapture: true, surfaces: { chat: { allowed: false } } } },
    })
    await expect(getMinorConsentStatus()).resolves.toEqual({
      enabled: true, rosterAgeCapture: true, surfaces: { chat: { allowed: false } },
    })
    mockGet.mockResolvedValueOnce({
      data: { status: true, data: { enabled: "yes", rosterAgeCapture: 1, surfaces: { chat: { allowed: false } } } },
    })
    await expect(getMinorConsentStatus()).resolves.toEqual({
      enabled: false, rosterAgeCapture: false, surfaces: undefined,
    })
    mockGet.mockResolvedValueOnce({ data: {} })
    await expect(getMinorConsentStatus()).resolves.toEqual({ enabled: false, rosterAgeCapture: false })
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/minor-consent/status")
  })

  it("records roster ages in server-sized chunks and re-bases the row indexes", async () => {
    const rows = Array.from({ length: ROSTER_AGES_CHUNK + 2 }, (_, i) => ({
      email: `s${i}@example.test`, dateOfBirth: "2011-04-09",
    }))
    mockPost.mockImplementation((_url: string, body: { rows: unknown[] }) => Promise.resolve({
      data: {
        status: true,
        data: {
          total: body.rows.length, recorded: body.rows.length, invalid_date: 0, not_permitted: 0, not_enabled: 0,
          results: body.rows.map((_r, index) => ({ index, outcome: "recorded" })),
        },
      },
    }))
    const out = await recordRosterAges(rows)
    expect(mockPost).toHaveBeenCalledTimes(2)
    expect(mockPost.mock.calls[0][1].rows).toHaveLength(ROSTER_AGES_CHUNK)
    expect(out.total).toBe(ROSTER_AGES_CHUNK + 2)
    expect(out.recorded).toBe(ROSTER_AGES_CHUNK + 2)
    expect(out.results[ROSTER_AGES_CHUNK + 1]).toEqual({ index: ROSTER_AGES_CHUNK + 1, outcome: "recorded" })
  })
})
