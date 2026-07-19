/**
 * @jest-environment node
 *
 * Exercises the Knowledge Continuity service wrappers against a mocked `api`
 * instance. These go through the plain monolith/API-Gateway axios instance
 * (trainer-service), not the Agent Engine — locks in the request shape
 * (path + params) and the response-envelope unwrapping.
 */

const get = jest.fn()
const post = jest.fn()
jest.mock("@/lib/axios", () => ({
  api: { get, post },
}))

import {
  getAnalytics,
  getReviewQueue,
  getRiskRegister,
  registerAtRiskRole,
  startCaptureSession,
  submitValidation,
} from "../continuity.service"

const envelope = <T>(data: T) => ({ data: { status: true, data } })

beforeEach(() => {
  jest.clearAllMocks()
  get.mockResolvedValue(envelope(undefined))
  post.mockResolvedValue(envelope(undefined))
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

  test("getReviewQueue GETs /v1/trainer/continuity/review-queue with no params by default", async () => {
    get.mockResolvedValueOnce(envelope({ needs_review_units: [], unresolved_contradictions: [] }))
    const res = await getReviewQueue()
    expect(get).toHaveBeenCalledWith("/v1/trainer/continuity/review-queue", { params: {} })
    expect(res.data).toEqual({ needs_review_units: [], unresolved_contradictions: [] })
  })

  test("getReviewQueue passes org_id when provided", async () => {
    await getReviewQueue("org-1")
    expect(get).toHaveBeenCalledWith("/v1/trainer/continuity/review-queue", {
      params: { org_id: "org-1" },
    })
  })

  test("submitValidation POSTs to /v1/trainer/continuity/units/{unitId}/validations with the body", async () => {
    post.mockResolvedValueOnce(envelope({ id: "unit-1", validity_band: "validated" }))
    const body = {
      validator_user_id: "user-1",
      method: "sme_review" as const,
      verdict: "confirm" as const,
    }
    const res = await submitValidation("unit-1", body)
    expect(post).toHaveBeenCalledWith("/v1/trainer/continuity/units/unit-1/validations", body)
    expect(res.data).toEqual({ id: "unit-1", validity_band: "validated" })
  })

  test("registerAtRiskRole POSTs to /v1/trainer/continuity/risk-register with the body", async () => {
    const body = {
      org_id: "org-1",
      expert_user_id: "expert-1",
      role_title: "Lead Welder",
      exit_risk: 0.8,
      role_criticality: 0.9,
      doc_gap: 0.7,
      bus_factor: 0.6,
    }
    post.mockResolvedValueOnce(envelope({ id: "risk-1", kri: 0.75 }))
    const res = await registerAtRiskRole(body)
    expect(post).toHaveBeenCalledWith("/v1/trainer/continuity/risk-register", body)
    expect(res.data).toEqual({ id: "risk-1", kri: 0.75 })
  })

  test("startCaptureSession POSTs to /v1/trainer/continuity/sessions with the body", async () => {
    const body = {
      org_id: "org-1",
      expert_user_id: "expert-1",
      role_title: "Lead Welder",
      is_synthetic: true,
    }
    post.mockResolvedValueOnce(envelope({ id: "session-1", status: "scheduled", is_synthetic: true }))
    const res = await startCaptureSession(body)
    expect(post).toHaveBeenCalledWith("/v1/trainer/continuity/sessions", body)
    expect(res.data).toEqual({ id: "session-1", status: "scheduled", is_synthetic: true })
  })
})
