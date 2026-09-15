/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"

import { ProfileStudioPanel } from "../ProfileStudioPanel"
import type { BehavioralProfile, FullPrismProfileResponse, PrismDimension } from "@/types/development"

// The contract under test is the ORDER of the panel's refusals and the one
// thing they all protect: no write-up is generated about a person unless
// their own scores are on file and shared. `bestSubject` / `hasScores` are the
// real functions — the branches are only meaningful if they are fed by the
// real subject build. The narrative call and the full-profile read are mocked.

const mockRun = jest.fn()
let narrativePending = false
jest.mock("@/hooks/useTeamStudio", () => ({
  ...jest.requireActual("@/hooks/useTeamStudio"),
  useSubjectNarrative: () => ({ run: mockRun, pending: narrativePending }),
}))

let fullState: { data: FullPrismProfileResponse | null | undefined; isLoading: boolean } = {
  data: null,
  isLoading: false,
}
jest.mock("@/hooks/manager/development/useMemberFullPrism", () => ({
  useMemberFullPrism: () => fullState,
}))

// The export buttons are a probe: they build the doc on click so the test can
// read what the PDF would carry without touching jsPDF.
const builtDocs: unknown[] = []
jest.mock("@/components/prism/narrative/NarrativeExportButtons", () => ({
  __esModule: true,
  default: ({ build }: { build: () => unknown }) => (
    <button type="button" onClick={() => builtDocs.push(build())}>
      Export write-up
    </button>
  ),
}))

// react-markdown is ESM-only and jest's CJS runtime cannot parse it; the
// markdown renderer is not under test, the text reaching it is.
jest.mock("@/components/prism/narrative/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div data-testid="write-up">{text}</div>,
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}))
import { toast } from "sonner"

const prism: PrismDimension[] = [
  { id: 1, label: "Innovating", score: 80, quadrant: 1 },
  { id: 2, label: "Initiating", score: 65, quadrant: 1 },
  { id: 3, label: "Supporting", score: 55, quadrant: 3 },
  { id: 4, label: "Coordinating", score: 70, quadrant: 3 },
  { id: 5, label: "Focusing", score: 60, quadrant: 4 },
  { id: 6, label: "Delivering", score: 75, quadrant: 4 },
  { id: 7, label: "Finishing", score: 50, quadrant: 2 },
  { id: 8, label: "Evaluating", score: 68, quadrant: 2 },
]

const scored: BehavioralProfile = {
  prism,
  reconciliation: { headline: "Structured innovator", throughLine: "", discrepancies: [], confidence: "high" },
  coverage: { prism: true, clifton: false, disc: false },
}

// The TDS-1b redaction: `prism` emptied, `coverage.prism` PRESERVED. Whether a
// PRISM exists is not the secret; its contents are.
const redacted: BehavioralProfile = {
  prism: [],
  reconciliation: { headline: "", throughLine: "", discrepancies: [], confidence: "low" },
  coverage: { prism: true, clifton: false, disc: false },
}

const none: BehavioralProfile = {
  prism: [],
  reconciliation: { headline: "No behavioral data", throughLine: "", discrepancies: [], confidence: "low" },
  coverage: { prism: false, clifton: false, disc: false },
}

function renderPanel(profile: BehavioralProfile, over: { memberName?: string; notShared?: boolean } = {}) {
  return render(
    <ProfileStudioPanel
      memberId="m-1"
      memberName={over.memberName ?? "Gary Burnette"}
      profile={profile}
      notShared={over.notShared}
    />,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  narrativePending = false
  fullState = { data: null, isLoading: false }
  builtDocs.length = 0
})

describe("ProfileStudioPanel — not shared (TDS-1b)", () => {
  it("says the profile is withheld, and offers no write-up", () => {
    renderPanel(redacted, { notShared: true })
    expect(screen.getByTestId("studio-state-not-shared")).toHaveTextContent(
      "Gary Burnette has not shared their PRISM profile with you",
    )
    expect(screen.queryByRole("button", { name: /Write it up/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Behavioural write-up/i)).not.toBeInTheDocument()
  })

  it("never tells the manager to invite a member who already completed PRISM", () => {
    // The defect this branch exists to prevent: with `prism: []` and
    // `coverage.prism: true`, `!scored` alone would say "no PRISM scores on
    // file … Invite them to complete PRISM" about someone who sat it years
    // ago and chose not to share.
    renderPanel(redacted, { notShared: true })
    expect(screen.queryByText(/no PRISM scores on file/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Invite them to complete PRISM/i)).not.toBeInTheDocument()
  })

  it("wins over the scores even when the full profile carries them", () => {
    // Belt and braces: if a future read path ever leaks scores past the
    // redaction, `notShared` still refuses. The grant is the member's, not the
    // data's.
    fullState = {
      data: {
        hasData: true,
        scales: [{ key: "innovating", label: "Innovating", scores: { Underlying: 80 } } as never],
        missing: [],
        coverage: 1,
        fromLegacyRows: false,
        isConflicted: false,
        conflicts: [],
      },
      isLoading: false,
    }
    renderPanel(scored, { notShared: true })
    expect(screen.getByTestId("studio-state-not-shared")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Write it up/i })).not.toBeInTheDocument()
  })

  it("points at the Behavioral Profile tab for the ask, and says asking grants nothing", () => {
    renderPanel(redacted, { notShared: true })
    const p = screen.getByTestId("studio-state-not-shared")
    expect(p).toHaveTextContent(/from the Behavioral Profile tab/i)
    expect(p).toHaveTextContent(/asking grants nothing/i)
  })

  it("does not fire when the grant is live", () => {
    renderPanel(scored)
    expect(screen.queryByTestId("studio-state-not-shared")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Write it up/i })).toBeInTheDocument()
  })
})

