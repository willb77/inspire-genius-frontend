/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  initiateAssessment,
  getAssessmentStatus,
  getAssessmentReport,
  getUserAssessments,
  unlockAssessment,
  upgradeAssessment,
  submitQuestionnaireCallback,
} from "../prism.service"

jest.mock("@/lib/axios", () => ({
  api: { post: jest.fn(), get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("prism.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("initiateAssessment posts to /v1/prism/initiate", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { assessmentId: "a1" } } })
    await initiateAssessment({ userId: "u1", tier: "standard" } as never)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/prism/initiate", expect.any(Object))
  })

  it("getAssessmentStatus gets status by id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { status: "pending" } } })
    await getAssessmentStatus("a1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/prism/status/a1")
  })

  it("getAssessmentReport gets report by id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { pdf_url: "http://example.com" } } })
    await getAssessmentReport("a1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/prism/report/a1")
  })

  it("getUserAssessments gets history for user", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { assessments: [], total: 0 } } })
    await getUserAssessments("u1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/prism/history/u1")
  })

  it("unlockAssessment posts to unlock endpoint", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { status: "unlocked" } } })
    await unlockAssessment({ assessmentId: "a1" } as never)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/prism/unlock/a1", expect.any(Object))
  })

  it("upgradeAssessment posts to upgrade endpoint", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { status: "upgrading" } } })
    await upgradeAssessment({ assessmentId: "a1" } as never)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/prism/upgrade/a1", expect.any(Object))
  })

  it("submitQuestionnaireCallback posts assessment id", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { status: "submitted" } } })
    await submitQuestionnaireCallback("a1")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/prism/submit", { assessmentId: "a1" })
  })
})
