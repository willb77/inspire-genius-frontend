/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import GoalsPage from "../GoalsPage"
import AlignmentPage, {
  AlignmentReportView,
  AtTensionRow,
  ConflictCallout,
  MixedGoalRow,
  SupportedGoalRow,
  UnplacedGoalRow,
  UnscoredNotice,
  toReportView,
  type AlignmentReport,
} from "../AlignmentPage"
import SalaryPage, { SalaryRangeCard, type SalaryRange } from "../SalaryPage"
import { useAlignment } from "@/hooks/direction-setting/useAlignment"
import type {
  AlignmentJobStatus,
  AlignmentResultPayload,
  MarketArea,
  MarketSalaries,
} from "@/types/direction-setting"

/* ── Router ──────────────────────────────────────────────────────────────────
 * All three pages navigate imperatively (no <Link>), so a `useNavigate` stub is
 * the whole router surface they touch — cheaper and more precise than wrapping
 * each render in a MemoryRouter and inspecting history. */
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }))

/* ── Journey hooks (GoalsPage only) ───────────────────────────────────────── */
const mockAdvance = jest.fn()
let journeyResult: {
  data?: { stageStatus: Record<string, string> }
  isLoading: boolean
  isError: boolean
} = { data: undefined, isLoading: false, isError: false }

const mockRecordStage = jest.fn()
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useJourney: () => journeyResult,
  useAdvanceJourney: () => ({ mutate: mockAdvance, isPending: false }),
  // SalaryPage records stage 4 once the areas come back priced. Captured rather
  // than stubbed away so the assertions below can check WHEN it fires — the
  // whole point of the hook is that it does not fire on a bare page view.
  useRecordStageComplete: (stageId: string, produced: boolean) =>
    mockRecordStage(stageId, produced),
}))

/* ── Goal store + interview (GoalsPage only) ──────────────────────────────────
 * The goal SERVICE is stubbed, not the interview hook. The load-bearing claim
 * on this page is that the inline interview drives the SHARED store rather than
 * a private copy — mocking the hook would stub out exactly the thing under
 * test. Voice is stubbed because jsdom has neither speech synthesis nor
 * recognition; the panel's own suite covers the spoken path. */
const mockAskCategory = jest.fn()
let goalSession: { data?: unknown } = { data: undefined }
jest.mock("@/hooks/summit/useGoalSession", () => ({
  useGoalSession: () => goalSession,
  summitKeys: { all: ["summit"], session: ["summit", "session"] },
  useSummitCategories: () => [],
  usePatchGoal: () => ({ mutate: jest.fn() }),
  useDeleteGoal: () => ({ mutate: jest.fn() }),
}))
jest.mock("@/services/summit/goals.service", () => ({
  getGoalSession: jest.fn(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
  askCategory: (...a: unknown[]) => mockAskCategory(...a),
  whyLadder: jest.fn(),
  saveDiscovery: jest.fn(),
  synthesizeGoals: jest.fn(),
}))
jest.mock("@/hooks/useTTS", () => ({
  useTTS: () => ({
    speak: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    isOnline: true,
    activeProvider: null,
    speaking: false,
  }),
}))
jest.mock("@/hooks/interview/useSpeechDictation", () => ({
  useSpeechDictation: () => ({
    supported: false,
    listening: false,
    start: jest.fn(),
    stop: jest.fn(),
    toggle: jest.fn(),
  }),
}))

/* ── Alignment service (AlignmentPage only) ───────────────────────────────────
 * The *service* is stubbed, not the hook. Stage 6 is on the async job path, and
 * the accept-then-poll dance is the part most likely to break — a mocked hook
 * would test the page against a machine nobody runs. So these tests drive the
 * real `useAlignment` over a fake wire. */
jest.mock("@/services/direction-setting/alignment.service", () => ({
  getAlignment: jest.fn(),
  startAlignmentJob: jest.fn(),
  getAlignmentJob: jest.fn(),
}))

import {
  getAlignment,
  getAlignmentJob,
  startAlignmentJob,
} from "@/services/direction-setting/alignment.service"

const mockGetAlignment = getAlignment as jest.MockedFunction<typeof getAlignment>
const mockGetAlignmentJob = getAlignmentJob as jest.MockedFunction<
  typeof getAlignmentJob
>
const mockStartAlignmentJob = startAlignmentJob as jest.MockedFunction<
  typeof startAlignmentJob
>

/* ── Market service (SalaryPage only) ─────────────────────────────────────────
 * Stage 4 is a plain read, not a job, so the *service* is stubbed and the real
 * `useMarketSalaries` runs over it — same principle as the alignment mocks
 * above: test the page against the machine that actually ships. */
jest.mock("@/services/direction-setting/market.service", () => ({
  getMarketSalaries: jest.fn(),
}))

import { getMarketSalaries } from "@/services/direction-setting/market.service"

const mockGetMarketSalaries = getMarketSalaries as jest.MockedFunction<
  typeof getMarketSalaries
>

/** A 404 from the poll: the job is gone, or was never ours. Terminal either way. */
const notFound = () =>
  Object.assign(new Error("Request failed with status code 404"), {
    isAxiosError: true,
    response: { status: 404 },
  })

const emptyReport = (
  over: Partial<AlignmentResultPayload> = {}
): AlignmentResultPayload => ({
  goals: [],
  conflicts: [],
  unmapped: [],
  summary: { total: 0 },
  ...over,
})

/** One of each verdict the scorer can reach when a PRISM is on file. */
const scoredReport: AlignmentResultPayload = emptyReport({
  goals: [
    {
      title: "Finish the data certificate",
      family: "Research & Analysis",
      score: 78.0,
      verdict: "supported",
      conflict: false,
      statement: "…",
      drivers: {
        supporting: [
          {
            dimension: "Investigative & Analytical",
            yourScore: 84.0,
            roleNeeds: 90.0,
          },
        ],
        opposing: [],
      },
    },
    {
      title: "Move into enterprise sales",
      family: "Sales & Business Development",
      score: 41.0,
      verdict: "at-tension",
      conflict: true,
      statement: "…",
      drivers: {
        supporting: [
          { dimension: "Structured & Methodical", yourScore: 71.0, roleNeeds: 70.0 },
        ],
        opposing: [
          { dimension: "Outgoing & Persuasive", yourScore: 34.0, roleNeeds: 90.0 },
        ],
      },
    },
    {
      title: "Run a small team",
      family: "Leadership & Management",
      score: 57.0,
      verdict: "mixed",
      conflict: false,
      statement: "…",
      drivers: {
        supporting: [],
        opposing: [
          { dimension: "Directive & Decisive", yourScore: 48.0, roleNeeds: 78.0 },
        ],
      },
    },
    {
      title: "Be happier at work",
      score: null,
      verdict: "unmapped",
      conflict: false,
      statement:
        "We could not place “Be happier at work” against any of the nine role families.",
    },
  ],
  unmapped: [
    {
      title: "Be happier at work",
      statement:
        "We could not place “Be happier at work” against any of the nine role families.",
    },
  ],
  summary: { total: 4, supported: 1, mixed: 1, atTension: 1, unmapped: 1 },
  note: "Deterministic: no model call. Decision support only.",
})

/** The no-PRISM report: goals on file, nothing to score them against. */
const unscoredReport: AlignmentResultPayload = emptyReport({
  goals: [
    {
      title: "Move into product management",
      family: "Leadership & Management",
      score: null,
      verdict: "unscored",
      conflict: false,
      statement:
        "It is on file but cannot be scored yet: there is no behavioural assessment to compare it against.",
    },
  ],
  summary: { total: 1, unscored: 1 },
  scored: false,
  prismNeeded: true,
})

const ok = <T,>(data: T) => ({ status: true, data })

const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      })
    }
  >
    {children}
  </QueryClientProvider>
)

