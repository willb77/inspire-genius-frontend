import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"

import type { FitDetail, FitMatch } from "@/types/job-fit"
import type { InterviewGuide } from "@/types/job-blueprint"
import type {
  RehearsalAnswerResult,
  RehearsalFeedback,
  RehearsalQuestion,
  RehearsalSession,
} from "@/types/direction-setting"

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "cand-1", email: "someone@example.com" } }),
}))

const mockUseFitMatches = jest.fn()
const mockUseFitDetail = jest.fn()
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  useFitMatches: () => mockUseFitMatches(),
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: (id?: string) => mockUseFitDetail(id),
}))

const mockGenerateMutate = jest.fn()
const mockUseInterviewGuide = jest.fn()
const mockGenerate = jest.fn()
jest.mock("@/hooks/job-blueprint/useScorecard", () => ({
  useInterviewGuide: (jobId: string) => mockUseInterviewGuide(jobId),
  useGenerateInterviewGuide: () => mockGenerate(),
}))

const mockAdvanceMutate = jest.fn()
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useAdvanceJourney: () => ({ mutate: mockAdvanceMutate, isPending: false }),
}))

/* ── Rehearsal service (RehearsePage only) ────────────────────────────────────
 * The *service* is stubbed, not the hook. Stage 12's whole shape lives in
 * `useRehearsal` — synchronous answers, a resumable session, a poll that is
 * allowed to never land — and a mocked hook would test the page against a
 * machine nobody runs. So these tests drive the real hook over a fake wire. */
jest.mock("@/services/direction-setting/rehearsal.service", () => ({
  getRehearsal: jest.fn(),
  startRehearsal: jest.fn(),
  answerRehearsalQuestion: jest.fn(),
  finishRehearsal: jest.fn(),
  setRehearsalSharing: jest.fn(),
  deleteRehearsal: jest.fn(),
  getRehearsalNarrationJob: jest.fn(),
}))

import {
  answerRehearsalQuestion,
  deleteRehearsal,
  finishRehearsal,
  getRehearsal,
  getRehearsalNarrationJob,
  setRehearsalSharing,
  startRehearsal,
} from "@/services/direction-setting/rehearsal.service"

import InterviewPage from "../InterviewPage"
import RehearsePage from "../RehearsePage"

const mockGetRehearsal = getRehearsal as jest.MockedFunction<typeof getRehearsal>
const mockStartRehearsal = startRehearsal as jest.MockedFunction<
  typeof startRehearsal
>
const mockAnswer = answerRehearsalQuestion as jest.MockedFunction<
  typeof answerRehearsalQuestion
>
const mockFinish = finishRehearsal as jest.MockedFunction<typeof finishRehearsal>
const mockSetSharing = setRehearsalSharing as jest.MockedFunction<
  typeof setRehearsalSharing
>
const mockDelete = deleteRehearsal as jest.MockedFunction<typeof deleteRehearsal>
const mockNarrationJob = getRehearsalNarrationJob as jest.MockedFunction<
  typeof getRehearsalNarrationJob
>


// ── fixtures ────────────────────────────────────────────────────────────────

const MATCH: FitMatch = {
  jobId: "job-1",
  roleTitle: "Operations Coordinator",
  department: null,
  tier: "professional",
  baseTier: "professional",
  fitBand: "strong",
  totalVariation: 22,
  behaviorVariation: 9,
  aptitudeVariation: 7,
  coreTraitVariation: 6,
  confidence: null,
}

const GUIDE: InterviewGuide = {
  jobId: "job-1",
  candidateId: "cand-1",
  roleTitle: "Operations Coordinator",
  focusDimensions: [
    {
      dimensionId: 4,
      dimensionName: "Coordinating",
      category: "behavior",
      benchmarkScore: 78,
      candidateScore: 61,
      gap: -17,
      questions: ["Walk me through how you keep several workstreams moving."],
    },
  ],
  counterProductiveQuestions: [
    {
      dimensionName: "Impatience",
      questions: ["When has moving fast cost you something?"],
    },
  ],
  generalQuestions: ["Why this role?"],
  generatedAt: "2026-07-30T00:00:00Z",
}

const DETAIL: FitDetail = {
  jobId: "job-1",
  roleTitle: "Operations Coordinator",
  tier: "professional",
  baseTier: "professional",
  totalVariation: 22,
  perDimension: [],
  criticalGaps: [],
  coachingGaps: [],
  overdoneFlags: [],
  interviewSelfAdvocacy: ["You hold detail well under load — say so with an example."],
  methodologyNote: "",
}

