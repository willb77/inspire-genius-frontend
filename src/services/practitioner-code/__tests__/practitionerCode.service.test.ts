import { redeemPractitionerCode } from "../practitionerCode.service"

const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { post: (...a: unknown[]) => post(...a) },
}))

describe("practitionerCode.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("posts the code to the agent-engine redeem route and returns the name", async () => {
    post.mockResolvedValue({ data: { status: true, data: { practitionerName: "Alice Able" } } })
    expect(await redeemPractitionerCode("ABCDEFGHJ")).toEqual({ practitionerName: "Alice Able" })
    expect(post).toHaveBeenCalledWith("/v1/agents/practitioner-registry/redeem", { code: "ABCDEFGHJ" })
  })

  it("lets a refusal propagate for the card to render", async () => {
    post.mockRejectedValue({ response: { status: 404, data: { detail: "That code was not recognised." } } })
    await expect(redeemPractitionerCode("ABCDEFGHJ")).rejects.toBeTruthy()
  })
})
