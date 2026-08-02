/**
 * @jest-environment jsdom
 *
 * Two things that were both a kind of silence.
 *
 * **Progress recording (stages 2, 3, 4).** These stages rendered real content
 * and never told the journey anything, because only the pages that *write*
 * something called `advance`. The map showed `not_started` for work plainly
 * done, and `nextAction` — the first unstarted stage — sent someone who had
 * reached stage 10 back to stage 0 to "create an account". The rule under test
 * is `produced, not visited`: a page that correctly renders nothing (no PRISM
 * on file, no wage data) must NOT mark its stage done.
 *
 * **The export button.** The backend has composed a 13-section journey document
 * since the vertical shipped, in every format the doc engine supports, and
 * nothing called it.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

/* ── The journey service is the wire; the hooks under test are real ── */
const mockAdvanceJourney = jest.fn()
const mockGetJourney = jest.fn()
const mockGenerateReport = jest.fn()
jest.mock("@/services/direction-setting/journey.service", () => ({
  advanceJourney: (...a: unknown[]) => mockAdvanceJourney(...a),
  getJourney: (...a: unknown[]) => mockGetJourney(...a),
  generateJourneyReport: (...a: unknown[]) => mockGenerateReport(...a),
  resetJourney: jest.fn(),
  getCareerAreas: jest.fn(),
  getStages: jest.fn(),
}))

import { useRecordStageComplete } from "@/hooks/direction-setting/useJourney"

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const journey = (stageStatus: Record<string, string> = {}) => ({
  data: {
    userId: "u1",
    stage: 0,
    status: "in_progress",
    stageStatus,
    stages: [],
    nextAction: { id: "1", name: "Establish", question: "", outcome: "", needs: [], state: "not_started" },
    artefactKeys: [],
    createdAt: null,
    updatedAt: null,
  },
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetJourney.mockResolvedValue(journey())
  mockAdvanceJourney.mockResolvedValue(journey())
})

describe("useRecordStageComplete — produced, not visited", () => {
  test("records the stage once it has produced something", async () => {
    renderHook(() => useRecordStageComplete("3", true), { wrapper })
    await waitFor(() => expect(mockAdvanceJourney).toHaveBeenCalled())
    expect(mockAdvanceJourney).toHaveBeenCalledWith({
      stageId: "3",
      state: "complete",
    })
  })

  test("does NOT record a stage that produced nothing", async () => {
    // Career areas with no PRISM on file: the page renders correctly and
    // explains itself, but there is no outcome, so the stage stays unstarted.
    renderHook(() => useRecordStageComplete("3", false), { wrapper })
    await waitFor(() => expect(mockGetJourney).toHaveBeenCalled())
    expect(mockAdvanceJourney).not.toHaveBeenCalled()
  })

  test("does not re-record a stage that is already complete", async () => {
    mockGetJourney.mockResolvedValue(journey({ "3": "complete" }))
    renderHook(() => useRecordStageComplete("3", true), { wrapper })
    await waitFor(() => expect(mockGetJourney).toHaveBeenCalled())
    // Give the effect a chance to fire before asserting it did not.
    await new Promise((r) => setTimeout(r, 20))
    expect(mockAdvanceJourney).not.toHaveBeenCalled()
  })

  test("writes once even when the consuming page re-renders", async () => {
    const { rerender } = renderHook(() => useRecordStageComplete("4", true), {
      wrapper,
    })
    await waitFor(() => expect(mockAdvanceJourney).toHaveBeenCalledTimes(1))
    rerender()
    rerender()
    await new Promise((r) => setTimeout(r, 20))
    expect(mockAdvanceJourney).toHaveBeenCalledTimes(1)
  })

  test("only ever writes complete — it cannot walk a stage backwards", async () => {
    renderHook(() => useRecordStageComplete("2", true), { wrapper })
    await waitFor(() => expect(mockAdvanceJourney).toHaveBeenCalled())
    for (const call of mockAdvanceJourney.mock.calls) {
      expect(call[0].state).toBe("complete")
    }
  })
})

/* ── The export card ── */
import JourneyPage from "../JourneyPage"

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }))

const renderJourney = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <JourneyPage />
    </QueryClientProvider>
  )

describe("JourneyPage — export", () => {
  beforeEach(() => {
    mockGetJourney.mockResolvedValue({
      data: {
        ...journey().data,
        stages: [
          { id: "0", name: "Land", question: "q", outcome: "o", needs: [], state: "complete" },
          { id: "1", name: "Establish", question: "q", outcome: "o", needs: [], state: "not_started" },
        ],
        stageStatus: { "0": "complete" },
      },
    })
  })

  test("says how much of the document is real before the click", async () => {
    renderJourney()
    expect(await screen.findByText(/take it with you/i)).toBeInTheDocument()
    expect(screen.getByText(/1 of 2 steps/i)).toBeInTheDocument()
  })

  test("downloads the generated file", async () => {
    mockGenerateReport.mockResolvedValue({
      data: {
        downloadUrl: "https://example.test/journey.docx",
        filename: "journey.docx",
        format: "docx",
        contentType: null,
        expiresIn: 900,
        stagesComplete: 1,
        stagesTotal: 13,
      },
    })
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    renderJourney()
    fireEvent.click(await screen.findByRole("button", { name: /download/i }))

    await waitFor(() => expect(mockGenerateReport).toHaveBeenCalledWith("docx"))
    await waitFor(() => expect(click).toHaveBeenCalled())
    click.mockRestore()
  })

  test("asks for the format the user picked", async () => {
    mockGenerateReport.mockResolvedValue({ data: { downloadUrl: "" } })
    renderJourney()
    fireEvent.click(await screen.findByRole("radio", { name: "pdf" }))
    fireEvent.click(screen.getByRole("button", { name: /download/i }))
    await waitFor(() => expect(mockGenerateReport).toHaveBeenCalledWith("pdf"))
  })

  test("a failed generation says so rather than doing nothing", async () => {
    // A silent no-op on a button press is indistinguishable from a dead button.
    mockGenerateReport.mockRejectedValue(new Error("502"))
    renderJourney()
    fireEvent.click(await screen.findByRole("button", { name: /download/i }))
    expect(
      await screen.findByText(/couldn't build the document just now/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/nothing you've done has been lost/i)).toBeInTheDocument()
  })
})