const withMatches = (list: FitMatch[]) =>
  mockUseFitMatches.mockReturnValue({
    data: list,
    isLoading: false,
    isError: false,
  })

function renderPage(el: React.ReactElement) {
  return render(<MemoryRouter>{el}</MemoryRouter>)
}

beforeEach(() => {
  jest.clearAllMocks()
  withMatches([MATCH])
  mockUseFitDetail.mockReturnValue({ data: DETAIL, isLoading: false, isError: false })
  mockUseInterviewGuide.mockReturnValue({ data: undefined, isLoading: false })
  mockGenerate.mockReturnValue({
    mutate: mockGenerateMutate,
    reset: jest.fn(),
    data: undefined,
    isPending: false,
    isError: false,
  })
})

// ── InterviewPage ───────────────────────────────────────────────────────────

describe("InterviewPage — no target role", () => {
  beforeEach(() => withMatches([]))

  it("explains honestly instead of fabricating a guide", () => {
    renderPage(<InterviewPage />)
    expect(screen.getByText(/no role to prepare for yet/i)).toBeInTheDocument()
    expect(screen.getByText(/comes from your job matches/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/What.re most likely to dig into/)
    ).not.toBeInTheDocument()
  })

  it("does not imply the user did something wrong", () => {
    renderPage(<InterviewPage />)
    expect(screen.getByText(/isn.t anything you did wrong/i)).toBeInTheDocument()
  })

  it("routes to the matches stage", () => {
    renderPage(<InterviewPage />)
    fireEvent.click(screen.getByRole("button", { name: /Go to job matches/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/direction-setting/matches")
  })
})

describe("InterviewPage — with a target role", () => {
  it("offers to build a prep sheet before one exists", () => {
    renderPage(<InterviewPage />)
    expect(screen.getByText("Operations Coordinator")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Build my prep sheet/ })
    ).toBeInTheDocument()
  })

  it("generates for this candidate and records the stage", () => {
    renderPage(<InterviewPage />)
    fireEvent.click(screen.getByRole("button", { name: /Build my prep sheet/ }))
    expect(mockGenerateMutate).toHaveBeenCalledWith(
      { jobId: "job-1", candidateId: "cand-1" },
      expect.anything()
    )
  })

  it("renders gap-derived questions and the self-advocacy lines together", () => {
    mockGenerate.mockReturnValue({
      mutate: mockGenerateMutate,
      reset: jest.fn(),
      data: GUIDE,
      isPending: false,
      isError: false,
    })
    renderPage(<InterviewPage />)
    expect(
      screen.getByText("Walk me through how you keep several workstreams moving.")
    ).toBeInTheDocument()
    expect(screen.getByText("When has moving fast cost you something?")).toBeInTheDocument()
    expect(screen.getByText("Why this role?")).toBeInTheDocument()
    expect(
      screen.getByText(/You hold detail well under load/)
    ).toBeInTheDocument()
  })

  it("ignores a fetched guide belonging to a different candidate", () => {
    mockUseInterviewGuide.mockReturnValue({
      data: { ...GUIDE, candidateId: "someone-else" },
      isLoading: false,
    })
    renderPage(<InterviewPage />)
    expect(
      screen.queryByText("Walk me through how you keep several workstreams moving.")
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Build my prep sheet/ })
    ).toBeInTheDocument()
  })

  it("uses a fetched guide when it is this candidate's", () => {
    mockUseInterviewGuide.mockReturnValue({ data: GUIDE, isLoading: false })
    renderPage(<InterviewPage />)
    expect(
      screen.getByText("Walk me through how you keep several workstreams moving.")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Rebuild/ })).toBeInTheDocument()
  })
})

// ── RehearsePage ────────────────────────────────────────────────────────────

const okData = <T,>(data: T) => ({ status: true, data })

const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      })
    }
  >
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
)

const renderRehearse = () =>
  render(
    <Providers>
      <RehearsePage />
    </Providers>
  )

/** A 404 from an action: the session is gone, or was never ours. Terminal either way. */
const notFound = () =>
  Object.assign(new Error("Request failed with status code 404"), {
    isAxiosError: true,
    response: { status: 404 },
  })

const ADVOCACY = "You hold detail well under load — say so with an example."

