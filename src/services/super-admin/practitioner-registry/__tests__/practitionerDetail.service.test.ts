import { getPractitionerDetail } from "../practitionerDetail.service"

const get = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: (...a: unknown[]) => get(...a) },
}))

describe("practitionerDetail.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("reads the detail route on agentApi and unwraps the envelope", async () => {
    const data = { practitionerSub: "p1", active: true, linkedClients: 2, surveysOnSite30d: 3, surveyWindowDays: 30 }
    get.mockResolvedValue({ data: { status: true, data } })
    expect(await getPractitionerDetail("p1")).toEqual(data)
    expect(get).toHaveBeenCalledWith("/v1/agents/practitioner-registry/p1/detail")
  })

  it("encodes the practitioner id into the path", async () => {
    get.mockResolvedValue({ data: { status: true, data: {} } })
    await getPractitionerDetail("a/b c")
    expect(get).toHaveBeenCalledWith("/v1/agents/practitioner-registry/a%2Fb%20c/detail")
  })
})