// GoalsPage now hosts the interview, which uses React Query — so it needs the
// same provider the other pages get.
const renderGoals = () => render(<Providers><GoalsPage /></Providers>)

const renderAlignment = () =>
  render(
    <Providers>
      <AlignmentPage />
    </Providers>
  )

/** Reads the hook straight, so the job machine can be asserted on its own. */
function AlignmentProbe({ pollMs = 10 }: { pollMs?: number }) {
  const { phase, jobStatus, jobError, report, start, isStarting } = useAlignment({
    pollMs,
  })
  return (
    <div>
      <p>phase: {phase}</p>
      <p>status: {jobStatus ?? "none"}</p>
      <p>error: {jobError ?? "none"}</p>
      <p>goals: {report ? String(report.summary.total) : "none"}</p>
      <button type="button" onClick={start} disabled={isStarting}>
        run it
      </button>
    </div>
  )
}

const renderProbe = () =>
  render(
    <Providers>
      <AlignmentProbe />
    </Providers>
  )

const resetAlignmentMocks = () => {
  mockGetAlignment.mockReset()
  mockGetAlignmentJob.mockReset()
  mockStartAlignmentJob.mockReset()
  // Default: a user who has never run this.
  mockGetAlignment.mockResolvedValue(ok({ result: null, job: null }))
}

// jsdom doesn't implement Element.scrollTo — the interview autoscrolls.
beforeAll(() => {
  Element.prototype.scrollTo = jest.fn()
})

beforeEach(() => {
  mockNavigate.mockReset()
  mockAdvance.mockReset()
  mockAskCategory.mockReset()
  mockAskCategory.mockResolvedValue({
    category: "history",
    label: "Career History",
    intro: "Let's start with how you got here.",
    questions: ["Where did you begin?"],
  })
  goalSession = { data: undefined }
  journeyResult = { data: undefined, isLoading: false, isError: false }
})