/** The real counter-productive framing note, verbatim from `rehearsal.py`. */
const COUNTER_NOTE =
  "This one asks about a habit that can get in the way. You are not being asked " +
  "to confess to anything — interviewers ask it to hear self-awareness, so the " +
  "answer they are listening for is how you notice it and what you do about it."

const SESSION_NOTE =
  "Practice, not assessment. Stop whenever you want — what you have answered is " +
  "kept and stage 12 counts as done either way. Nobody else sees this unless you " +
  "choose to share it."

const FEEDBACK_NOTE =
  "Practice, not assessment. Nothing here is scored, nothing is kept as a " +
  "judgement of you, and no one else sees it unless you share it."

const Q0: RehearsalQuestion = {
  index: 0,
  prompt: "Walk me through your most significant accomplishment.",
  source: "warmup",
}

const Q1: RehearsalQuestion = {
  index: 1,
  prompt: "When has moving fast cost you something?",
  source: "counter-productive",
  dimension: "Impatience",
  note: COUNTER_NOTE,
}

/** The `no-outcome` branch — a real situation, no ending. Note: no rating in it. */
const FEEDBACK_0: RehearsalFeedback = {
  questionIndex: 0,
  noticed: "There is a real situation here and you say what you did in it.",
  tryThis:
    "Finish it. Say how it turned out — even a partial or an awkward ending is " +
    "worth more than trailing off.",
  youAlreadyHave: ADVOCACY,
  statement: "There is a real situation here… Finish it… And worth remembering…",
  phrasing: "derived",
  branch: "no-outcome",
  note: FEEDBACK_NOTE,
}

/** The `empty` branch. A first-class answer, not a validation error. */
const FEEDBACK_EMPTY: RehearsalFeedback = {
  questionIndex: 0,
  noticed: "Nothing came out for this one.",
  tryThis:
    "That happens, and it happens most on the questions that matter. Try " +
    "answering a smaller version of it out loud first.",
  youAlreadyHave: ADVOCACY,
  statement: "Nothing came out for this one…",
  phrasing: "derived",
  branch: "empty",
  note: FEEDBACK_NOTE,
}

const makeSession = (over: Partial<RehearsalSession> = {}): RehearsalSession => ({
  rehearsalId: "reh-1",
  status: "not_started",
  questionIndex: 0,
  questionCount: 2,
  answered: 0,
  currentQuestion: Q0,
  questions: [Q0, Q1],
  turns: [],
  roleTitle: "Operations Coordinator",
  selfAdvocacy: [ADVOCACY],
  sharedWithCoach: false,
  expiresAt: "2026-10-28T00:00:00Z",
  retentionDays: 90,
  note: SESSION_NOTE,
  ...over,
})

const ANSWER_1 = "We shipped the migration last spring."

/**
 * The session after question 1 has been answered — cursor on question 2, one
 * turn on file. Also the resume fixture, since that is exactly what somebody who
 * walked away mid-rehearsal comes back to.
 */
const midSession = (
  feedback: RehearsalFeedback = FEEDBACK_0,
  answer: string = ANSWER_1,
  over: Partial<RehearsalSession> = {}
) =>
  makeSession({
    status: "in_progress",
    questionIndex: 1,
    answered: 1,
    currentQuestion: Q1,
    turns: [
      {
        index: 0,
        question: Q0,
        answer,
        feedback,
        answeredAt: "2026-07-30T10:00:00Z",
      },
    ],
    ...over,
  })

/** Both questions answered. The machine completes itself on the last one. */
const doneSession = (answer = "I shipped it a week early and it broke twice.") =>
  midSession(FEEDBACK_0, ANSWER_1, {
    status: "complete",
    questionIndex: 2,
    answered: 2,
    currentQuestion: null,
    turns: [
      {
        index: 0,
        question: Q0,
        answer: ANSWER_1,
        feedback: FEEDBACK_0,
        answeredAt: "2026-07-30T10:00:00Z",
      },
      {
        index: 1,
        question: Q1,
        answer,
        feedback: { ...FEEDBACK_0, questionIndex: 1 },
        answeredAt: "2026-07-30T10:05:00Z",
      },
    ],
  })

/** The answer route's reply: the turn it recorded, the session after it, a job id. */
const answerResult = (session: RehearsalSession): RehearsalAnswerResult => ({
  turn: session.turns[session.turns.length - 1],
  session,
  narrationJobId: "job-1",
})