describe("ProfileStudioPanel — the other refusals, in order", () => {
  it("a nameless record cannot be written up, whatever else is true", () => {
    renderPanel(scored, { memberName: "   " })
    expect(screen.getByText(/has no name on their record/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Write it up/i })).not.toBeInTheDocument()
  })

  it("a conflicted profile is a refusal, named as a data fault, not 'no scores'", () => {
    fullState = {
      data: {
        hasData: true,
        scales: [],
        missing: [],
        coverage: 0,
        fromLegacyRows: false,
        isConflicted: true,
        conflicts: ["innovating"],
        conflictMessage: "Gary Burnette's assessment records disagree with each other.",
      },
      isLoading: false,
    }
    renderPanel(scored)
    expect(screen.getByText(/assessment records disagree with each other/i)).toBeInTheDocument()
    expect(screen.getByText(/data fault on the member record/i)).toBeInTheDocument()
    expect(screen.queryByText(/no PRISM scores on file/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Write it up/i })).not.toBeInTheDocument()
  })

  it("says it is loading rather than 'no PRISM on file' while the full profile is in flight", () => {
    fullState = { data: undefined, isLoading: true }
    renderPanel(scored)
    expect(screen.getByText(/Loading Gary Burnette's PRISM scores/i)).toBeInTheDocument()
    expect(screen.queryByText(/no PRISM scores on file/i)).not.toBeInTheDocument()
  })

  it("with no PRISM at all, says so and points at the invite", () => {
    renderPanel(none)
    expect(screen.getByText(/has no PRISM scores on file/i)).toBeInTheDocument()
    expect(screen.getByText(/Invite them to complete PRISM/i)).toBeInTheDocument()
    expect(screen.queryByTestId("studio-state-not-shared")).not.toBeInTheDocument()
  })
})

describe("ProfileStudioPanel — generating", () => {
  it("nothing is generated until the manager asks", () => {
    renderPanel(scored)
    expect(mockRun).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: /Export write-up/i })).not.toBeInTheDocument()
  })

  it("sends the member's own scores, under the member's name, and renders the text", async () => {
    mockRun.mockResolvedValue({ text: "Gary leans **analytical**.", notice: "", failed: 0, parts: 1 })
    renderPanel(scored)
    fireEvent.click(screen.getByRole("button", { name: /Write it up/i }))
    await waitFor(() => expect(mockRun).toHaveBeenCalledTimes(1))
    const subject = mockRun.mock.calls[0][0]
    expect(subject.name).toBe("Gary Burnette")
    expect(subject.scores).toMatchObject({ innovating: { Underlying: 80 }, evaluating: { Underlying: 68 } })
    expect(await screen.findByTestId("write-up")).toHaveTextContent("Gary leans **analytical**.")
    expect(screen.getByRole("button", { name: /Write it again/i })).toBeInTheDocument()
  })

  it("prefers the full profile's scales when the read has data", async () => {
    fullState = {
      data: {
        hasData: true,
        scales: [
          { key: "innovating", label: "Innovating", scores: { Underlying: 62, Adapted: 55 } },
          { key: "practical_mechanical", label: "Practical and mechanical", scores: { Underlying: 40 } },
        ] as never,
        missing: [],
        coverage: 2,
        fromLegacyRows: false,
        isConflicted: false,
        conflicts: [],
      },
      isLoading: false,
    }
    mockRun.mockResolvedValue({ text: "ok", notice: "", failed: 0, parts: 1 })
    renderPanel(scored)
    fireEvent.click(screen.getByRole("button", { name: /Write it up/i }))
    await waitFor(() => expect(mockRun).toHaveBeenCalledTimes(1))
    const subject = mockRun.mock.calls[0][0]
    expect(subject.scores).toEqual({
      innovating: { Underlying: 62, Adapted: 55 },
      practical_mechanical: { Underlying: 40 },
    })
  })

  it("warns when sections failed, and the export carries the real-person notice", async () => {
    mockRun.mockResolvedValue({ text: "Partial.", notice: "", failed: 1, parts: 3 })
    renderPanel(scored)
    fireEvent.click(screen.getByRole("button", { name: /Write it up/i }))
    expect(await screen.findByText("Partial.")).toBeInTheDocument()
    expect(toast.warning).toHaveBeenCalledWith("1 of 3 sections failed")
    fireEvent.click(screen.getByRole("button", { name: /Export write-up/i }))
    expect(builtDocs).toHaveLength(1)
    const doc = builtDocs[0] as { title: string; notice: string; meta: { label: string; value: string }[] }
    expect(doc.title).toBe("Gary Burnette")
    expect(doc.notice).not.toBe("")
    expect(doc.meta).toEqual([{ label: "Scales on file", value: "8" }])
  })

  it("keeps the server's notice on the export when it sends one", async () => {
    mockRun.mockResolvedValue({ text: "Text.", notice: "Server caveat.", failed: 0, parts: 1 })
    renderPanel(scored)
    fireEvent.click(screen.getByRole("button", { name: /Write it up/i }))
    expect(await screen.findByText("Text.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Export write-up/i }))
    expect((builtDocs[0] as { notice: string }).notice).toBe("Server caveat.")
  })

  it("reports a failed generation instead of leaving the button spinning", async () => {
    mockRun.mockRejectedValue(new Error("boom"))
    renderPanel(scored)
    fireEvent.click(screen.getByRole("button", { name: /Write it up/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.queryByRole("button", { name: /Export write-up/i })).not.toBeInTheDocument()
  })

  it("disables the button while writing", () => {
    narrativePending = true
    renderPanel(scored)
    expect(screen.getByRole("button", { name: /Writing/i })).toBeDisabled()
  })
})
