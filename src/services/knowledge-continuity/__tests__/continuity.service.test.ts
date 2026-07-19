/**
 * @jest-environment node
 *
 * Exercises the Knowledge Continuity service wrappers against a mocked `api`
 * instance. These go through the plain monolith/API-Gateway axios instance
 * (trainer-service), not the Agent Engine — locks in the request shape
 * (path + params) and the response-envelope unwrapping.
 */

const get = jest.fn()
jest.mock("@/lib/axios", () => ({
  api: { get },
}))

import { getAnalytics, getRiskRegister } from "../continuity.service"

const envelope = <T>(data: T) => ({ data: { status: true, data } })

beforeEach(() => {
  jest.clearAllMocks()
  get.mockResolvedValue(envelope(undefined))
})

describe("Knowledge Continuity service wrappers", () => {
  test("getAnalytics GETs /v1/trainer/continuity/analytics with no params by default", async () => {
    get.mockResolvedValueOnce(envelope({ org_id: null }))
    const res = await getAnalytics()
    expect(get).toHaveBeenCalledWith("/v1/trainer/continuity/analytics", { params: {} })
    expect(res.data).toEqual({ org_id: null })
  })

  test("getAnalytics passes org_id when provided", async () => {
    await getAnalytics("org-1")
    expect(get).toHaveBeenCalledWith("/v1/trainer/continuity/analytics", {
      params: { org_id: "org-1" },
    })
  })

  test("getRiskRegister GETs /v1/trainer/continuity/risk-register with no params by default", async () => {
    get.mockResolvedValueOnce(envelope([{ id: "r1" }]))
    const res = await getRiskRegister()
    expect(get).toHaveBeenCalledWith("/v1/trainer/continuity/risk-register", { params: {} })
    expect(res.data).toEqual([{ id: "r1" }])
  })

  test("getRiskRegister passes org_id when provided", async () => {
    await getRiskRegister("org-1")
    expect(get).toHaveBeenCalledWith("/v1/trainer/continuity/risk-register", {
      params: { org_id: "org-1" },
    })
  })
})
