/**
 * @jest-environment jsdom
 *
 * Interaction tests for the Job Fit narrative surfaces: the inline follow-up
 * (answer renders IN PLACE) and the action toolbar (copy link, Write Résumé).
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn() }) }))

const mockExplain = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false, data: undefined as unknown }
const mockResume = { mutateAsync: jest.fn(), data: undefined as unknown, isPending: false, isError: false }
jest.mock("@/hooks/job-fit/useExplainFit", () => ({ useExplainFit: () => mockExplain }))
jest.mock("@/hooks/job-fit/useWriteResume", () => ({ useWriteResume: () => mockResume }))

import { FitFollowUpCard } from "../FitFollowUpCard"
import { FitActionsBar } from "../FitActionsBar"
import type { FitDetail } from "@/types/job-fit"

const DATA: FitDetail = {
  jobId: "j1",
  roleTitle: "Operations Program Manager",
  tier: "professional",
  baseTier: "professional",
  totalVariation: 140,
  fitScore: 72,
  perDimension: [
    { category: "behavior", dimensionId: 4, dimensionName: "Coordinating", candidateScore: 55, benchmarkScore: 78, gap: -23, coaching: "x" },
    { category: "behavior", dimensionId: 6, dimensionName: "Delivering", candidateScore: 80, benchmarkScore: 74, gap: 6, coaching: "" },
  ],
  criticalGaps: [{ dimensionName: "Coordinating", category: "behavior", gap: -23 }],
  coachingGaps: [{ dimensionName: "Coordinating", category: "behavior", gap: -23 }],
  overdoneFlags: [],
  interviewSelfAdvocacy: ["Strong delivery follow-through."],
  methodologyNote: "",
}

beforeEach(() => jest.clearAllMocks())

test("follow-up renders the answer inline, in Job Fit", async () => {
  mockExplain.mutateAsync.mockResolvedValueOnce({
    overview: "", gaps: [], closingActions: [], answer: "Focus on coordination first.", fitScore: 72, disclaimer: "",
  })
  render(<FitFollowUpCard data={DATA} />)
  fireEvent.change(screen.getByPlaceholderText(/which gap/i), { target: { value: "What first?" } })
  fireEvent.click(screen.getByRole("button", { name: /ask/i }))
  await waitFor(() => expect(screen.getByText("Focus on coordination first.")).toBeInTheDocument())
  // the question is echoed on-page (accumulated Q&A), i.e. no navigation away
  expect(screen.getByText("What first?")).toBeInTheDocument()
})

test("copy link puts the current URL on the clipboard", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
  render(<FitActionsBar data={DATA} />)
  fireEvent.click(screen.getByRole("button", { name: /copy link/i }))
  await waitFor(() => expect(writeText).toHaveBeenCalled())
})

test("Write Résumé shows the drafted résumé", async () => {
  mockResume.data = { summary: "Operations leader.", strengths: ["Coordination"], suggestedBullets: ["Led a program."], disclaimer: "Draft." }
  mockResume.mutateAsync.mockResolvedValueOnce(mockResume.data)
  render(<FitActionsBar data={DATA} />)
  fireEvent.click(screen.getByRole("button", { name: /write résumé/i }))
  await waitFor(() => expect(screen.getByText("Operations leader.")).toBeInTheDocument())
  expect(screen.getByText("Led a program.")).toBeInTheDocument()
})
