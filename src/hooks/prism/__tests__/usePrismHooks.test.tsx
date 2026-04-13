/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { usePrismHistory } from "../usePrismHistory"
import { usePrismReport } from "../usePrismReport"
import { usePrismInitiate } from "../usePrismInitiate"
import { usePrismUnlock } from "../usePrismUnlock"
import { usePrismUpgrade } from "../usePrismUpgrade"
import {
  getUserAssessments,
  getAssessmentReport,
  initiateAssessment,
  unlockAssessment,
  upgradeAssessment,
} from "@/services/prism/prism.service"

jest.mock("@/services/prism/prism.service", () => ({
  getUserAssessments: jest.fn(),
  getAssessmentReport: jest.fn(),
  getAssessmentStatus: jest.fn(),
  initiateAssessment: jest.fn(),
  unlockAssessment: jest.fn(),
  upgradeAssessment: jest.fn(),
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("PRISM hooks", () => {
  beforeEach(() => jest.clearAllMocks())

  describe("usePrismHistory", () => {
    it("fetches assessments for user", async () => {
      const data = { data: { assessments: [{ id: "a1" }], total: 1 } };
      (getUserAssessments as jest.Mock).mockResolvedValueOnce(data)
      const { result } = renderHook(() => usePrismHistory("u1"), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(getUserAssessments).toHaveBeenCalledWith("u1")
    })

    it("is disabled when userId is null", () => {
      const { result } = renderHook(() => usePrismHistory(null), { wrapper })
      expect(result.current.isFetching).toBe(false)
    })
  })

  describe("usePrismReport", () => {
    it("fetches report when enabled", async () => {
      (getAssessmentReport as jest.Mock).mockResolvedValueOnce({ data: { pdf_url: "http://example.com" } })
      const { result } = renderHook(() => usePrismReport("a1"), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(getAssessmentReport).toHaveBeenCalledWith("a1")
    })

    it("is disabled when assessmentId is null", () => {
      const { result } = renderHook(() => usePrismReport(null), { wrapper })
      expect(result.current.isFetching).toBe(false)
    })
  })

  describe("usePrismInitiate", () => {
    it("calls initiateAssessment", async () => {
      (initiateAssessment as jest.Mock).mockResolvedValueOnce({ data: { assessmentId: "a1" } })
      const { result } = renderHook(() => usePrismInitiate(), { wrapper })
      act(() => { result.current.mutate({ userId: "u1", tier: "standard" } as never) })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(initiateAssessment).toHaveBeenCalled()
    })
  })

  describe("usePrismUnlock", () => {
    it("calls unlockAssessment", async () => {
      (unlockAssessment as jest.Mock).mockResolvedValueOnce({ data: { status: "unlocked" } })
      const { result } = renderHook(() => usePrismUnlock(), { wrapper })
      act(() => { result.current.mutate({ assessmentId: "a1" } as never) })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(unlockAssessment).toHaveBeenCalled()
    })
  })

  describe("usePrismUpgrade", () => {
    it("calls upgradeAssessment", async () => {
      (upgradeAssessment as jest.Mock).mockResolvedValueOnce({ data: { status: "upgrading" } })
      const { result } = renderHook(() => usePrismUpgrade(), { wrapper })
      act(() => { result.current.mutate({ assessmentId: "a1" } as never) })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(upgradeAssessment).toHaveBeenCalled()
    })
  })
})