/**
 * Render straight onto an existing session — the resume path, which is also the
 * cheapest way to reach any mid-rehearsal state. Waits on the privacy panel
 * because that is the one block present whether the session is running or done.
 */
const openSession = async (session: RehearsalSession) => {
  mockGetRehearsal.mockResolvedValue(okData({ session, result: null }))
  renderRehearse()
  await screen.findByText(/This transcript is yours/)
}

beforeEach(() => {
  mockGetRehearsal.mockReset()
  mockStartRehearsal.mockReset()
  mockAnswer.mockReset()
  mockFinish.mockReset()
  mockSetSharing.mockReset()
  mockDelete.mockReset()
  mockNarrationJob.mockReset()

  // Default: somebody who has never rehearsed.
  mockGetRehearsal.mockResolvedValue(okData({ session: null, result: null }))
  // Default: the optional rewrite completes without applying. A success, and a
  // no-op — the derived feedback the person already read stays exactly as it is.
  mockNarrationJob.mockResolvedValue(
    okData({
      jobId: "job-1",
      kind: "rehearsal",
      status: "complete" as const,
      result: { applied: false, reason: "rehearsal no longer exists" },
    })
  )
})

describe("RehearsePage — before there is a session", () => {
  it("tells the user the step is optional", async () => {
    renderRehearse()
    expect(await screen.findByText(/This step is optional\./)).toBeInTheDocument()
    expect(screen.getByText(/doesn.t leave a hole in anything/)).toBeInTheDocument()
  })

  it("marks the stage skipped — not complete — when the user passes on it", async () => {
    renderRehearse()
    fireEvent.click(await screen.findByRole("button", { name: /Skip this step/ }))
    expect(mockAdvanceMutate).toHaveBeenCalledWith(
      { stageId: "12", state: "skipped" },
      expect.anything()
    )
  })

  it("sends the user back to the prep sheet, which does have the questions", async () => {
    renderRehearse()
    fireEvent.click(
      await screen.findByRole("button", { name: /Back to interview prep/ })
    )
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/direction-setting/interview")
  })

  it("starts a rehearsal and puts the first question up", async () => {
    mockStartRehearsal.mockResolvedValue(
      okData({
        canRehearse: true,
        resumed: false,
        session: makeSession(),
        note: null,
      })
    )
    renderRehearse()
    fireEvent.click(await screen.findByRole("button", { name: /Start rehearsing/ }))

    expect(await screen.findByText(Q0.prompt)).toBeInTheDocument()
    // Resume is the default: `fresh` is false unless the person asks to go again.
    expect(mockStartRehearsal).toHaveBeenCalledWith(false)
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument()
  })

  it("explains a missing interview guide instead of erroring", async () => {
    const note =
      "There is no interview guide on file yet, so there is nothing to rehearse " +
      "against. Stage 11 builds one out of your own gaps against the role you are " +
      "targeting — work through that and the questions here will be yours rather " +
      "than generic. This stage is optional either way; skipping it costs you nothing."
    mockStartRehearsal.mockResolvedValue(
      okData({ canRehearse: false, resumed: false, session: null, note })
    )
    renderRehearse()
    fireEvent.click(await screen.findByRole("button", { name: /Start rehearsing/ }))

    expect(
      await screen.findByText(/Nothing to rehearse against yet\./)
    ).toBeInTheDocument()
    expect(screen.getByText(note)).toBeInTheDocument()
    // Not an error, and not something they did wrong.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Build my prep sheet/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/direction-setting/interview")
  })
})

