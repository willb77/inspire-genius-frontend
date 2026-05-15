/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { jobDnaService } from "../job-dna.service"
import { triageService } from "../triage.service"
import { assessmentService } from "../assessment.service"
import { scorecardService } from "../scorecard.service"
import { analyticsService } from "../analytics.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("job-blueprint services", () => {
  beforeEach(() => jest.clearAllMocks())

  describe("jobDnaService", () => {
    it("create posts to /v1/blueprint/job-dna", async () => {
      mockApi.post.mockResolvedValueOnce({ data: { data: { id: "j1" } } })
      await jobDnaService.create({ title: "Engineer" } as never)
      expect(mockApi.post).toHaveBeenCalledWith("/v1/blueprint/job-dna", { title: "Engineer" })
    })

    it("getById gets by id", async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: { id: "j1" } } })
      await jobDnaService.getById("j1")
      expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/job-dna/j1")
    })

    it("list gets all", async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
      await jobDnaService.list()
      expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/job-dna")
    })

    it("finalizeBenchmark puts benchmark", async () => {
      mockApi.put.mockResolvedValueOnce({ data: { data: {} } })
      await jobDnaService.finalizeBenchmark("j1", { behaviors: [], aptitudes: [], coreTraits: [] })
      expect(mockApi.put).toHaveBeenCalledWith("/v1/blueprint/job-dna/j1/benchmark", expect.any(Object))
    })

    it("generateQuestions posts", async () => {
      mockApi.post.mockResolvedValueOnce({ data: { data: { questions: [] } } })
      await jobDnaService.generateQuestions("j1")
      expect(mockApi.post).toHaveBeenCalledWith("/v1/blueprint/job-dna/j1/questions")
    })
  })

  describe("triageService", () => {
    it("submitIntake posts to /v1/blueprint/triage/intake", async () => {
      mockApi.post.mockResolvedValueOnce({ data: { data: { id: "c1" } } })
      await triageService.submitIntake({ jobId: "j1", name: "John", email: "j@b.com" })
      expect(mockApi.post).toHaveBeenCalledWith("/v1/blueprint/triage/intake", expect.any(Object))
    })

    it("getPipeline gets pipeline", async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
      await triageService.getPipeline("j1")
      expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/triage/pipeline/j1", expect.any(Object))
    })

    it("advanceCandidate posts advance", async () => {
      mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
      await triageService.advanceCandidate("c1")
      expect(mockApi.post).toHaveBeenCalledWith("/v1/blueprint/triage/advance/c1")
    })
  })

  describe("assessmentService", () => {
    it("create posts assessment", async () => {
      mockApi.post.mockResolvedValueOnce({ data: { data: { id: "a1" } } })
      await assessmentService.create({ candidateId: "c1", jobId: "j1" })
      expect(mockApi.post).toHaveBeenCalledWith("/v1/blueprint/assessment", { candidateId: "c1", jobId: "j1" })
    })

    it("submit posts responses", async () => {
      mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
      await assessmentService.submit("a1", [])
      expect(mockApi.post).toHaveBeenCalledWith("/v1/blueprint/assessment/a1/submit", { responses: [] })
    })

    it("getResults gets results", async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: { scores: [] } } })
      await assessmentService.getResults("a1")
      expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/assessment/a1/results")
    })
  })

  describe("scorecardService", () => {
    it("getScorecard gets by candidate", async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
      await scorecardService.getScorecard("c1")
      expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/scorecard/c1")
    })

    it("getInterviewGuide gets by job", async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
      await scorecardService.getInterviewGuide("j1")
      expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/interview-guide/j1")
    })
  })

  describe("analyticsService", () => {
    it("getFunnel gets funnel data", async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
      await analyticsService.getFunnel()
      expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/analytics/funnel")
    })

    it("getStats gets blueprint stats", async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
      await analyticsService.getStats()
      expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/analytics/stats")
    })

    it("getActivity gets with limit", async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
      await analyticsService.getActivity(10)
      expect(mockApi.get).toHaveBeenCalledWith("/v1/blueprint/activity", { params: { limit: 10 } })
    })
  })
})
