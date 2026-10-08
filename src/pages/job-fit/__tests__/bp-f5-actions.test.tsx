/**
 * @jest-environment jsdom
 *
 * BP-F5 — the action toolbar on a partial-profile fit. "Write Résumé" builds
 * its strengths from dimensions at or above the benchmark; an unmeasured
 * dimension has no gap, and `null >= 0` is true in JS, so without an explicit
 * filter every unmeasured dimension would be sent as a top strength.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn() }) }))

const mockResume = { mutateAsync: jest.fn(), data: undefined as unknown, isPending: false, isError: false }
jest.mock("@/hooks/job-fit/useWriteResume", () => ({ useWriteResume: () => mockResume }))
const mockSaveReport = { mutateAsync: jest.fn().mockResolvedValue({ id: "snap-1" }), isPending: false }
jest.mock("@/hooks/job-fit/useFitHistory", () => ({ useSaveFitReport: () => mockSaveReport }))

import { FitActionsBar } from "../FitActionsBar"
import type { FitDetail } from "@/types/job-fit"

const PARTIAL: FitDetail = {
  jobId: "j2",
  roleTitle: "Field Service Engineer",
  tier: null,
  baseTier: null,
  totalVariation: 64,
  fitScore: 92,
  dimensionsEvaluated: 2,
  dimensionsTotal: 3,
  coverage: "partial",
  verdictWithheld: true,
  perDimension: [
    { category: "behavior", dimensionId: 6, dimensionName: "Delivering", candidateScore: 80, benchmarkScore: 74, gap: 6, coaching: "", measured: true },
    { category: "behavior", dimensionId: 4, dimensionName: "Coordinating", candidateScore: 55, benchmarkScore: 78, gap: -23, coaching: "", measured: true },
    { category: "aptitude", dimensionId: 2, dimensionName: "Investigative", candidateScore: null, benchmarkScore: 65, gap: null, coaching: "", measured: false },
  ],
  criticalGaps: [],
  coachingGaps: [],
  overdoneFlags: [],
  interviewSelfAdvocacy: [],
  methodologyNote: "",
}

beforeEach(() => jest.clearAllMocks())

test("Write Résumé sends measured strengths only — never an unmeasured dimension", async () => {
  mockResume.mutateAsync.mockResolvedValueOnce(undefined)
  render(<FitActionsBar data={PARTIAL} />)
  fireEvent.click(screen.getByRole("button", { name: /write résumé/i }))
  await waitFor(() => expect(mockResume.mutateAsync).toHaveBeenCalled())
  const body = mockResume.mutateAsync.mock.calls[0][0] as { topDimensions: string[] }
  expect(body.topDimensions).toEqual(["Delivering"])
})

test("Save keeps the withheld tier as null rather than inventing one", async () => {
  render(<FitActionsBar data={PARTIAL} />)
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }))
  await waitFor(() => expect(mockSaveReport.mutateAsync).toHaveBeenCalled())
  const body = mockSaveReport.mutateAsync.mock.calls[0][0] as { tier: unknown; fitScore: number }
  expect(body.tier).toBeNull()
  expect(body.fitScore).toBe(92)
})