describe("RehearsePage — answering", () => {
  it("takes an answer, shows the feedback, and moves to the next question", async () => {
    await openSession(makeSession())
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "We shipped the migration last spring." },
    })
    mockAnswer.mockResolvedValue(okData(answerResult(midSession())))
    fireEvent.click(screen.getByRole("button", { name: /Try this answer/ }))

    // The feedback is in the POST response — no job, no waiting on a model.
    expect(await screen.findByText(FEEDBACK_0.noticed)).toBeInTheDocument()
    expect(screen.getByText(FEEDBACK_0.tryThis)).toBeInTheDocument()
    expect(mockAnswer).toHaveBeenCalledWith(
      "reh-1",
      "We shipped the migration last spring."
    )

    // …and the cursor has moved on, with the box cleared for the next one.
    expect(screen.getByText(Q1.prompt)).toBeInTheDocument()
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument()
    expect(screen.getByLabelText("Your answer")).toHaveValue("")
  })

  it("renders the counter-productive framing note so it doesn't read as an accusation", async () => {
    await openSession(midSession())
    expect(screen.getByText(Q1.prompt)).toBeInTheDocument()
    expect(screen.getByText(COUNTER_NOTE)).toBeInTheDocument()
  })

  it("submits an empty answer and gets a reply, not a validation error", async () => {
    await openSession(makeSession())

    // Nothing typed, and the button says so rather than going dead.
    const submit = screen.getByRole("button", { name: /Nothing came to mind/ })
    expect(submit).toBeEnabled()

    mockAnswer.mockResolvedValue(
      okData(answerResult(midSession(FEEDBACK_EMPTY, "")))
    )
    fireEvent.click(submit)

    expect(await screen.findByText(FEEDBACK_EMPTY.noticed)).toBeInTheDocument()
    expect(screen.getByText(FEEDBACK_EMPTY.tryThis)).toBeInTheDocument()
    expect(mockAnswer).toHaveBeenCalledWith("reh-1", "")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("closes the feedback with the user's own line, verbatim and unlabelled", async () => {
    await openSession(midSession())
    const line = screen.getAllByText(ADVOCACY)[0]
    // Verbatim: the whole element is the sentence, with nothing prefixed onto it.
    expect(line.textContent).toBe(ADVOCACY)
  })

  it("resumes an unfinished session instead of starting a second one", async () => {
    await openSession(midSession())
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument()
    expect(screen.getByText(Q1.prompt)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Start rehearsing/ })
    ).not.toBeInTheDocument()
    expect(mockStartRehearsal).not.toHaveBeenCalled()
  })

  it("completes on the last answer without calling it a pass", async () => {
    await openSession(midSession())
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "I shipped it a week early and it broke twice." },
    })
    // The completion re-read: the server's own view of a finished rehearsal.
    mockGetRehearsal.mockResolvedValue(okData({ session: doneSession(), result: null }))
    mockAnswer.mockResolvedValue(okData(answerResult(doneSession())))
    fireEvent.click(screen.getByRole("button", { name: /Try this answer/ }))

    expect(await screen.findByText(/That.s the practice done\./)).toBeInTheDocument()
    expect(screen.getByText(/You answered 2 of the 2/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Go again/ })).toBeInTheDocument()
  })

  it("stops early on request, and stopping is not failing", async () => {
    await openSession(midSession())
    const stopped = midSession(FEEDBACK_0, ANSWER_1, { status: "complete" })
    mockGetRehearsal.mockResolvedValue(okData({ session: stopped, result: null }))
    mockFinish.mockResolvedValue(okData(stopped))
    fireEvent.click(screen.getByRole("button", { name: /Stop here/ }))

    expect(await screen.findByText(/That.s the practice done\./)).toBeInTheDocument()
    expect(mockFinish).toHaveBeenCalledWith("reh-1")
  })

  it("treats a 404 as terminal rather than retrying at someone's transcript", async () => {
    await openSession(makeSession())
    mockAnswer.mockRejectedValue(notFound())
    fireEvent.click(screen.getByRole("button", { name: /Nothing came to mind/ }))

    expect(
      await screen.findByText(/That rehearsal isn.t there any more\./)
    ).toBeInTheDocument()
    await waitFor(() => expect(mockAnswer).toHaveBeenCalledTimes(1))
    expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument()
  })
})

describe("RehearsePage — the optional prose rewrite", () => {
  it("shows the derived feedback without waiting on the rewrite", async () => {
    // A job that never resolves. Nothing on the page may depend on it.
    mockNarrationJob.mockReturnValue(new Promise<never>(() => {}))
    await openSession(makeSession())
    mockAnswer.mockResolvedValue(okData(answerResult(midSession())))
    fireEvent.click(screen.getByRole("button", { name: /Nothing came to mind/ }))

    expect(await screen.findByText(FEEDBACK_0.noticed)).toBeInTheDocument()
    expect(screen.getByText(FEEDBACK_0.tryThis)).toBeInTheDocument()
  })

  it("quietly swaps in the warmer wording when it lands", async () => {
    const warm =
      "You had a real situation there and you said what you did in it — the only " +
      "thing missing is how it ended, so try landing on that next time."
    mockNarrationJob.mockResolvedValue(
      okData({
        jobId: "job-1",
        kind: "rehearsal",
        status: "complete" as const,
        result: {
          applied: true,
          turnIndex: 0,
          feedback: { ...FEEDBACK_0, statement: warm, phrasing: "specialist" },
        },
      })
    )
    await openSession(makeSession())
    mockAnswer.mockResolvedValue(okData(answerResult(midSession())))
    fireEvent.click(screen.getByRole("button", { name: /Nothing came to mind/ }))

    expect(await screen.findByText(warm)).toBeInTheDocument()
    // The person's own line survives the swap, still verbatim.
    expect(screen.getAllByText(ADVOCACY)[0].textContent).toBe(ADVOCACY)
  })
})

