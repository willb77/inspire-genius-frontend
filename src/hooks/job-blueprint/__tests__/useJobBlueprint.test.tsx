/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useJobDnaList, useJobDnaDetail, useCreateJobDna } from "../useJobDna"
import { useBlueprintFunnel, useBlueprintStats } from "../useAnalytics"
import { useAssessmentDetail, useAssessmentStats, useCreateAssessment } from "../useAssessment"
import { useScorecardDetail, useInterviewGuide } from "../useScorecard"
import { usePipeline, usePipelineStats, useSubmitIntake } from "../useTriage"

jest.mock("@/services/job-blueprint", () => ({
  jobDnaService: {
    list: jest.fn().mockResolvedValue({ data: { data: [{ id: "j1" }] } }),
    getById: jest.fn().mockResolvedValue({ data: { data: { id: "j1" } } }),
    create: jest.fn().mockResolvedValue({ data: { data: { id: "j2" } } }),
    update: jest.fn().mockResolvedValue({ data: { data: {} } }),
    finalizeBenchmark: jest.fn().mockResolvedValue({ data: { data: {} } }),
    getBenchmark: jest.fn().mockResolvedValue({ data: { data: {} } }),
    generateQuestions: jest.fn().mockResolvedValue({ data: { data: {} } }),
  },
  analyticsService: {
    getFunnel: jest.fn().mockResolvedValue({ data: { data: [] } }),
    getAccuracy: jest.fn().mockResolvedValue({ data: { data: [] } }),
    getTimeToFill: jest.fn().mockResolvedValue({ data: { data: [] } }),
    getHires: jest.fn().mockResolvedValue({ data: { data: [] } }),
    getStats: jest.fn().mockResolvedValue({ data: { data: { total: 10 } } }),
    getActivity: jest.fn().mockResolvedValue({ data: { data: [] } }),
  },
  assessmentService: {
    getById: jest.fn().mockResolvedValue({ data: { data: { id: "a1" } } }),
    getResults: jest.fn().mockResolvedValue({ data: { data: { scores: [] } } }),
    getStats: jest.fn().mockResolvedValue({ data: { data: { total: 5 } } }),
    create: jest.fn().mockResolvedValue({ data: { data: { id: "a2" } } }),
    submit: jest.fn().mockResolvedValue({ data: { data: {} } }),
  },
  scorecardService: {
    getScorecard: jest.fn().mockResolvedValue({ data: { data: { id: "sc1" } } }),
    getInterviewGuide: jest.fn().mockResolvedValue({ data: { data: { questions: [] } } }),
    submitScorecard: jest.fn().mockResolvedValue({ data: { data: {} } }),
    generateInterviewGuide: jest.fn().mockResolvedValue({ data: { data: {} } }),
  },
  triageService: {
    getPipeline: jest.fn().mockResolvedValue({ data: { data: [{ id: "c1" }] } }),
    getCandidate: jest.fn().mockResolvedValue({ data: { data: {} } }),
    getStats: jest.fn().mockResolvedValue({ data: { data: { total: 3 } } }),
    getInsights: jest.fn().mockResolvedValue({ data: { data: {} } }),
    submitIntake: jest.fn().mockResolvedValue({ data: { data: { id: "c2" } } }),
    advanceCandidate: jest.fn().mockResolvedValue({ data: { data: {} } }),
  },
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("Job Blueprint hooks", () => {
  describe("useJobDna", () => {
    it("useJobDnaList fetches list", async () => {
      const { result } = renderHook(() => useJobDnaList(), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([{ id: "j1" }])
    })

    it("useJobDnaDetail fetches by id", async () => {
      const { result } = renderHook(() => useJobDnaDetail("j1"), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it("useCreateJobDna creates new", async () => {
      const { result } = renderHook(() => useCreateJobDna(), { wrapper })
      act(() => { result.current.mutate({ title: "Engineer" } as never) })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe("useAnalytics", () => {
    it("useBlueprintFunnel fetches funnel", async () => {
      const { result } = renderHook(() => useBlueprintFunnel(), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it("useBlueprintStats fetches stats", async () => {
      const { result } = renderHook(() => useBlueprintStats(), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe("useAssessment", () => {
    it("useAssessmentDetail fetches by id", async () => {
      const { result } = renderHook(() => useAssessmentDetail("a1"), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it("useAssessmentStats fetches stats", async () => {
      const { result } = renderHook(() => useAssessmentStats(), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it("useCreateAssessment creates assessment", async () => {
      const { result } = renderHook(() => useCreateAssessment(), { wrapper })
      act(() => { result.current.mutate({ candidateId: "c1", jobId: "j1" }) })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe("useScorecard", () => {
    it("useScorecardDetail fetches by candidate", async () => {
      const { result } = renderHook(() => useScorecardDetail("c1"), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it("useInterviewGuide fetches by job", async () => {
      const { result } = renderHook(() => useInterviewGuide("j1"), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe("useTriage", () => {
    it("usePipeline fetches pipeline", async () => {
      const { result } = renderHook(() => usePipeline("j1"), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it("usePipelineStats fetches stats", async () => {
      const { result } = renderHook(() => usePipelineStats(), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it("useSubmitIntake submits intake", async () => {
      const { result } = renderHook(() => useSubmitIntake(), { wrapper })
      act(() => { result.current.mutate({ jobId: "j1", name: "John", email: "j@b.com" }) })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})