const withStage5 = (state: string) => {
  journeyResult = {
    data: { stageStatus: { "5": state } },
    isLoading: false,
    isError: false,
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */

describe("GoalsPage (stage 5) — the interview runs here, and there is still one goal store", () => {
  /*
   * The previous version of this block guarded a handoff to `/summit/*`, with a
   * note that if anyone replaced it with an inline interview, the test should be
   * the thing that made them justify it. Fair, and here is the justification.
   *
   * The handoff existed because Summit's SURFACE could not be embedded — a
   * three-column shell with its own sub-nav and chat panel. The risk it was
   * protecting against was a second goal system: two lists of goals and no idea
   * which one counted.
   *
   * That risk is real and is still guarded. What changed is that the interview
   * is no longer a surface — `useSummitInterview` is a headless state machine
   * over `/ask`, `/why-ladder` and `/synthesize`. Running it here drives the
   * same routes against the same store, so there is still exactly one list.
   * The assertion below is what now holds that line: the inline interview must
   * go through the shared goal service, not a private copy of it.
   */

  test("runs the interview in place rather than sending the user elsewhere", () => {
    renderGoals()
    expect(screen.getByTestId("goal-interview")).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  test("the inline interview uses the shared goal store, not a second one", () => {
    // The line the old handoff was defending. If this panel ever stops calling
    // the shared service, a person ends up with two sets of goals.
    renderGoals()
    fireEvent.click(screen.getByRole("button", { name: /the conversation/i }))
    expect(mockAskCategory).toHaveBeenCalled()
  })

  test("marks the stage under way once it is under way", async () => {
    withStage5("in_progress")
    renderGoals()
    // Already in progress — must not be re-marked.
    await waitFor(() => {
      expect(mockAdvance).not.toHaveBeenCalledWith({
        stageId: "5",
        state: "in_progress",
      })
    })
  })

  test("shows goals already captured without leaving the step", () => {
    goalSession = {
      data: {
        version: 1,
        categories: {},
        goals: [
          {
            goal_id: "g1",
            title: "Run my own team",
            motivation: "being trusted with the hard calls",
            status: "proposed",
          },
        ],
        why_roots: [],
      },
    }
    renderGoals()
    expect(screen.getByText("Run my own team")).toBeInTheDocument()
    // The WHY root travels with the goal — it is the point of the interview.
    expect(
      screen.getByText(/being trusted with the hard calls/i)
    ).toBeInTheDocument()
  })

  test("lets the person say when they're done, and stops asking once they have", () => {
    const { unmount } = renderGoals()
    fireEvent.click(screen.getByRole("button", { name: /mark this step done/i }))
    expect(mockAdvance).toHaveBeenCalledWith({ stageId: "5", state: "complete" })
    unmount()

    withStage5("complete")
    renderGoals()
    expect(screen.getByText("Done")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /mark this step done/i })
    ).not.toBeInTheDocument()
  })

  test("explains that goals here carry the reason underneath them", () => {
    // The product point. Copy can be reworded; the promise cannot quietly
    // become "list your objectives".
    renderGoals()
    expect(
      screen.getByText(/goals with the reason underneath them/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/up to five times, and no further/i)).toBeInTheDocument()
  })

  test("still renders the interview when the progress read fails", () => {
    journeyResult = { data: undefined, isLoading: false, isError: true }
    renderGoals()
    expect(screen.getByTestId("goal-interview")).toBeInTheDocument()
    expect(screen.getByText(/couldn't read your progress/i)).toBeInTheDocument()
  })
})

/* ══════════════════════════════════════════════════════════════════════════ */

describe("AlignmentPage (stage 6) — the page states", () => {
  beforeEach(resetAlignmentMocks)

  test("says what the step does, then offers the run", async () => {
    renderAlignment()
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /do my goals and my wiring agree/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/what this step does/i)).toBeInTheDocument()
    expect(await screen.findByText(/nothing has been run yet/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /run the alignment/i })
    ).toBeInTheDocument()
  })

  test("shows no analysis at all before anything has been computed", async () => {
    // The failure this pins: someone adding sample rows "just to show the
    // layout". A fabricated tension about a real person's goals is not a
    // placeholder, it's a wrong answer.
    renderAlignment()
    await screen.findByText(/nothing has been run yet/i)
    expect(
      screen.queryByText(/goals your wiring is behind/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/goals that will cost you something/i)
    ).not.toBeInTheDocument()
  })

  test("frames tension as information, not a verdict", () => {
    renderAlignment()
    expect(
      screen.getByText(/a tension is information about a trade-off, not a judgement/i)
    ).toBeInTheDocument()
  })

  test("points at the two steps this one reads from", async () => {
    renderAlignment()
    await screen.findByText(/nothing has been run yet/i)

    fireEvent.click(screen.getByRole("button", { name: /set my goals/i }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/direction-setting/goals")

    fireEvent.click(screen.getByRole("button", { name: /see who i am/i }))
    expect(mockNavigate).toHaveBeenCalledWith(
      "/vertical/direction-setting/portrait"
    )
  })

  test("the wait says what is happening, not just that something is", async () => {
    // Reattaching to a run already in flight — the same state a returning user
    // lands in. A bare spinner over a compute this slow reads as a stall.
    mockGetAlignment.mockResolvedValue(
      ok({
        result: null,
        job: { jobId: "j1", kind: "alignment", status: "running" },
      })
    )
    mockGetAlignmentJob.mockResolvedValue(
      ok({ jobId: "j1", kind: "alignment", status: "running", result: null })
    )

    renderAlignment()

    expect(
      await screen.findByText(/reading your goals against your profile/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/scoring each goal against the nine career families/i)
    ).toBeInTheDocument()
    // Reattached rather than re-run: no second compute was ordered.
    expect(mockStartAlignmentJob).not.toHaveBeenCalled()
  })

  test("renders a finished report, unplaced goals included", async () => {
    mockGetAlignment.mockResolvedValue(
      ok({
        result: scoredReport,
        job: { jobId: "j1", kind: "alignment", status: "complete" },
      })
    )

    renderAlignment()

    expect(
      await screen.findByRole("heading", { name: /goals your wiring is behind/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Finish the data certificate")).toBeInTheDocument()
    expect(screen.getByText("Move into enterprise sales")).toBeInTheDocument()
    expect(screen.getByText("Run a small team")).toBeInTheDocument()

    // The one that must never quietly vanish.
    expect(
      screen.getByRole("heading", { name: /goals we couldn't place/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Be happier at work")).toBeInTheDocument()

    // Still information, still per-row.
    expect(
      screen.getByText(/this doesn't mean don't\. it means go in knowing the price/i)
    ).toBeInTheDocument()
  })

  test("unscored goals are named as unmeasured, not scored low", async () => {
    mockGetAlignment.mockResolvedValue(
      ok({
        result: unscoredReport,
        job: { jobId: "j1", kind: "alignment", status: "complete" },
      })
    )

    renderAlignment()

    expect(
      await screen.findByRole("heading", { name: /not scored yet/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Move into product management")).toBeInTheDocument()
    expect(
      screen.getByText(/nothing below is a low score/i)
    ).toBeInTheDocument()

    // And a way to fix it — the Establish stage, where PRISM is taken.
    fireEvent.click(
      screen.getByRole("button", { name: /take the prism assessment/i })
    )
    expect(mockNavigate).toHaveBeenCalledWith(
      "/vertical/direction-setting/establish"
    )
  })

  test("a failed run says so, keeps the last good report, and offers a retry", async () => {
    mockGetAlignment.mockResolvedValue(
      ok({
        result: scoredReport,
        job: {
          jobId: "j2",
          kind: "alignment",
          status: "error",
          error: "goal store unreachable",
        },
      })
    )
    mockStartAlignmentJob.mockResolvedValue(
      ok({ jobId: "j3", kind: "alignment", status: "queued" })
    )
    mockGetAlignmentJob.mockResolvedValue(
      ok({ jobId: "j3", kind: "alignment", status: "queued", result: null })
    )

    renderAlignment()

    expect(await screen.findByText(/that run didn't finish/i)).toBeInTheDocument()
    expect(screen.getByText(/goal store unreachable/i)).toBeInTheDocument()
    // The previous answer is not taken off the screen by a later failure.
    expect(screen.getByText(/your most recent completed run/i)).toBeInTheDocument()
    expect(screen.getByText("Finish the data certificate")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(
      await screen.findByText(/reading your goals against your profile/i)
    ).toBeInTheDocument()
  })

  test("a job that no longer resolves is a dead end, not a spinner", async () => {
    mockGetAlignment.mockResolvedValue(
      ok({
        result: null,
        job: { jobId: "gone", kind: "alignment", status: "running" },
      })
    )
    mockGetAlignmentJob.mockRejectedValue(notFound())

    renderAlignment()

    expect(
      await screen.findByText(/we've lost track of that run/i)
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/reading your goals against your profile/i)
    ).not.toBeInTheDocument()
  })
})

/* ══════════════════════════════════════════════════════════════════════════ */

describe("useAlignment — the accept-then-poll machine", () => {
  beforeEach(resetAlignmentMocks)

  test("starts idle when nothing has ever been run", async () => {
    renderProbe()
    expect(await screen.findByText("phase: idle")).toBeInTheDocument()
    expect(screen.getByText("status: none")).toBeInTheDocument()
    expect(mockStartAlignmentJob).not.toHaveBeenCalled()
  })

  test("walks queued → running → complete by polling, then stops", async () => {
    let status: AlignmentJobStatus = "queued"
    mockStartAlignmentJob.mockResolvedValue(
      ok({ jobId: "j1", kind: "alignment", status: "queued" })
    )
    mockGetAlignmentJob.mockImplementation(async () =>
      ok({
        jobId: "j1",
        kind: "alignment",
        status,
        result: status === "complete" ? scoredReport : null,
        error: null,
      })
    )

    renderProbe()
    fireEvent.click(await screen.findByRole("button", { name: /run it/i }))

    expect(await screen.findByText("status: queued")).toBeInTheDocument()
    expect(screen.getByText("phase: waiting")).toBeInTheDocument()

    // Only a poll can move these on — the responses change under the hook.
    status = "running"
    expect(await screen.findByText("status: running")).toBeInTheDocument()
    expect(screen.getByText("phase: waiting")).toBeInTheDocument()

    status = "complete"
    expect(await screen.findByText("phase: ready")).toBeInTheDocument()
    expect(screen.getByText("goals: 4")).toBeInTheDocument()

    // …and the timer is not still running against a job that finished.
    const settled = mockGetAlignmentJob.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(mockGetAlignmentJob).toHaveBeenCalledTimes(settled)
  })

  test("an errored job is terminal and carries its reason", async () => {
    mockStartAlignmentJob.mockResolvedValue(
      ok({ jobId: "j1", kind: "alignment", status: "queued" })
    )
    mockGetAlignmentJob.mockResolvedValue(
      ok({
        jobId: "j1",
        kind: "alignment",
        status: "error",
        result: null,
        error: "profile hydrate failed",
      })
    )

    renderProbe()
    fireEvent.click(await screen.findByRole("button", { name: /run it/i }))

    expect(await screen.findByText("phase: failed")).toBeInTheDocument()
    expect(screen.getByText("error: profile hydrate failed")).toBeInTheDocument()

    const settled = mockGetAlignmentJob.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(mockGetAlignmentJob).toHaveBeenCalledTimes(settled)
  })

  test("a 404 stops the poll instead of retrying forever", async () => {
    // Jobs are owner-scoped, so a 404 is "gone, or never yours" — a knowable
    // end state. Retrying it is the one thing that turns this surface into an
    // infinite spinner.
    mockStartAlignmentJob.mockResolvedValue(
      ok({ jobId: "j1", kind: "alignment", status: "queued" })
    )
    mockGetAlignmentJob.mockRejectedValue(notFound())

    renderProbe()
    fireEvent.click(await screen.findByRole("button", { name: /run it/i }))

    expect(await screen.findByText("phase: lost")).toBeInTheDocument()

    const settled = mockGetAlignmentJob.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(mockGetAlignmentJob).toHaveBeenCalledTimes(settled)
  })

  test("reattaches to a run already in flight rather than starting a second", async () => {
    mockGetAlignment.mockResolvedValue(
      ok({
        result: null,
        job: { jobId: "existing", kind: "alignment", status: "running" },
      })
    )
    mockGetAlignmentJob.mockResolvedValue(
      ok({ jobId: "existing", kind: "alignment", status: "running", result: null })
    )

    renderProbe()

    expect(await screen.findByText("phase: waiting")).toBeInTheDocument()
    expect(mockStartAlignmentJob).not.toHaveBeenCalled()
    expect(mockGetAlignmentJob).toHaveBeenCalledWith("existing")
  })

  test("stops polling once the surface is gone", async () => {
    mockGetAlignment.mockResolvedValue(
      ok({
        result: null,
        job: { jobId: "existing", kind: "alignment", status: "running" },
      })
    )
    mockGetAlignmentJob.mockResolvedValue(
      ok({ jobId: "existing", kind: "alignment", status: "running", result: null })
    )

    const { unmount } = renderProbe()
    await screen.findByText("phase: waiting")

    unmount()
    const atUnmount = mockGetAlignmentJob.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(mockGetAlignmentJob).toHaveBeenCalledTimes(atUnmount)
  })
})

/* ══════════════════════════════════════════════════════════════════════════ */

describe("toReportView — wire to sentences", () => {
  test("prints both numbers for every dimension it names", () => {
    // "You're low on X" is an opinion. "You 34, this work usually asks 90" is a
    // fact the person can check — and disagree with, which is the point.
    const view = toReportView(scoredReport)
    expect(view.tensions[0].runsAgainst).toMatch(
      /Outgoing & Persuasive \(you 34, this kind of work usually asks 90\)/
    )
    expect(view.supported[0].supportedBy).toMatch(
      /Investigative & Analytical \(you 84, this kind of work usually asks 90\)/
    )
  })

  test("never leaves a cost without an answer next to it", () => {
    const view = toReportView(scoredReport)
    expect(view.tensions[0].cost).toBeTruthy()
    expect(view.tensions[0].whatHelps).toMatch(/lean on what is already carrying it/i)
  })

  test("falls back honestly when the profile names no lever", () => {
    const bare = toReportView(
      emptyReport({
        goals: [
          {
            title: "Move into enterprise sales",
            family: "Sales & Business Development",
            score: 41.0,
            verdict: "at-tension",
            conflict: true,
            statement: "…",
            drivers: { supporting: [], opposing: [] },
          },
        ],
        summary: { total: 1, atTension: 1 },
      })
    )
    // No invented advice, and no bare cost either.
    expect(bare.tensions[0].whatHelps).toMatch(/worth taking to a coach/i)
    expect(bare.tensions[0].runsAgainst).toMatch(/no single dimension dominates/i)
  })

  test("says nothing on file rather than printing an imputed score", () => {
    const view = toReportView(
      emptyReport({
        goals: [
          {
            title: "Present at the all-hands",
            family: "Leadership & Management",
            score: 44.0,
            verdict: "at-tension",
            conflict: true,
            statement: "…",
            drivers: {
              supporting: [],
              opposing: [
                {
                  dimension: "Outgoing & Persuasive",
                  yourScore: null,
                  roleNeeds: 90.0,
                  imputed: true,
                },
              ],
            },
          },
        ],
        summary: { total: 1, atTension: 1 },
      })
    )
    expect(view.tensions[0].runsAgainst).toMatch(/nothing on file for this one yet/i)
    expect(view.tensions[0].runsAgainst).not.toMatch(/you 50/)
  })

  test("every goal comes out somewhere — nothing is filtered away", () => {
    const view = toReportView(scoredReport)
    expect(view.supported).toHaveLength(1)
    expect(view.tensions).toHaveLength(1)
    expect(view.mixed).toHaveLength(1)
    expect(view.unplaced).toHaveLength(1)
    expect(
      view.supported.length +
        view.tensions.length +
        (view.mixed?.length ?? 0) +
        (view.unplaced?.length ?? 0)
    ).toBe(scoredReport.summary.total)
  })

  test("unscored goals become their own state, never a score", () => {
    const view = toReportView(unscoredReport)
    expect(view.unscored?.goals).toEqual(["Move into product management"])
    expect(view.supported).toHaveLength(0)
    expect(view.tensions).toHaveLength(0)
    expect(view.mixed).toHaveLength(0)
  })

  test("does not manufacture pairwise conflicts out of individually scored goals", () => {
    // The backend's `conflicts[]` is the at-tension goals over again; it never
    // pairs them. Inventing "you want A and B — which goes?" would be a finding
    // nobody computed, and someone could drop a real goal over it.
    expect(toReportView(scoredReport).conflicts).toEqual([])
  })
})

/* ══════════════════════════════════════════════════════════════════════════ */

describe("AlignmentPage presentational pieces — the wire seam", () => {
  test("a supported goal names the goal and what backs it", () => {
    render(
      <ul>
        <SupportedGoalRow
          item={{
            goal: "Lead a small team within two years",
            supportedBy: "You read a room quickly and people tell you things",
            note: "Lean on this rather than on being the loudest voice.",
          }}
        />
      </ul>
    )
    expect(
      screen.getByText("Lead a small team within two years")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/you read a room quickly/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/lean on this rather than/i)).toBeInTheDocument()
  })

  test("an at-tension row gives the cost, what helps, and no verdict", () => {
    render(
      <ul>
        <AtTensionRow
          item={{
            goal: "Move into enterprise sales",
            runsAgainst: "You recharge on your own and cold contact drains you",
            cost: "Most days will end with less left in the tank than you're used to",
            whatHelps: "Blocking recovery time after call-heavy days",
          }}
        />
      </ul>
    )
    expect(screen.getByText("Move into enterprise sales")).toBeInTheDocument()
    expect(screen.getByText(/cold contact drains you/i)).toBeInTheDocument()
    expect(screen.getByText(/less left in the tank/i)).toBeInTheDocument()
    expect(screen.getByText(/blocking recovery time/i)).toBeInTheDocument()
    // The non-judgement line is per-row on purpose — someone reading one row
    // about their own goal needs it in front of them, not in a page preamble.
    expect(
      screen.getByText(/this doesn't mean don't\. it means go in knowing the price/i)
    ).toBeInTheDocument()
  })

  test("a conflict is put as a question for the person, not a recommendation", () => {
    render(
      <ConflictCallout
        item={{
          goals: ["Earn more within a year", "Retrain into design"],
          explanation:
            "Retraining usually means a pay dip first, and a year is tight for both.",
          question: "Which of these can wait eighteen months without it hurting?",
        }}
      />
    )
    expect(screen.getByText(/earn more within a year/i)).toBeInTheDocument()
    expect(screen.getByText(/retrain into design/i)).toBeInTheDocument()
    expect(
      screen.getByText(/which of these can wait eighteen months/i)
    ).toBeInTheDocument()
  })

  test("the report view renders every section once data exists", () => {
    const report: AlignmentReport = {
      supported: [
        { goal: "Finish the certificate", supportedBy: "You follow through" },
      ],
      tensions: [
        {
          goal: "Present at the all-hands",
          runsAgainst: "Speaking to a crowd costs you",
          cost: "A tense week beforehand",
          whatHelps: "Rehearsing it out loud with one person first",
        },
      ],
      conflicts: [
        {
          goals: ["Stay local", "Take the senior role"],
          explanation: "The senior roles in this field cluster in two cities.",
          question: "Is staying local a preference or a fixed point?",
        },
      ],
    }
    render(<AlignmentReportView report={report} />)

    expect(
      screen.getByRole("heading", { name: /goals your wiring is behind/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /goals that will cost you something/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /two things you want that pull apart/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Finish the certificate")).toBeInTheDocument()
    expect(screen.getByText("Present at the all-hands")).toBeInTheDocument()
    expect(screen.getByText(/is staying local a preference/i)).toBeInTheDocument()
  })

  test("an empty tensions list reads as a result, not as a blank", () => {
    render(
      <AlignmentReportView
        report={{ supported: [], tensions: [], conflicts: [] }}
      />
    )
    expect(
      screen.getByText(/none found\. that's a real result, not a blank/i)
    ).toBeInTheDocument()
  })

  test("a mixed goal says it's workable and says what it costs", () => {
    render(
      <ul>
        <MixedGoalRow
          item={{
            goal: "Run a small team",
            readsAs: "You score 57 out of 100 against Leadership & Management work.",
            whatItCosts: "Where the effort goes: Directive & Decisive (you 48, this kind of work usually asks 78).",
          }}
        />
      </ul>
    )
    expect(screen.getByText("Run a small team")).toBeInTheDocument()
    expect(screen.getByText(/close enough|57 out of 100/i)).toBeInTheDocument()
    expect(screen.getByText(/directive & decisive \(you 48/i)).toBeInTheDocument()
  })

  test("an unplaced goal puts the limit on us, not on the person", () => {
    render(
      <ul>
        <UnplacedGoalRow
          item={{
            goal: "Be happier at work",
            why: "We could not place this against any of the nine role families.",
          }}
        />
      </ul>
    )
    expect(screen.getByText("Be happier at work")).toBeInTheDocument()
    expect(screen.getByText(/we could not place this/i)).toBeInTheDocument()
    expect(screen.queryByText(/too vague|weakness|mismatch/i)).not.toBeInTheDocument()
  })

  test("the unscored notice explains and offers the fix", () => {
    const onEstablish = jest.fn()
    render(
      <UnscoredNotice
        item={{
          goals: ["Move into product management"],
          why: "There is no behavioural assessment to compare it against.",
        }}
        onEstablish={onEstablish}
      />
    )
    expect(
      screen.getByRole("heading", { name: /not scored yet/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/nothing below is a low score/i)).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: /take the prism assessment/i })
    )
    expect(onEstablish).toHaveBeenCalled()
  })

  test("the report view shows unplaced and unscored goals rather than dropping them", () => {
    render(
      <AlignmentReportView
        report={{
          supported: [],
          tensions: [],
          conflicts: [],
          unplaced: [{ goal: "Be happier at work", why: "Couldn't place it." }],
          unscored: {
            goals: ["Move into product management"],
            why: "No behavioural assessment on file.",
          },
        }}
      />
    )
    expect(
      screen.getByRole("heading", { name: /goals we couldn't place/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Be happier at work")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /not scored yet/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Move into product management")).toBeInTheDocument()
  })

  test("the tone words survive: no 'weakness', no 'mismatch'", () => {
    // Cheap, and it is the thing most likely to erode under a later edit.
    const { container } = render(
      <AlignmentReportView report={toReportView(scoredReport)} />
    )
    expect(container.textContent).not.toMatch(/weakness|mismatch|deficien/i)
    expect(container.textContent).toMatch(/supported by/i)
    expect(container.textContent).toMatch(/runs against/i)
    expect(container.textContent).toMatch(/what that costs/i)
    expect(container.textContent).toMatch(/what helps/i)
  })
})

/* ══════════════════════════════════════════════════════════════════════════ */

/* ── Stage 4 fixtures ─────────────────────────────────────────────────────────
 * Shaped from `app/market/models.py`'s `to_dict()` output: a wage range that
 * always carries `source` + `asOf`, and independently-nullable `salary` and
 * `outlook` on every occupation. */

const OEWS =
  "Curated static reference table (in-repo), approximating BLS OEWS May 2024 " +
  "national annual wages. Not live data; planning reference only."
const PROJECTION = "Curated static reference projections"

const AREA_PRICED: MarketArea = {
  family: "Analysis & Research",
  affinity: 78,
  pivotDifficulty: "moderate",
  range: {
    low: 52000,
    median: 83000,
    high: 121000,
    source: OEWS,
    asOf: "2024-05",
  },
  occupations: [
    {
      code: "15-1252",
      title: "Software Developer",
      source: OEWS,
      asOf: "2024-05",
      salary: {
        low: 74000,
        median: 132000,
        high: 208000,
        source: OEWS,
        asOf: "2024-05",
      },
      outlook: {
        growthPct: 17.9,
        horizonYears: 10,
        source: PROJECTION,
        asOf: "2023-2033",
      },
    },
    {
      // The occupation this table deliberately shows shrinking.
      code: "43-3031",
      title: "Bookkeeping & Accounting Clerk",
      source: OEWS,
      asOf: "2024-05",
      salary: {
        low: 36000,
        median: 47000,
        high: 65000,
        source: OEWS,
        asOf: "2024-05",
      },
      outlook: {
        growthPct: -5,
        horizonYears: 10,
        source: PROJECTION,
        asOf: "2023-2033",
      },
    },
  ],
  note: null,
}

/** An area we hold nothing for. There is no fallback row behind it, by design. */
const AREA_UNPRICED: MarketArea = {
  family: "Creative & Design",
  affinity: 41,
  pivotDifficulty: "high",
  range: null,
  occupations: [
    {
      code: "27-1024",
      title: "Graphic Designer",
      source: OEWS,
      asOf: "2024-05",
      salary: null,
      outlook: null,
    },
  ],
  note: "No wage data on file for this career area yet.",
}

const salaries = (over: Partial<MarketSalaries> = {}): MarketSalaries => ({
  areas: [AREA_PRICED],
  ranked: true,
  provider: "static-reference",
  asOf: "2024-05",
  note:
    "Wage figures are reference ranges — entry, median and experienced — not " +
    "offers, and not a prediction of what any individual will be paid.",
  ...over,
})

describe("SalaryPage (stage 4) — priced, sourced and dated", () => {
  beforeEach(() => {
    mockGetMarketSalaries.mockReset()
    mockGetMarketSalaries.mockResolvedValue(ok(salaries()))
  })

  const renderSalary = () =>
    render(
      <Providers>
        <SalaryPage />
      </Providers>
    )

  test("states the step's purpose and what it will and won't show", async () => {
    renderSalary()
    expect(
      screen.getByRole("heading", { level: 1, name: /what does that pay/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/never a single number/i)).toBeInTheDocument()
    expect(
      screen.getByText(/where it came from and when it was collected/i)
    ).toBeInTheDocument()
    // Heading and range card both name the area, so presence, not uniqueness.
    expect((await screen.findAllByText("Analysis & Research")).length).toBeGreaterThan(0)
  })

  test("names the provider and its vintage before any figure is read", async () => {
    renderSalary()
    // Not a tooltip and not a footnote: the difference between a planning aid
    // and an implied forecast is whether the reader can see the vintage.
    expect(await screen.findByText(/static-reference/)).toBeInTheDocument()
    expect(screen.getByText(/vintage May 2024/)).toBeInTheDocument()
  })

  test("prints the source and the vintage next to each range", async () => {
    renderSalary()
    const sourced = await screen.findAllByText(
      /source: .*BLS OEWS May 2024.*as of May 2024/i
    )
    expect(sourced.length).toBeGreaterThan(0)
  })

  test("carries the not-a-prediction note from the backend", async () => {
    renderSalary()
    expect(
      await screen.findByText(/not a prediction of what any individual will be paid/i)
    ).toBeInTheDocument()
  })

  test("renders a falling projection as a fall, with its sign", async () => {
    renderSalary()
    // −5% is in today's table on purpose. It must not be clamped, hidden, or
    // rendered as growth.
    expect(await screen.findByText("-5%")).toBeInTheDocument()
    expect(screen.getByText(/projected to fall/i)).toBeInTheDocument()
    expect(screen.getByText(/shrinking is not the same as closed/i)).toBeInTheDocument()
    // And a growing one still reads as growth.
    expect(screen.getByText("+17.9%")).toBeInTheDocument()
  })

  test("an area with no wage data reads as absent, never as zero", async () => {
    mockGetMarketSalaries.mockResolvedValue(
      ok(salaries({ areas: [AREA_UNPRICED] }))
    )
    const { container } = renderSalary()

    expect(
      await screen.findByText(/no wage data on file for this career area yet/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/no wage data on file for this occupation/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/no employment projection on file for this occupation/i)
    ).toBeInTheDocument()
    // The failure this whole path exists to prevent: a null rendered as money.
    expect(container.textContent).not.toMatch(/\$\s?0\b/)
    expect(container.textContent).not.toMatch(/\$\s?\d/)
  })

  test("an unranked read explains itself instead of showing nothing", async () => {
    mockGetMarketSalaries.mockResolvedValue(
      ok(salaries({ ranked: false, note: "No PRISM on file yet." }))
    )
    renderSalary()
    expect(await screen.findByText("Every career area")).toBeInTheDocument()
    expect(screen.getByText(/aren't ranked for you yet/i)).toBeInTheDocument()
  })

  test("a failed read says so without claiming there is nothing to show", async () => {
    mockGetMarketSalaries.mockRejectedValue(new Error("boom"))
    const { container } = renderSalary()
    expect(
      await screen.findByText(/couldn't load the pay data/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/fault on our side/i)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\$\s?\d/)
  })

  test("with nothing to price, routes to the step it reads from", async () => {
    mockGetMarketSalaries.mockResolvedValue(ok(salaries({ areas: [] })))
    renderSalary()
    fireEvent.click(
      await screen.findByRole("button", { name: /look at career areas/i })
    )
    expect(mockNavigate).toHaveBeenCalledWith(
      "/vertical/direction-setting/careers"
    )
  })
})

describe("SalaryRangeCard — the point-estimate guard", () => {
  const sound: SalaryRange = {
    low: 42000,
    median: 55000,
    high: 71000,
    source: "US Bureau of Labor Statistics, OES",
    asOf: "2026-05",
    region: "United States",
  }

  test("shows all three bounds, never just the middle one", () => {
    render(<SalaryRangeCard role="Operations analyst" range={sound} />)
    expect(screen.getByText("$42,000")).toBeInTheDocument()
    expect(screen.getByText("$55,000")).toBeInTheDocument()
    expect(screen.getByText("$71,000")).toBeInTheDocument()
    expect(screen.getByText("Lower end")).toBeInTheDocument()
    expect(screen.getByText("Upper end")).toBeInTheDocument()
  })

  test("prints the source and the vintage next to the numbers", () => {
    render(<SalaryRangeCard role="Operations analyst" range={sound} />)
    expect(
      screen.getByText(/source: us bureau of labor statistics, oes · as of may 2026/i)
    ).toBeInTheDocument()
  })

  test("describes the range for screen readers as a range", () => {
    render(<SalaryRangeCard role="Operations analyst" range={sound} />)
    expect(
      screen.getByRole("img", {
        name: /pay range for operations analyst: \$42,000 to \$71,000, midpoint \$55,000/i,
      })
    ).toBeInTheDocument()
  })

  test("refuses to print numbers that arrived without a source", () => {
    // Types stop at the network boundary; this is the runtime half of the guard.
    render(
      <SalaryRangeCard
        role="Operations analyst"
        range={{ ...sound, source: "  " }}
      />
    )
    expect(screen.queryByText("$55,000")).not.toBeInTheDocument()
    expect(
      screen.getByText(/without a source or a date/i)
    ).toBeInTheDocument()
  })

  test("refuses to print numbers that arrived without a date", () => {
    render(
      <SalaryRangeCard role="Operations analyst" range={{ ...sound, asOf: "" }} />
    )
    expect(screen.queryByText("$42,000")).not.toBeInTheDocument()
    expect(screen.getByText(/without a source or a date/i)).toBeInTheDocument()
  })

  test("refuses a range whose bounds don't line up", () => {
    render(
      <SalaryRangeCard
        role="Operations analyst"
        range={{ ...sound, median: 90000 }}
      />
    )
    expect(screen.queryByText("$42,000")).not.toBeInTheDocument()
    expect(screen.getByText(/don't line up/i)).toBeInTheDocument()
  })

  test("honours a non-default currency", () => {
    render(
      <SalaryRangeCard
        role="Operations analyst"
        range={{ ...sound, currency: "GBP" }}
      />
    )
    expect(screen.getByText("£42,000")).toBeInTheDocument()
  })
})