describe("RehearsePage — privacy", () => {
  it("renders sharing as off, and never as something to opt out of", async () => {
    await openSession(midSession())
    const toggle = screen.getByRole("switch", { name: /Share this with a coach/ })
    expect(toggle).toHaveAttribute("aria-checked", "false")
    expect(
      screen.getByText(/Off\. Nobody else can see these answers/)
    ).toBeInTheDocument()
  })

  it("opts in only on an explicit act of the owner", async () => {
    await openSession(midSession())
    mockSetSharing.mockResolvedValue(
      okData(midSession(FEEDBACK_0, ANSWER_1, { sharedWithCoach: true }))
    )
    fireEvent.click(screen.getByRole("switch", { name: /Share this with a coach/ }))

    await waitFor(() => expect(mockSetSharing).toHaveBeenCalledWith("reh-1", true))
    expect(await screen.findByText(/^On\. A coach you work with/)).toBeInTheDocument()
  })

  it("states the retention window in plain words", async () => {
    await openSession(midSession())
    expect(
      screen.getByText(/Kept for 90 days after you last use it/)
    ).toBeInTheDocument()
  })

  it("confirms before deleting, and then actually deletes", async () => {
    await openSession(midSession())
    fireEvent.click(screen.getByRole("button", { name: /Delete this rehearsal/ }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/not hidden, not archived/)).toBeInTheDocument()
    // Nothing has happened yet — the confirmation is real, not decorative.
    expect(mockDelete).not.toHaveBeenCalled()

    mockDelete.mockResolvedValue(okData({ deleted: true, rehearsalId: "reh-1" }))
    mockGetRehearsal.mockResolvedValue(okData({ session: null, result: null }))
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete it/ }))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("reh-1"))
    expect(
      await screen.findByText(/Deleted\. Your answers and the feedback on them are gone\./)
    ).toBeInTheDocument()
  })

  it("keeps the transcript when the user backs out of the confirmation", async () => {
    await openSession(midSession())
    fireEvent.click(screen.getByRole("button", { name: /Delete this rehearsal/ }))
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /Keep it/ }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(mockDelete).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Your answer")).toBeInTheDocument()
  })
})

describe("RehearsePage — nothing on this page is a measurement", () => {
  /* The property stage 12 was built around: feedback carries no score, no grade,
     no band and no pass/fail, and the surface must not derive one. A question
     counter is expected — a quality number is the thing that would turn practice
     back into the evaluation tool this stage exists not to be. */
  const RATING_VOCABULARY =
    /\b(scor(e|ed|es|ing)|grade[sd]?|grading|rat(ed|ing)|ranked?|ranking|marks?\b|pass(ed|es)?\b|fail(ed|s|ure)?\b|out of (five|ten|a hundred)|percentile|strong answer|weak answer|good answer|poor answer)\b/i
  const FRACTION = /\d+\s*(\/|out of)\s*\d+/

  /** Sentences that use the vocabulary to rule the thing out. Denials, not marks. */
  const DENIALS = [
    "with nobody keeping score",
    "Nothing here is scored",
    "Nothing is scored",
  ]

  it("shows no rating anywhere on a completed rehearsal", async () => {
    await openSession(doneSession())
    const text = document.body.textContent ?? ""

    expect(text).not.toMatch(FRACTION)
    // The only places the vocabulary is allowed to appear are the sentences that
    // *deny* it. Strip those, and nothing rating-shaped may be left.
    const claims = DENIALS.reduce(
      (acc, denial) => acc.split(denial).join(""),
      text
    )
    expect(claims).not.toMatch(RATING_VOCABULARY)
  })

  it("still counts the questions, which is not the same thing", async () => {
    await openSession(midSession())
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument()
    expect(document.body.textContent ?? "").not.toMatch(FRACTION)
  })
})
